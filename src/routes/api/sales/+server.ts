import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface SaleItemRequest {
	productId: string;
	productSaleFormatId: string;
	quantity: number;
	formatQuantity?: number;
}

interface SaleRequest {
	items: SaleItemRequest[];
	discount?: number;
	paymentMethod: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
	cashReceived?: number;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// 🔐 Obtener usuario autenticado
		const userId = locals.user?.id;

		if (!userId) {
			return json({ success: false, message: 'Usuario no autenticado' }, { status: 401 });
		}

		const body = (await request.json()) as SaleRequest;

		if (!body.items || body.items.length === 0) {
			return json(
				{ success: false, message: 'La venta debe tener al menos un producto' },
				{ status: 400 }
			);
		}

		if (!body.paymentMethod) {
			return json({ success: false, message: 'El método de pago es requerido' }, { status: 400 });
		}

		const productIds: string[] = [
			...new Set(body.items.map((item: SaleItemRequest) => item.productId))
		];

		const products = await db.product.findMany({
			where: {
				id: { in: productIds },
				status: 'ACTIVO'
			},
			include: {
				saleFormats: true
			}
		});

		// 🔥 Obtener último costo
		const purchaseItems = await db.purchaseItem.findMany({
			where: {
				productId: { in: productIds }
			},
			include: {
				purchase: {
					select: { createdAt: true }
				}
			},
			orderBy: {
				purchase: { createdAt: 'desc' }
			}
		});

		const productCosts = new Map<string, number>();
		for (const p of purchaseItems) {
			if (!productCosts.has(p.productId)) {
				productCosts.set(p.productId, Number(p.unitCost));
			}
		}

		let subtotal = 0;
		type UnitMeasure = 'UNIDAD' | 'DOCENA' | 'MEDIA_DOCENA' | 'KILOGRAMO' | 'PORCION';
		const saleItems: Array<{
			productId: string;
			productSaleFormatId: string;
			productNameSnapshot: string;
			formatLabelSnapshot: string;
			unitMeasure: UnitMeasure;
			quantity: number;
			unitPrice: number;
			unitCost: number;
			subtotal: number;
		}> = [];

		for (const item of body.items as SaleItemRequest[]) {
			const product = products.find((p) => p.id === item.productId);
			const saleFormat = product?.saleFormats.find(
				(f: { id: string }) => f.id === item.productSaleFormatId
			);

			if (!product || !saleFormat) {
				return json({ success: false, message: 'Formato inválido' }, { status: 400 });
			}

			const formatQuantity = item.formatQuantity || saleFormat.quantity || 1;
			const stockToDeduct = item.quantity * formatQuantity;

			if (Number(product.stock) < stockToDeduct) {
				return json(
					{
						success: false,
						message: `Stock insuficiente para ${product.name}`
					},
					{ status: 400 }
				);
			}

			const itemSubtotal = Number(saleFormat.price) * item.quantity;
			subtotal += itemSubtotal;

			saleItems.push({
				productId: product.id,
				productSaleFormatId: saleFormat.id,
				productNameSnapshot: product.name,
				formatLabelSnapshot: saleFormat.label || '',
				unitMeasure: saleFormat.unitMeasure,
				quantity: item.quantity,
				unitPrice: Number(saleFormat.price),
				unitCost: productCosts.get(product.id) || 0,
				subtotal: itemSubtotal
			});
		}

		const discount = body.discount || 0;
		const total = Math.max(0, subtotal - discount);

		let cashReceived = null;
		let changeGiven = null;

		if (body.paymentMethod === 'EFECTIVO' && body.cashReceived) {
			cashReceived = body.cashReceived;
			changeGiven = Math.max(0, cashReceived - total);
		}

		// 🔥 TRANSACCIÓN
		const result = await db.$transaction(async (tx) => {
			const lastSale = await tx.sale.findFirst({
				orderBy: { saleNumber: 'desc' }
			});

			const saleNumber = (lastSale?.saleNumber || 0) + 1;

			const sale = await tx.sale.create({
				data: {
					saleNumber,
					status: 'COMPLETADA',
					userId, // ✅ dinámico
					subtotal,
					discount,
					total,
					paymentMethod: body.paymentMethod,
					cashReceived,
					changeGiven
				}
			});

			await tx.saleItem.createMany({
				data: saleItems.map((item) => ({
					...item,
					saleId: sale.id
				}))
			});

			for (const item of body.items as SaleItemRequest[]) {
				const product = products.find((p) => p.id === item.productId);
				const saleFormat = product?.saleFormats.find(
					(f: { id: string }) => f.id === item.productSaleFormatId
				);

				const formatQuantity = item.formatQuantity || saleFormat?.quantity || 1;
				const stockToDeduct = item.quantity * formatQuantity;

				const previousStock = Number(product!.stock);
				const newStock = previousStock - stockToDeduct;

				await tx.product.update({
					where: { id: item.productId },
					data: { stock: newStock }
				});

				await tx.stockMovement.create({
					data: {
						productId: item.productId,
						type: 'SALIDA_VENTA',
						quantity: -stockToDeduct,
						previousStock,
						newStock,
						saleId: sale.id,
						userId // ✅ dinámico también
					}
				});
			}

			return tx.sale.findUnique({
				where: { id: sale.id },
				include: { items: true }
			});
		});

		return json({
			success: true,
			message: 'Venta registrada exitosamente',
			data: result
		});
	} catch (error) {
		console.error('Error creating sale:', error);
		return json(
			{
				success: false,
				message: 'Error al registrar la venta'
			},
			{ status: 500 }
		);
	}
};

// Endpoint GET para listar ventas con filtros
export const GET: RequestHandler = async ({ url }) => {
	try {
		const dateFrom = url.searchParams.get('dateFrom');
		const dateTo = url.searchParams.get('dateTo');
		const status = url.searchParams.get('status');
		const paymentMethod = url.searchParams.get('paymentMethod');
		const saleNumber = url.searchParams.get('saleNumber');

		const whereClause: any = {};

		if (dateFrom) {
			whereClause.createdAt = { ...whereClause.createdAt, gte: new Date(dateFrom) };
		}

		if (dateTo) {
			whereClause.createdAt = { ...whereClause.createdAt, lte: new Date(dateTo + 'T23:59:59') };
		}

		if (status) {
			whereClause.status = status;
		}

		if (paymentMethod) {
			whereClause.paymentMethod = paymentMethod;
		}

		if (saleNumber) {
			whereClause.saleNumber = Number(saleNumber);
		}

		const sales = await db.sale.findMany({
			where: whereClause,
			orderBy: {
				createdAt: 'desc'
			},
			include: {
				items: {
					select: {
						id: true,
						productNameSnapshot: true,
						quantity: true,
						unitPrice: true,
						unitCost: true,
						subtotal: true
					}
				}
			}
		});

		return json({
			success: true,
			data: sales
		});
	} catch (error) {
		console.error('Error fetching sales:', error);
		return json(
			{
				success: false,
				message: 'Error al obtener ventas',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
