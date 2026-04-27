import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Cancelar o eliminar una compra (DELETE /api/purchases/[id])
export const DELETE: RequestHandler = async ({ params, request }) => {
	try {
		const body = await request.json().catch(() => ({ reason: '', permanent: false }));
		const { reason, permanent } = body;

		// Verificar que la compra existe
		const purchase = await db.purchase.findUnique({
			where: { id: params.id },
			include: {
				items: {
					include: {
						product: true
					}
				}
			}
		});

		if (!purchase) {
			return json(
				{
					success: false,
					message: 'Compra no encontrada'
				},
				{ status: 404 }
			);
		}

		// Si es eliminación permanente
		if (permanent) {
			// Eliminar permanentemente (sin importar el estado)
			await db.$transaction(async (tx) => {
				// 1. Eliminar items de la compra
				await tx.purchaseItem.deleteMany({
					where: { purchaseId: params.id }
				});

				// 2. Eliminar movimientos de stock relacionados
				await tx.stockMovement.deleteMany({
					where: { purchaseId: params.id }
				});

				// 3. Eliminar la compra
				await tx.purchase.delete({
					where: { id: params.id }
				});
			});

			return json({
				success: true,
				message: 'Compra eliminada permanentemente'
			});
		}

		// Cancelación normal (comportamiento existente)
		if (purchase.status === 'CANCELADA') {
			return json(
				{
					success: false,
					message: 'La compra ya está cancelada'
				},
				{ status: 400 }
			);
		}

		// Ejecutar en transacción
		await db.$transaction(async (tx) => {
			// 1. Actualizar estado de la compra
			await tx.purchase.update({
				where: { id: params.id },
				data: {
					status: 'CANCELADA',
					notes: reason
						? `${purchase.notes || ''}\n[Cancelada: ${reason}]`.trim()
						: `${purchase.notes || ''}\n[Cancelada]`.trim()
				}
			});

			// 2. Revertir stock y crear movimientos de reversión
			for (const item of purchase.items) {
				const previousStock = Number(item.product.stock);
				const newStock = Math.max(0, previousStock - Number(item.quantity));

				// Actualizar stock del producto
				await tx.product.update({
					where: { id: item.productId },
					data: { stock: newStock.toString() }
				});

				// Crear movimiento de stock de reversión
				await tx.stockMovement.create({
					data: {
						productId: item.productId,
						type: 'REVERSO_COMPRA',
						quantity: -Number(item.quantity),
						previousStock: previousStock.toString(),
						newStock: newStock.toString(),
						purchaseId: purchase.id,
						userId: 'cmnmlamaf0000vikcqdxl4iz9', // Usuario admin Gustavo Faccendini
						reason: reason || `Cancelación de compra #${purchase.purchaseNumber}`
					}
				});
			}
		});

		return json({
			success: true,
			message: 'Compra cancelada exitosamente'
		});
	} catch (error) {
		console.error('Error cancelling purchase:', error);
		return json(
			{
				success: false,
				message: 'Error al cancelar la compra',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
