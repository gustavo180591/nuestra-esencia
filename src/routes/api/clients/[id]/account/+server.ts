import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) {
		return json({ success: false, message: 'No autenticado' }, { status: 401 });
	}

	try {
		const movements = await db.clientAccountMovement.findMany({
			where: { clientId: params.id },
			orderBy: { createdAt: 'desc' },
			include: {
				user: {
					select: { id: true, name: true }
				}
			}
		});

		// Fetch sale details for VENTA movements
		const saleIds = movements
			.filter((m) => m.type === 'VENTA' && m.referenceId && m.referenceType === 'SALE')
			.map((m) => m.referenceId!);

		const sales = await db.sale.findMany({
			where: { id: { in: saleIds } },
			include: {
				items: {
					select: {
						productNameSnapshot: true,
						quantity: true,
						unitPrice: true,
						subtotal: true,
						unitMeasure: true
					}
				}
			}
		});

		const salesMap = new Map(sales.map((s) => [s.id, s]));

		// Attach sale details to movements
		const movementsWithDetails = movements.map((movement) => {
			if (movement.type === 'VENTA' && movement.referenceId && movement.referenceType === 'SALE') {
				const sale = salesMap.get(movement.referenceId);
				return {
					...movement,
					sale: sale || null
				};
			}
			return movement;
		});

		return json({ success: true, data: movementsWithDetails });
	} catch (error) {
		console.error('Error fetching account movements:', error);
		return json({ success: false, message: 'Error al obtener movimientos' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ params, request, locals }) => {
	if (!locals.user) {
		return json({ success: false, message: 'No autenticado' }, { status: 401 });
	}

	if (!params.id) {
		return json({ success: false, message: 'ID de cliente requerido' }, { status: 400 });
	}

	const clientId = params.id;

	try {
		const data = await request.json();
		const { type, amount, description, referenceId, referenceType } = data;

		if (!type || !amount || Number(amount) <= 0) {
			return json({ success: false, message: 'Tipo y monto son requeridos' }, { status: 400 });
		}

		const result = await db.$transaction(async (tx) => {
			const client = await tx.client.findUnique({
				where: { id: clientId }
			});

			if (!client) {
				throw new Error('CLIENT_NOT_FOUND');
			}

			const currentBalance = Number(client.accountDebt);
			let newBalance: number;

			if (type === 'VENTA') {
				newBalance = currentBalance + Number(amount);
			} else if (type === 'PAGO') {
				newBalance = currentBalance - Number(amount);
			} else if (type === 'AJUSTE') {
				newBalance = Number(amount);
			} else {
				throw new Error('INVALID_TYPE');
			}

			const movement = await tx.clientAccountMovement.create({
				data: {
					clientId: clientId,
					type,
					amount: Number(amount),
					description: description || '',
					balanceAfter: newBalance,
					referenceId,
					referenceType,
					userId: locals.user!.id
				},
				include: {
					user: {
						select: { id: true, name: true }
					}
				}
			});

			await tx.client.update({
				where: { id: clientId },
				data: { accountDebt: newBalance }
			});

			return movement;
		});

		return json({
			success: true,
			data: result,
			message: 'Movimiento registrado'
		});
	} catch (error) {
		if (error instanceof Error && error.message === 'CLIENT_NOT_FOUND') {
			return json({ success: false, message: 'Cliente no encontrado' }, { status: 404 });
		}

		if (error instanceof Error && error.message === 'INVALID_TYPE') {
			return json({ success: false, message: 'Tipo de movimiento inválido' }, { status: 400 });
		}

		console.error('Error creating account movement:', error);
		return json({ success: false, message: 'Error al registrar movimiento' }, { status: 500 });
	}
};
