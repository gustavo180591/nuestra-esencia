import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const includeInactive = url.searchParams.get('includeInactive') === 'true';
		const supplierId = url.searchParams.get('supplierId');
		const status = url.searchParams.get('status');

		const whereClause: any = {};
		if (!includeInactive) {
			whereClause.status = 'REGISTRADA';
		}
		if (supplierId) {
			whereClause.supplierId = supplierId;
		}
		if (status) {
			whereClause.status = status;
		}

		const purchases = await db.purchase.findMany({
			where: whereClause,
			include: {
				supplier: {
					select: {
						id: true,
						name: true
					}
				},
				_count: {
					select: {
						items: true
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			}
		});

		return json({
			success: true,
			data: purchases,
			count: purchases.length
		});
	} catch (error) {
		console.error('Error fetching purchases:', error);
		return json(
			{
				success: false,
				message: 'Error al obtener compras',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		const { supplierId, items, notes, updatePrices, profitMargin, roundPrices } = data;

		// Validaciones básicas
		if (!supplierId) {
			return json(
				{
					success: false,
					message: 'El proveedor es requerido'
				},
				{ status: 400 }
			);
		}

		if (!items || items.length === 0) {
			return json(
				{
					success: false,
					message: 'La compra debe tener al menos un item'
				},
				{ status: 400 }
			);
		}

		// Verificar que el proveedor existe y está activo
		const supplier = await db.supplier.findFirst({
			where: {
				id: supplierId,
				active: true
			}
		});

		if (!supplier) {
			return json(
				{
					success: false,
					message: 'Proveedor no encontrado o inactivo'
				},
				{ status: 400 }
			);
		}

		// Validar items
		for (const item of items) {
			if (!item.productId || !item.quantity || !item.unitPrice) {
				return json(
					{
						success: false,
						message: 'Todos los items deben tener producto, cantidad y precio unitario'
					},
					{ status: 400 }
				);
			}

			if (Number(item.quantity) <= 0 || Number(item.unitPrice) <= 0) {
				return json(
					{
						success: false,
						message: 'La cantidad y el precio unitario deben ser positivos'
					},
					{ status: 400 }
				);
			}
		}

		// Calcular total
		let total = 0;
		for (const item of items) {
			total += Number(item.quantity) * Number(item.unitPrice);
		}

		// Realizar la transacción
		const result = await db.$transaction(async (tx) => {
			// Crear compra
			const purchase = await tx.purchase.create({
				data: {
					supplier: {
						connect: {
							id: supplierId
						}
					},
					subtotal: total.toString(),
					total: total.toString(),
					status: 'REGISTRADA',
					notes: notes || null
				},
				include: {
					supplier: {
						select: {
							id: true,
							name: true
						}
					}
				}
			});

			// Crear items de la compra
			const purchaseItems = await Promise.all(
				items.map((item: any) => {
					// Obtener nombre del producto para snapshot
					return tx.product
						.findUnique({
							where: { id: item.productId }
						})
						.then((product) => {
							if (!product) {
								throw new Error(`Producto ${item.productId} no encontrado`);
							}

							return tx.purchaseItem.create({
								data: {
									purchaseId: purchase.id,
									productId: item.productId,
									productNameSnapshot: product.name,
									unitMeasure: item.unitMeasure || 'UNIDAD',
									quantity: item.quantity,
									unitCost: item.unitPrice,
									subtotal: (Number(item.quantity) * Number(item.unitPrice)).toString()
								}
							});
						});
				})
			);

			// Actualizar stock y precios de los productos
			for (const item of items) {
				const product = await tx.product.findUnique({
					where: { id: item.productId },
					include: { saleFormats: true }
				});

				if (product) {
					const currentStock = Number(product.stock);
					const newStock = currentStock + Number(item.quantity);

					// Actualizar stock
					await tx.product.update({
						where: { id: item.productId },
						data: { stock: newStock.toString() }
					});

					// Actualizar precios de venta si se solicita
					if (updatePrices && profitMargin && product.saleFormats.length > 0) {
						const costPrice = Number(item.unitPrice);
						const marginMultiplier = 1 + Number(profitMargin) / 100;
						let newPrice = costPrice * marginMultiplier;

						// Redondear a centenas si se solicita
						if (roundPrices) {
							newPrice = Math.round(newPrice / 100) * 100;
						} else {
							newPrice = Number(newPrice.toFixed(2));
						}

						// Actualizar todos los formatos de venta del producto
						for (const saleFormat of product.saleFormats) {
							await tx.productSaleFormat.update({
								where: { id: saleFormat.id },
								data: { price: newPrice.toString() }
							});
						}
					}

					// Registrar movimiento de stock
					await tx.stockMovement.create({
						data: {
							productId: item.productId,
							type: 'ENTRADA_COMPRA',
							quantity: item.quantity,
							previousStock: product.stock,
							newStock: newStock.toString(),
							reason: `Compra #${purchase.purchaseNumber}`,
							purchaseId: purchase.id
						}
					});
				}
			}

			return { purchase, purchaseItems };
		});

		return json({
			success: true,
			message: 'Compra registrada exitosamente',
			data: result.purchase
		});
	} catch (error) {
		console.error('Error creating purchase:', error);
		return json(
			{
				success: false,
				message: 'Error al registrar compra',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
