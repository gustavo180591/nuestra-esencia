import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/cash-register - Obtener caja actual o listado
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json({ success: false, message: 'Usuario no autenticado' }, { status: 401 });
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
						include: {
							paymentMethod: true
						}
					},
					expenses: true
				}
			});

			return json({ success: true, data: openCashRegister });
		}

		// Si se pide cajas cerradas
		if (status === 'CERRADA') {
			const closedCashRegisters = await db.cashRegister.findMany({
				where: { status: 'CERRADA' },
				orderBy: { openedAt: 'desc' },
				include: {
					openedBy: { select: { id: true, name: true } },
					closedBy: { select: { id: true, name: true } }
				}
			});

			return json({ success: true, data: closedCashRegisters });
		}

		// Por defecto, devolver la última caja (abierta o cerrada)
		const cashRegister = await db.cashRegister.findFirst({
			orderBy: { openedAt: 'desc' },
			include: {
				openedBy: { select: { id: true, name: true } },
				closedBy: { select: { id: true, name: true } },
				sales: {
					include: {
						paymentMethod: true
					}
				},
				expenses: true
			}
		});

		return json({ success: true, data: cashRegister });
	} catch (error) {
		console.error('Error fetching cash register:', error);
		return json({ success: false, message: 'Error al obtener caja' }, { status: 500 });
	}
};

// POST /api/cash-register - Abrir caja
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json({ success: false, message: 'Usuario no autenticado' }, { status: 401 });
		}

		// Verificar si ya hay una caja abierta
		const existingOpen = await db.cashRegister.findFirst({
			where: { status: 'ABIERTA' }
		});

		if (existingOpen) {
			return json({ success: false, message: 'Ya existe una caja abierta' }, { status: 400 });
		}

		const { initialAmount, branch, shift, openingBillCounts, openingNotes } = await request.json();

		if (initialAmount === undefined || initialAmount < 0) {
			return json({ success: false, message: 'Monto inicial requerido' }, { status: 400 });
		}

		const cashRegister = await db.cashRegister.create({
			data: {
				initialAmount,
				openedById: userId,
				status: 'ABIERTA',
				branch: branch || null,
				shift: shift || null,
				openingBillCounts: openingBillCounts || null,
				openingNotes: openingNotes || null
			}
		});

		return json({
			success: true,
			message: 'Caja abierta exitosamente',
			data: cashRegister
		});
	} catch (error) {
		console.error('Error opening cash register:', error);
		return json({ success: false, message: 'Error al abrir caja' }, { status: 500 });
	}
};

// PATCH /api/cash-register - Cerrar caja
export const PATCH: RequestHandler = async ({ request, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json({ success: false, message: 'Usuario no autenticado' }, { status: 401 });
		}

		const data = await request.json();
		const { actualAmount, notes, billCounts } = data;

		if (!actualAmount || actualAmount < 0) {
			return json({ success: false, message: 'El monto real es requerido' }, { status: 400 });
		}

		// Buscar caja abierta
		const openCashRegister = await db.cashRegister.findFirst({
			where: { status: 'ABIERTA' },
			include: {
				sales: {
					where: { status: 'COMPLETADA' },
					select: { total: true, paymentMethod: true, cashReceived: true }
				},
				expenses: {
					select: { amount: true, paymentMethod: true }
				}
			}
		});

		if (!openCashRegister) {
			return json({ success: false, message: 'No hay caja abierta para cerrar' }, { status: 400 });
		}

		// Calcular ventas por método de pago
		const cashSales = openCashRegister.sales.filter((s) => s.paymentMethod?.code === 'EFECTIVO');
		const totalCashSales = cashSales.reduce((sum, s) => sum + Number(s.cashReceived || s.total), 0);
		
		const transferSales = openCashRegister.sales.filter((s) => s.paymentMethod?.code === 'TRANSFERENCIA');
		const totalTransferSales = transferSales.reduce((sum, s) => sum + Number(s.total), 0);
		
		const qrSales = openCashRegister.sales.filter((s) => s.paymentMethod?.code === 'QR');
		const totalQrSales = qrSales.reduce((sum, s) => sum + Number(s.total), 0);
		
		const cardSales = openCashRegister.sales.filter((s) => s.paymentMethod?.code === 'TARJETA');
		const totalCardSales = cardSales.reduce((sum, s) => sum + Number(s.total), 0);
		
		// Calcular gastos en efectivo
		const cashExpenses = openCashRegister.expenses.filter((e) => e.paymentMethod === 'EFECTIVO');
		const totalCashExpenses = cashExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
		
		// Monto esperado en efectivo: inicial + ventas en efectivo - gastos en efectivo
		const expectedAmount = Number(openCashRegister.initialAmount) + totalCashSales - totalCashExpenses;

		// Calcular diferencia
		const difference = (actualAmount || 0) - expectedAmount;

		const closedCashRegister = await db.cashRegister.update({
			where: { id: openCashRegister.id },
			data: {
				status: 'CERRADA',
				closedAt: new Date(),
				closedBy: { connect: { id: userId } },
				actualAmount,
				expectedAmount,
				difference,
				notes,
				billCounts: billCounts || null
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
					totalTransferSales,
					totalQrSales,
					totalCardSales,
					totalCashExpenses,
					expectedAmount,
					actualAmount,
					difference,
					differenceText: difference === 0 ? 'Cuadrado' : difference > 0 ? 'Sobrante' : 'Faltante'
				}
			}
		});
	} catch (error) {
		console.error('Error closing cash register:', error);
		
		// Mensajes de error específicos
		let errorMessage = 'Error al cerrar caja';
		
		if (error instanceof Error) {
			if (error.message.includes('Unique constraint')) {
				errorMessage = 'Ya existe una caja abierta. No se puede cerrar otra caja.';
			} else if (error.message.includes('Foreign key constraint')) {
				errorMessage = 'Error de integridad de datos. Verifique que el usuario y la caja sean válidos.';
			} else if (error.message.includes('Record to update not found')) {
				errorMessage = 'La caja ya fue cerrada por otro usuario.';
			} else {
				errorMessage = `Error al cerrar caja: ${error.message}`;
			}
		}
		
		return json(
			{ 
				success: false, 
				message: errorMessage,
				error: error instanceof Error ? error.message : 'Unknown error'
			}, 
			{ status: 500 }
		);
	}
};
