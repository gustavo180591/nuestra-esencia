import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/cash-register - Obtener caja actual o listado
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json(
				{ success: false, message: 'Usuario no autenticado' },
				{ status: 401 }
			);
		}

		const status = url.searchParams.get('status');

		// Si se pide la caja abierta actual
		if (status === 'ABIERTA') {
			const openCashRegister = await db.cashRegister.findFirst({
				where: { status: 'ABIERTA' },
				include: {
					openedBy: { select: { id: true, name: true } },
					sales: {
						where: { status: 'COMPLETADA' },
						select: { total: true, paymentMethod: true }
					}
				}
			});

			return json({
				success: true,
				data: openCashRegister,
				hasOpenCashRegister: !!openCashRegister
			});
		}

		// Listado histórico
		const registers = await db.cashRegister.findMany({
			orderBy: { openedAt: 'desc' },
			take: 50,
			include: {
				openedBy: { select: { id: true, name: true } },
				closedBy: { select: { id: true, name: true } }
			}
		});

		return json({ success: true, data: registers });
	} catch (error) {
		console.error('Error fetching cash register:', error);
		return json(
			{ success: false, message: 'Error al obtener caja' },
			{ status: 500 }
		);
	}
};

// POST /api/cash-register - Abrir caja
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json(
				{ success: false, message: 'Usuario no autenticado' },
				{ status: 401 }
			);
		}

		// Verificar si ya hay una caja abierta
		const existingOpen = await db.cashRegister.findFirst({
			where: { status: 'ABIERTA' }
		});

		if (existingOpen) {
			return json(
				{ success: false, message: 'Ya existe una caja abierta' },
				{ status: 400 }
			);
		}

		const { initialAmount } = await request.json();

		if (initialAmount === undefined || initialAmount < 0) {
			return json(
				{ success: false, message: 'Monto inicial requerido' },
				{ status: 400 }
			);
		}

		const cashRegister = await db.cashRegister.create({
			data: {
				initialAmount,
				openedById: userId,
				status: 'ABIERTA'
			}
		});

		return json({
			success: true,
			message: 'Caja abierta exitosamente',
			data: cashRegister
		});
	} catch (error) {
		console.error('Error opening cash register:', error);
		return json(
			{ success: false, message: 'Error al abrir caja' },
			{ status: 500 }
		);
	}
};

// PATCH /api/cash-register - Cerrar caja
export const PATCH: RequestHandler = async ({ request, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json(
				{ success: false, message: 'Usuario no autenticado' },
				{ status: 401 }
			);
		}

		const { actualAmount, notes } = await request.json();

		// Buscar caja abierta
		const openCashRegister = await db.cashRegister.findFirst({
			where: { status: 'ABIERTA' },
			include: {
				sales: {
					where: { status: 'COMPLETADA' },
					select: { total: true, paymentMethod: true, cashReceived: true }
				}
			}
		});

		if (!openCashRegister) {
			return json(
				{ success: false, message: 'No hay caja abierta para cerrar' },
				{ status: 400 }
			);
		}

		// Calcular monto esperado: inicial + ventas en efectivo
		const cashSales = openCashRegister.sales.filter(
			s => s.paymentMethod?.code === 'EFECTIVO'
		);
		const totalCashSales = cashSales.reduce(
			(sum, s) => sum + Number(s.cashReceived || s.total), 0
		);
		const expectedAmount = Number(openCashRegister.initialAmount) + totalCashSales;

		// Calcular diferencia
		const difference = (actualAmount || 0) - expectedAmount;

		const closedCashRegister = await db.cashRegister.update({
			where: { id: openCashRegister.id },
			data: {
				status: 'CERRADA',
				closedAt: new Date(),
				closedById: userId,
				actualAmount,
				expectedAmount,
				difference,
				notes
			}
		});

		return json({
			success: true,
			message: 'Caja cerrada exitosamente',
			data: {
				cashRegister: closedCashRegister,
				arqueo: {
					initialAmount: openCashRegister.initialAmount,
					totalCashSales,
					expectedAmount,
					actualAmount,
					difference,
					differenceText: difference === 0 ? 'Cuadrado' : difference > 0 ? 'Sobrante' : 'Faltante'
				}
			}
		});
	} catch (error) {
		console.error('Error closing cash register:', error);
		return json(
			{ success: false, message: 'Error al cerrar caja' },
			{ status: 500 }
		);
	}
};
