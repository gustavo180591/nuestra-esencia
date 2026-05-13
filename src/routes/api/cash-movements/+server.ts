import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/cash-movements - Listar movimientos de caja
export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json({ success: false, message: 'Usuario no autenticado' }, { status: 401 });
		}

		const cashRegisterId = url.searchParams.get('cashRegisterId');
		const type = url.searchParams.get('type');
		const category = url.searchParams.get('category');

		const where: any = {};
		if (cashRegisterId) where.cashRegisterId = cashRegisterId;
		if (type) where.type = type;
		if (category) where.category = category;

		const movements = await db.cashMovement.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			include: {
				user: { select: { id: true, name: true } },
				cashRegister: { select: { id: true, status: true, openedAt: true } }
			}
		});

		return json({ success: true, data: movements });
	} catch (error) {
		console.error('Error fetching cash movements:', error);
		return json({ success: false, message: 'Error al obtener movimientos' }, { status: 500 });
	}
};

// POST /api/cash-movements - Crear movimiento de caja
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json({ success: false, message: 'Usuario no autenticado' }, { status: 401 });
		}

		const data = await request.json();
		const { cashRegisterId, type, category, amount, description } = data;

		// Validaciones
		if (!cashRegisterId || !type || !category || !amount || !description) {
			return json({ success: false, message: 'Faltan campos requeridos' }, { status: 400 });
		}

		if (amount <= 0) {
			return json({ success: false, message: 'El monto debe ser mayor a 0' }, { status: 400 });
		}

		// Verificar que la caja esté abierta
		const cashRegister = await db.cashRegister.findUnique({
			where: { id: cashRegisterId }
		});

		if (!cashRegister) {
			return json({ success: false, message: 'Caja no encontrada' }, { status: 404 });
		}

		if (cashRegister.status !== 'ABIERTA') {
			return json({ success: false, message: 'Solo se pueden registrar movimientos en cajas abiertas' }, { status: 400 });
		}

		// Crear movimiento
		const movement = await db.cashMovement.create({
			data: {
				cashRegisterId,
				type,
				category,
				amount,
				description,
				userId
			},
			include: {
				user: { select: { id: true, name: true } },
				cashRegister: { select: { id: true, status: true } }
			}
		});

		return json({
			success: true,
			message: 'Movimiento registrado exitosamente',
			data: movement
		});
	} catch (error) {
		console.error('Error creating cash movement:', error);
		return json({ success: false, message: 'Error al registrar movimiento' }, { status: 500 });
	}
};
