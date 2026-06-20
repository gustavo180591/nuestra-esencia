import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
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

		const client = await db.client.update({
			where: { id: params.id },
			data: {
				name: name.trim(),
				phone: phone || null,
				address: address || null,
				email: email || null
			}
		});

		return json({
			success: true,
			data: client,
			message: 'Cliente actualizado exitosamente'
		});
	} catch (error) {
		console.error('Error updating client:', error);
		return json(
			{
				success: false,
				message: 'Error al actualizar cliente'
			},
			{ status: 500 }
		);
	}
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
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
		const { active } = data;

		const client = await db.client.update({
			where: { id: params.id },
			data: { active }
		});

		return json({
			success: true,
			data: client,
			message: active ? 'Cliente activado exitosamente' : 'Cliente desactivado exitosamente'
		});
	} catch (error) {
		console.error('Error updating client status:', error);
		return json(
			{
				success: false,
				message: 'Error al actualizar estado del cliente'
			},
			{ status: 500 }
		);
	}
};

export const GET: RequestHandler = async ({ params, locals }) => {
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
		const client = await db.client.findUnique({
			where: { id: params.id },
			include: {
				sales: {
					where: { paymentMethod: { code: 'CUENTA_CORRIENTE' } },
					orderBy: { createdAt: 'desc' },
					include: {
						items: {
							select: {
								id: true,
								productNameSnapshot: true,
								quantity: true,
								unitPrice: true,
								subtotal: true,
								unitMeasure: true
							}
						},
						paymentMethod: {
							select: {
								id: true,
								code: true,
								name: true,
								icon: true
							}
						},
						user: {
							select: {
								id: true,
								name: true
							}
						}
					}
				}
			}
		});

		if (!client) {
			return json(
				{
					success: false,
					message: 'Cliente no encontrado'
				},
				{ status: 404 }
			);
		}

		return json({
			success: true,
			data: client
		});
	} catch (error) {
		console.error('Error fetching client:', error);
		return json(
			{
				success: false,
				message: 'Error al obtener cliente'
			},
			{ status: 500 }
		);
	}
};
