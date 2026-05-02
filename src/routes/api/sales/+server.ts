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
		const productIds = [...new Set(body.items.map((item) => item.productId))]; // Remove duplicates

		const products = await db.product.findMany({
			where: {
				id: { in: productIds },
				status: 'ACTIVO'
			},
			include: {
				saleFormats: true
			}
		});

		// Obtener último costo de cada producto desde compras
		const purchaseItems = await db.purchaseItem.findMany({
			where: {
				productId: { in: productIds }
			},
			include: {
				purchase: {
					select: {
						createdAt: true
					}
				}
			},
			orderBy: {
				purchase: {
					createdAt: 'desc'
				}
			}
		});

		// Crear mapa de último costo por producto
		const productCosts = new Map<string, number>();
		for (const purchaseItem of purchaseItems) {
			if (!productCosts.has(purchaseItem.productId)) {
				productCosts.set(purchaseItem.productId, Number(purchaseItem.unitCost));
			}
		}

		if (products.length !== productIds.length) {
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

			// Calcular el stock real a descontar (cantidad vendida × cantidad del formato)
			// Usar formatQuantity enviado desde el frontend, o el de la base de datos como fallback
			const formatQuantity = item.formatQuantity || saleFormat.quantity || 1;
			const stockToDeduct = item.quantity * formatQuantity;

			// Validar stock disponible
			if (Number(product.stock) < stockToDeduct) {
				return json(
					{
						success: false,
						message: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Solicitado: ${stockToDeduct} (${item.quantity} × ${formatQuantity})`
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
		const result = await db.$transaction(async (tx) => {
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
					changeGiven: changeGiven ? changeGiven : null
				}
			});

			// Crear items de venta
			await tx.saleItem.createMany({
				data: saleItems.map((item) => ({
					...item,
					saleId: sale.id
				}))
			});

			// Actualizar stock y crear movimientos
			for (const item of body.items) {
				const product = products.find((p: (typeof products)[0]) => p.id === item.productId);
				const saleFormat = product?.saleFormats.find(
					(f: (typeof product.saleFormats)[0]) => f.id === item.productSaleFormatId
				);
				const formatQuantity = item.formatQuantity || saleFormat?.quantity || 1;
				const stockToDeduct = item.quantity * formatQuantity;

				const previousStock = Number(product!.stock);
				const newStock = previousStock - stockToDeduct;

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
						quantity: -stockToDeduct,
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

// Endpoint para recalcular costos de ventas existentes
export const PATCH: RequestHandler = async ({ request }) => {
	try {
		const { saleIds } = await request.json();

		// Obtener ventas con sus items
		const whereClause = saleIds?.length > 0 ? { id: { in: saleIds } } : {};

		const sales = await db.sale.findMany({
			where: whereClause,
			include: {
				items: true
			}
		});

		let updatedCount = 0;

		for (const sale of sales) {
			for (const item of sale.items) {
				// Buscar el costo de la compra más reciente de este producto
				const purchaseItem = await db.purchaseItem.findFirst({
					where: {
						productId: item.productId
					},
					include: {
						purchase: {
							select: {
								createdAt: true
							}
						}
					},
					orderBy: {
						purchase: {
							createdAt: 'desc'
						}
					}
				});

				if (purchaseItem) {
					// Actualizar el costo del item de venta
					await db.saleItem.update({
						where: { id: item.id },
						data: {
							unitCost: purchaseItem.unitCost
						}
					});
					updatedCount++;
				}
			}
		}

		return json({
			success: true,
			message: `Actualizados ${updatedCount} items de ${sales.length} ventas`,
			updatedCount,
			salesProcessed: sales.length
		});
	} catch (error) {
		console.error('Error recalculando costos:', error);
		return json(
			{
				success: false,
				message: 'Error al recalcular costos',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
