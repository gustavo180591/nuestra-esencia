import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const product = await db.product.findUnique({
			where: {
				id: params.id
			},
			include: {
				category: {
					select: {
						id: true,
						name: true
					}
				},
				saleFormats: {
					select: {
						id: true,
						unitMeasure: true,
						label: true,
						price: true,
						quantity: true,
						active: true
					},
					orderBy: {
						price: 'asc'
					}
				}
			}
		});

		if (!product) {
			return json(
				{
					success: false,
					message: 'Producto no encontrado'
				},
				{ status: 404 }
			);
		}

		return json({
			success: true,
			data: product
		});
	} catch (error) {
		console.error('Error fetching product:', error);
		return json(
			{
				success: false,
				message: 'Error al obtener producto',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const data = await request.json();

		console.log('PUT request data:', JSON.stringify(data, null, 2));

		const { name, description, categoryId, status, stock, stockMin, isPerishable, saleFormats } =
			data;

		// Validaciones básicas
		if (!name || name.trim() === '') {
			return json(
				{
					success: false,
					message: 'El nombre del producto es requerido'
				},
				{ status: 400 }
			);
		}

		// Verificar que el producto existe
		const existingProduct = await db.product.findUnique({
			where: { id: params.id }
		});

		if (!existingProduct) {
			return json(
				{
					success: false,
					message: 'Producto no encontrado'
				},
				{ status: 404 }
			);
		}

		// Actualizar producto
		const product = await db.product.update({
			where: {
				id: params.id
			},
			data: {
				name: name.trim(),
				description: description?.trim() || null,
				categoryId: categoryId || null,
				status: status || 'ACTIVO',
				stock: stock || 0,
				stockMin: stockMin || 0,
				isPerishable: isPerishable || false
			},
			include: {
				category: {
					select: {
						id: true,
						name: true
					}
				},
				saleFormats: {
					select: {
						id: true,
						unitMeasure: true,
						label: true,
						price: true,
						active: true
					}
				}
			}
		});

		// Si se proporcionan formatos de venta, actualizarlos
		if (saleFormats && saleFormats.length > 0) {
			// Desactivar todos los formatos existentes
			await db.productSaleFormat.updateMany({
				where: {
					productId: params.id
				},
				data: {
					active: false
				}
			});

			// Crear o actualizar los formatos proporcionados
			for (const format of saleFormats) {
				// Primero buscar si existe un formato con esta combinación productId + unitMeasure
				const existingFormat = await db.productSaleFormat.findFirst({
					where: {
						productId: params.id,
						unitMeasure: format.unitMeasure
					}
				});

				if (existingFormat) {
					// Actualizar el formato existente
					await db.productSaleFormat.update({
						where: { id: existingFormat.id },
						data: {
							label: format.label,
							price: format.price,
							quantity: format.quantity || 1,
							active: true
						}
					});
				} else {
					// Crear nuevo formato
					await db.productSaleFormat.create({
						data: {
							productId: params.id,
							unitMeasure: format.unitMeasure,
							label: format.label,
							price: format.price,
							quantity: format.quantity || 1,
							active: true
						}
					});
				}
			}

			// Recargar el producto con los formatos actualizados
			const updatedProduct = await db.product.findUnique({
				where: { id: params.id },
				include: {
					category: {
						select: {
							id: true,
							name: true
						}
					},
					saleFormats: {
						select: {
							id: true,
							unitMeasure: true,
							label: true,
							price: true,
							quantity: true,
							active: true
						},
						where: {
							active: true
						},
						orderBy: {
							price: 'asc'
						}
					}
				}
			});

			return json({
				success: true,
				message: 'Producto actualizado exitosamente',
				data: updatedProduct
			});
		}

		return json({
			success: true,
			message: 'Producto actualizado exitosamente',
			data: product
		});
	} catch (error) {
		console.error('Error updating product:', error);
		return json(
			{
				success: false,
				message: 'Error al actualizar producto',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		// Verificar que el producto existe
		const existingProduct = await db.product.findUnique({
			where: { id: params.id },
			include: {
				_count: {
					select: {
						purchaseItems: true,
						stockMoves: true
					}
				},
				saleItems: {
					where: {
						sale: {
							status: 'COMPLETADA'
						}
					},
					select: {
						id: true
					},
					take: 1
				}
			}
		});

		if (!existingProduct) {
			return json(
				{
					success: false,
					message: 'Producto no encontrado'
				},
				{ status: 404 }
			);
		}

		// Verificar si tiene ventas completadas, compras o movimientos de stock asociados
		const hasActiveRelations =
			existingProduct.saleItems.length > 0 ||
			existingProduct._count.purchaseItems > 0 ||
			existingProduct._count.stockMoves > 0;

		if (hasActiveRelations) {
			// Soft delete - cambiar status a INACTIVO si tiene relaciones activas
			await db.product.update({
				where: {
					id: params.id
				},
				data: {
					status: 'INACTIVO'
				}
			});

			return json({
				success: true,
				message: 'Producto desactivado (tiene ventas/compras asociadas)'
			});
		}

		// Hard delete - eliminar completamente si no tiene relaciones activas
		await db.product.delete({
			where: {
				id: params.id
			}
		});

		return json({
			success: true,
			message: 'Producto eliminado exitosamente'
		});
	} catch (error) {
		console.error('Error deleting product:', error);
		return json(
			{
				success: false,
				message: 'Error al eliminar producto',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
