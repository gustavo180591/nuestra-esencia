import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { ExpenseCategory } from '@prisma/client';

// GET - Listar gastos con filtros opcionales
export const GET: RequestHandler = async ({ url }) => {
	try {
		const startDate = url.searchParams.get('startDate');
		const endDate = url.searchParams.get('endDate');
		const category = url.searchParams.get('category');
		const supplierId = url.searchParams.get('supplierId');
		const cashRegisterId = url.searchParams.get('cashRegisterId');

		const where: any = {};

		if (startDate || endDate) {
			where.date = {};
			if (startDate) where.date.gte = new Date(startDate);
			if (endDate) where.date.lte = new Date(endDate);
		}

		if (category) {
			where.category = category as ExpenseCategory;
		}

		if (supplierId) {
			where.supplierId = supplierId;
		}

		if (cashRegisterId) {
			where.cashRegisterId = cashRegisterId;
		}

		const expenses = await db.expense.findMany({
			where,
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
			},
			orderBy: {
				date: 'desc'
			}
		});

		return json({
			success: true,
			data: expenses,
			count: expenses.length
		});
	} catch (error) {
		console.error('Error fetching expenses:', error);
		return json(
			{
				success: false,
				message: 'Error al obtener gastos',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

// POST - Crear nuevo gasto
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json(
				{
					success: false,
					message: 'Usuario no autenticado'
				},
				{ status: 401 }
			);
		}

		const data = await request.json();
		const {
			description,
			amount,
			category,
			date,
			paymentMethod,
			supplierId,
			notes,
			cashRegisterId
		} = data;

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

		const expense = await db.expense.create({
			data: {
				description: description.trim(),
				amount: Number(amount),
				category: category as ExpenseCategory,
				date: date ? new Date(date) : new Date(),
				paymentMethod,
				supplierId: supplierId || null,
				notes: notes?.trim() || null,
				userId,
				cashRegisterId: cashRegisterId || null
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
			message: 'Gasto creado exitosamente'
		});
	} catch (error) {
		console.error('Error creating expense:', error);
		return json(
			{
				success: false,
				message: 'Error al crear gasto',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
