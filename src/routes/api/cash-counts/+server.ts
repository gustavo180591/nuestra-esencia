import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/cash-counts - Listar conteos de caja
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json({ success: false, message: 'Usuario no autenticado' }, { status: 401 });
		}

		const cashRegisterId = url.searchParams.get('cashRegisterId');
		const type = url.searchParams.get('type');

		const where: any = {};
		if (cashRegisterId) where.cashRegisterId = cashRegisterId;
		if (type) where.type = type;

		const cashCounts = await db.cashCount.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			include: {
				user: { select: { id: true, name: true } },
				cashRegister: { select: { id: true, status: true, openedAt: true } },
				items: true
			}
		});

		return json({ success: true, data: cashCounts });
	} catch (error) {
		console.error('Error fetching cash counts:', error);
		return json({ success: false, message: 'Error al obtener conteos' }, { status: 500 });
	}
};

// POST /api/cash-counts - Crear conteo de caja
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json({ success: false, message: 'Usuario no autenticado' }, { status: 401 });
		}

		const data = await request.json();
		const { cashRegisterId, type, items, notes } = data;

		// Validaciones
		if (!cashRegisterId || !type || !items || !Array.isArray(items)) {
			return json({ success: false, message: 'Faltan campos requeridos' }, { status: 400 });
		}

		// Verificar que la caja exista
		const cashRegister = await db.cashRegister.findUnique({
			where: { id: cashRegisterId }
		});

		if (!cashRegister) {
			return json({ success: false, message: 'Caja no encontrada' }, { status: 404 });
		}

		// Calcular total del conteo
		let totalAmount = 0;
		const itemsWithSubtotal = items.map((item: any) => {
			const subtotal = item.denomination * item.quantity;
			totalAmount += subtotal;
			return {
				denomination: item.denomination,
				quantity: item.quantity,
				subtotal
			};
		});

		// Crear conteo con items
		const cashCount = await db.cashCount.create({
			data: {
				cashRegisterId,
				type,
				totalAmount,
				notes: notes || null,
				userId,
				items: {
					create: itemsWithSubtotal
				}
			},
			include: {
				user: { select: { id: true, name: true } },
				cashRegister: { select: { id: true, status: true } },
				items: true
			}
		});

		return json({
			success: true,
			message: 'Conteo registrado exitosamente',
			data: cashCount
		});
	} catch (error) {
		console.error('Error creating cash count:', error);
		return json({ success: false, message: 'Error al registrar conteo' }, { status: 500 });
	}
};
