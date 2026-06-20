import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
	// Verificar autenticación
	if (!locals.user) {
		return json(
			{
				success: false,
				message: 'No autenticado'
			},
			{ status: 401 }
		);
	}

	try {
		const clients = await db.client.findMany({
			where: { active: true },
			orderBy: { name: 'asc' },
			select: {
				id: true,
				name: true,
				phone: true,
				address: true,
				email: true,
				accountDebt: true,
				active: true,
				createdAt: true,
				updatedAt: true
			}
		});

		return json({
			success: true,
			data: clients
		});
	} catch (error) {
		console.error('Error fetching clients:', error);
		return json(
			{
				success: false,
				message: 'Error al obtener clientes'
			},
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	// Verificar autenticación
	if (!locals.user) {
		return json(
			{
				success: false,
				message: 'No autenticado'
			},
			{ status: 401 }
		);
	}

	try {
		const data = await request.json();
		const { name, phone, address, email } = data;

		if (!name || name.trim() === '') {
			return json(
				{
					success: false,
					message: 'El nombre del cliente es obligatorio'
				},
				{ status: 400 }
			);
		}

		const client = await db.client.create({
			data: {
				name: name.trim(),
				phone: phone || null,
				address: address || null,
				email: email || null,
				accountDebt: 0,
				active: true
			}
		});

		return json({
			success: true,
			data: client,
			message: 'Cliente creado exitosamente'
		});
	} catch (error) {
		console.error('Error creating client:', error);
		return json(
			{
				success: false,
				message: 'Error al crear cliente'
			},
			{ status: 500 }
		);
	}
};
