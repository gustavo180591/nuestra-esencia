import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Cancelar o eliminar una venta (DELETE /api/sales/[id])
export const DELETE: RequestHandler = async ({ params, request, locals }) => {
	try {
		// 🔐 Obtener usuario autenticado
		const userId = locals.user?.id;

		if (!userId) {
			return json({ success: false, message: 'Usuario no autenticado' }, { status: 401 });
		}

		const body = await request.json().catch(() => ({ reason: '', permanent: false }));
		const { reason, permanent } = body;

		// Verificar que la venta existe
		const sale = await db.sale.findUnique({
			where: { id: params.id },
			include: {
				items: {
					include: {
						product: true
					}
				}
			}
		});

		if (!sale) {
			return json(
				{
					success: false,
					message: 'Venta no encontrada'
				},
				{ status: 404 }
			);
		}

		// Si es eliminación permanente
		if (permanent) {
			// Eliminar permanentemente (sin importar el estado)
			await db.$transaction(async (tx) => {
				// 1. Eliminar items de la venta
				await tx.saleItem.deleteMany({
					where: { saleId: params.id }
				});

				// 2. Eliminar movimientos de stock relacionados
				await tx.stockMovement.deleteMany({
					where: { saleId: params.id }
				});

				// 3. Eliminar la venta
				await tx.sale.delete({
					where: { id: params.id }
				});
			});

			return json({
				success: true,
				message: 'Venta eliminada permanentemente'
			});
		}

		// Cancelación normal (comportamiento existente)
		if (sale.status === 'CANCELADA') {
			return json(
				{
					success: false,
					message: 'La venta ya está cancelada'
				},
				{ status: 400 }
			);
		}

		// Ejecutar en transacción
		await db.$transaction(async (tx) => {
			// 1. Actualizar estado de la venta
			await tx.sale.update({
				where: { id: params.id },
				data: {
					status: 'CANCELADA',
					cancelledAt: new Date(),
					cancellationReason: reason || null,
					cancelledById: userId
				}
			});

			// 2. Restaurar stock y crear movimientos de reversión
			for (const item of sale.items) {
				const previousStock = Number(item.product.stock);
				const newStock = previousStock + Number(item.quantity);

				// Actualizar stock del producto
				await tx.product.update({
					where: { id: item.productId },
					data: { stock: newStock }
				});

				// Crear movimiento de stock de reversión
				await tx.stockMovement.create({
					data: {
						productId: item.productId,
						type: 'REVERSO_VENTA',
						quantity: Number(item.quantity),
						previousStock,
						newStock,
						saleId: sale.id,
						userId,
						reason: reason || `Cancelación de venta #${sale.saleNumber}`
					}
				});
			}
		});

		return json({
			success: true,
			message: 'Venta cancelada exitosamente'
		});
	} catch (error) {
		console.error('Error cancelling/deleting sale:', error);
		return json(
			{
				success: false,
				message: 'Error al cancelar la venta',
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined
			},
			{ status: 500 }
		);
	}
};

// Corregir una venta cancelada (PATCH /api/sales/[id])
export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	try {
		// 🔐 Obtener usuario autenticado
		const userId = locals.user?.id;

		if (!userId) {
			return json({ success: false, message: 'Usuario no autenticado' }, { status: 401 });
		}

		const { reason, status } = await request.json();

		if (status !== 'COMPLETADA') {
			return json(
				{
					success: false,
					message: 'Solo se permite corregir ventas canceladas a estado completada'
				},
				{ status: 400 }
			);
		}

		// Verificar que la venta existe
		const sale = await db.sale.findUnique({
			where: { id: params.id },
			include: {
				items: {
					include: {
						product: true
					}
				}
			}
		});

		if (!sale) {
			return json(
				{
					success: false,
					message: 'Venta no encontrada'
				},
				{ status: 404 }
			);
		}

		if (sale.status !== 'CANCELADA') {
			return json(
				{
					success: false,
					message: 'Solo se pueden corregir ventas canceladas'
				},
				{ status: 400 }
			);
		}

		// Ejecutar en transacción
		await db.$transaction(async (tx) => {
			// 1. Actualizar estado de la venta
			await tx.sale.update({
				where: { id: params.id },
				data: {
					status: 'COMPLETADA',
					cancelledAt: null,
					cancellationReason: null,
					correctedAt: new Date(),
					correctionReason: reason || null
				}
			});

			// 2. Descontar stock nuevamente y crear movimientos
			for (const item of sale.items) {
				const previousStock = Number(item.product.stock);
				const newStock = Math.max(0, previousStock - Number(item.quantity));

				// Actualizar stock del producto
				await tx.product.update({
					where: { id: item.productId },
					data: { stock: newStock }
				});

				// Crear movimiento de stock de corrección
				await tx.stockMovement.create({
					data: {
						productId: item.productId,
						type: 'CORRECCION_VENTA',
						quantity: -Number(item.quantity),
						previousStock,
						newStock,
						saleId: sale.id,
						userId,
						reason: reason || `Corrección de venta #${sale.saleNumber}`
					}
				});
			}
		});

		return json({
			success: true,
			message: 'Venta corregida exitosamente'
		});
	} catch (error) {
		console.error('Error correcting sale:', error);
		return json(
			{
				success: false,
				message: 'Error al corregir la venta',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
