import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface SaleItemRequest {
	productId: string;
	productSaleFormatId: string;
	quantity: number;
}

interface SaleRequest {
	items: SaleItemRequest[];
	discount?: number;
	paymentMethod: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
	cashReceived?: number;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body: SaleRequest = await request.json();

		// Validaciones básicas
		if (!body.items || body.items.length === 0) {
			return json(
				{
					success: false,
					message: 'La venta debe tener al menos un producto'
				},
				{ status: 400 }
			);
		}

		if (!body.paymentMethod) {
			return json(
				{
					success: false,
					message: 'El método de pago es requerido'
				},
				{ status: 400 }
			);
		}

		// Obtener información de productos y validar stock
		const productIds = body.items.map((item) => item.productId);
		const products = await db.product.findMany({
			where: {
				id: { in: productIds },
				status: 'ACTIVO'
			},
			include: {
				saleFormats: true
			}
		});

		if (products.length !== body.items.length) {
			return json(
				{
					success: false,
					message: 'Algunos productos no existen o no están activos'
				},
				{ status: 400 }
			);
		}

		// Calcular totales y validar stock
		let subtotal = 0;
		const saleItems: Array<{
			productId: string;
			productSaleFormatId: string;
			productNameSnapshot: string;
			formatLabelSnapshot: string;
			unitMeasure: string;
			quantity: number;
			unitPrice: number;
			subtotal: number;
		}> = [];

		for (const item of body.items) {
			const product = products.find((p: (typeof products)[0]) => p.id === item.productId);
			const saleFormat = product?.saleFormats.find(
				(f: (typeof product.saleFormats)[0]) => f.id === item.productSaleFormatId
			);

			if (!product || !saleFormat) {
				return json(
					{
						success: false,
						message: 'Formato de venta no válido para el producto'
					},
					{ status: 400 }
				);
			}

			// Validar stock disponible
			if (Number(product.stock) < item.quantity) {
				return json(
					{
						success: false,
						message: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Solicitado: ${item.quantity}`
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
				formatLabelSnapshot: saleFormat.label,
				unitMeasure: saleFormat.unitMeasure,
				quantity: item.quantity,
				unitPrice: Number(saleFormat.price),
				subtotal: itemSubtotal
			});
		}

		// Calcular total con descuento
		const discount = body.discount || 0;
		const total = Math.max(0, subtotal - discount);

		// Calcular cambio para efectivo
		let cashReceived = null;
		let changeGiven = null;
		if (body.paymentMethod === 'EFECTIVO' && body.cashReceived) {
			cashReceived = body.cashReceived;
			changeGiven = Math.max(0, cashReceived - total);
		}

		// Crear la venta y actualizar stock en una transacción
		const result = await db.$transaction(async (tx: typeof db) => {
			// Generar número de venta
			const lastSale = await tx.sale.findFirst({
				orderBy: { saleNumber: 'desc' }
			});
			const saleNumber = (lastSale?.saleNumber || 0) + 1;

			// Crear venta
			const sale = await tx.sale.create({
				data: {
					saleNumber,
					status: 'COMPLETADA',
					userId: 'cmnmlamaf0000vikcqdxl4iz9', // Usuario admin Gustavo Faccendini
					subtotal,
					discount,
					total,
					paymentMethod: body.paymentMethod,
					cashReceived: cashReceived ? cashReceived : null,
					changeGiven: changeGiven ? changeGiven : null,
					items: {
						create: saleItems
					}
				}
			});

			// Actualizar stock y crear movimientos
			for (const item of body.items) {
				const product = products.find((p: (typeof products)[0]) => p.id === item.productId);
				const previousStock = Number(product!.stock);
				const newStock = previousStock - item.quantity;

				// Actualizar stock del producto
				await tx.product.update({
					where: { id: item.productId },
					data: { stock: newStock }
				});

				// Crear movimiento de stock
				await tx.stockMovement.create({
					data: {
						productId: item.productId,
						type: 'SALIDA_VENTA',
						quantity: -item.quantity,
						previousStock,
						newStock,
						saleId: sale.id,
						userId: 'cmnmlamaf0000vikcqdxl4iz9' // Usuario admin Gustavo Faccendini
					}
				});
			}

			// Obtener venta completa con items
			const completeSale = await tx.sale.findUnique({
				where: { id: sale.id },
				include: {
					items: true
				}
			});

			return completeSale;
		});

		return json({
			success: true,
			message: 'Venta registrada exitosamente',
			data: {
				saleNumber: result!.saleNumber,
				total: Number(result!.total),
				paymentMethod: result!.paymentMethod,
				cashReceived: result!.cashReceived ? Number(result!.cashReceived) : null,
				changeGiven: result!.changeGiven ? Number(result!.changeGiven) : null,
				itemsCount: result!.items.length,
				createdAt: result!.createdAt
			}
		});
	} catch (error) {
		console.error('Error creating sale:', error);
		return json(
			{
				success: false,
				message: 'Error al registrar la venta',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
