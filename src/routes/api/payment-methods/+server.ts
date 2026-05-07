import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/payment-methods - Listar todos los medios de pago
export const GET: RequestHandler = async ({ url }) => {
	try {
		const includeInactive = url.searchParams.get('includeInactive') === 'true';

		const where = includeInactive ? {} : { active: true };

		const methods = await db.paymentMethodConfig.findMany({
			where,
			orderBy: { sortOrder: 'asc' },
			select: {
				id: true,
				code: true,
				name: true,
				description: true,
				icon: true,
				active: true,
				sortOrder: true
			}
		});

		return json({ success: true, data: methods });
	} catch (error) {
		console.error('Error fetching payment methods:', error);
		return json({ success: false, message: 'Error al obtener medios de pago' }, { status: 500 });
	}
};

// POST /api/payment-methods - Crear nuevo medio de pago
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json({ success: false, message: 'Usuario no autenticado' }, { status: 401 });
		}

		const body = await request.json();
		const { code, name, description, icon, sortOrder } = body;

		if (!code || !name) {
			return json({ success: false, message: 'Código y nombre son requeridos' }, { status: 400 });
		}

		// Verificar si el código ya existe
		const existing = await db.paymentMethodConfig.findUnique({
			where: { code }
		});

		if (existing) {
			return json(
				{ success: false, message: 'Ya existe un medio de pago con ese código' },
				{ status: 400 }
			);
		}

		const method = await db.paymentMethodConfig.create({
			data: {
				code,
				name,
				description,
				icon,
				sortOrder: sortOrder || 0
			}
		});

		return json({
			success: true,
			message: 'Medio de pago creado exitosamente',
			data: method
		});
	} catch (error) {
		console.error('Error creating payment method:', error);
		return json({ success: false, message: 'Error al crear medio de pago' }, { status: 500 });
	}
};
