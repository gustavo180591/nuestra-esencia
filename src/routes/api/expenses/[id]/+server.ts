import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { ExpenseCategory } from '@prisma/client';

// PUT - Actualizar gasto existente
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { id } = params;
		const data = await request.json();
		const { description, amount, category, date, paymentMethod, supplierId, notes } = data;

		// Validaciones básicas
		if (!description || description.trim() === '') {
			return json(
				{
					success: false,
					message: 'La descripción es requerida'
				},
				{ status: 400 }
			);
		}

		if (!amount || amount <= 0) {
			return json(
				{
					success: false,
					message: 'El monto debe ser mayor a 0'
				},
				{ status: 400 }
			);
		}

		if (!category) {
			return json(
				{
					success: false,
					message: 'La categoría es requerida'
				},
				{ status: 400 }
			);
		}

		if (!paymentMethod) {
			return json(
				{
					success: false,
					message: 'El método de pago es requerido'
				},
				{ status: 400 }
			);
		}

		const expense = await db.expense.update({
			where: { id },
			data: {
				description: description.trim(),
				amount: Number(amount),
				category: category as ExpenseCategory,
				date: date ? new Date(date) : undefined,
				paymentMethod,
				supplierId: supplierId || null,
				notes: notes?.trim() || null
			},
			include: {
				supplier: {
					select: {
						id: true,
						name: true
					}
				},
				user: {
					select: {
						id: true,
						name: true
					}
				},
				cashRegister: {
					select: {
						id: true,
						openedAt: true,
						status: true
					}
				}
			}
		});

		return json({
			success: true,
			data: expense,
			message: 'Gasto actualizado exitosamente'
		});
	} catch (error) {
		console.error('Error updating expense:', error);
		return json(
			{
				success: false,
				message: 'Error al actualizar gasto',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

// DELETE - Eliminar gasto
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;

		await db.expense.delete({
			where: { id }
		});

		return json({
			success: true,
			message: 'Gasto eliminado exitosamente'
		});
	} catch (error) {
		console.error('Error deleting expense:', error);
		return json(
			{
				success: false,
				message: 'Error al eliminar gasto',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
