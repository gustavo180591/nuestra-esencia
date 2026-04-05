import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const data = await request.json();

		const { type, quantity, reason, note } = data;

		// Validaciones básicas
		if (!type || !quantity || !reason) {
			return json(
				{
					success: false,
					message: 'El tipo, cantidad y motivo son requeridos'
				},
				{ status: 400 }
			);
		}

		const quantityNum = Number(quantity);
		if (isNaN(quantityNum) || quantityNum <= 0) {
			return json(
				{
					success: false,
					message: 'La cantidad debe ser un número positivo'
				},
				{ status: 400 }
			);
		}

		// Verificar que el producto existe
		const product = await db.product.findUnique({
			where: { id: params.id }
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

		// Calcular nuevo stock
		let newStock = Number(product.stock);
		if (type === 'SALE') {
			newStock -= quantityNum;
		} else {
			newStock += quantityNum;
		}

		// Validar que el stock no sea negativo
		if (newStock < 0) {
			return json(
				{
					success: false,
					message: 'No se puede realizar el ajuste. El stock sería negativo.'
				},
				{ status: 400 }
			);
		}

		// Realizar la transacción
		const result = await db.$transaction(async (tx) => {
			// Actualizar stock del producto
			const updatedProduct = await tx.product.update({
				where: { id: params.id },
				data: { stock: newStock.toString() }
			});

			// Registrar movimiento de stock
			let movementType: 'ENTRADA_COMPRA' | 'SALIDA_VENTA' | 'AJUSTE_MANUAL' | 'REVERSO_VENTA' | 'REVERSO_COMPRA';
			if (type === 'SALE') {
				movementType = 'SALIDA_VENTA';
			} else if (type === 'PURCHASE') {
				movementType = 'ENTRADA_COMPRA';
			} else {
				movementType = 'AJUSTE_MANUAL';
			}

			await tx.stockMovement.create({
				data: {
					productId: params.id,
					type: movementType,
					quantity: type === 'SALE' ? (-quantityNum).toString() : quantityNum.toString(),
					previousStock: product.stock,
					newStock: newStock.toString(),
					reason,
					userId: null // TODO: Add user authentication
				}
			});

			return updatedProduct;
		});

		return json({
			success: true,
			message: 'Ajuste de stock realizado exitosamente',
			data: {
				previousStock: product.stock,
				newStock: result.stock,
				adjustment: type === 'SALE' ? -quantityNum : quantityNum
			}
		});
	} catch (error) {
		console.error('Error adjusting stock:', error);
		return json(
			{
				success: false,
				message: 'Error al realizar ajuste de stock',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const GET: RequestHandler = async ({ params }) => {
	try {
		// Obtener historial de movimientos de stock
		const movements = await db.stockMovement.findMany({
			where: { productId: params.id },
			include: {
				user: {
					select: {
						id: true,
						name: true
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			},
			take: 50 // Limitar a los últimos 50 movimientos
		});

		return json({
			success: true,
			data: movements,
			count: movements.length
		});
	} catch (error) {
		console.error('Error fetching stock movements:', error);
		return json(
			{
				success: false,
				message: 'Error al obtener historial de movimientos',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
