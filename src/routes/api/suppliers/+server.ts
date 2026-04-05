import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const includeInactive = url.searchParams.get('includeInactive') === 'true';

		const whereClause: any = {};
		if (!includeInactive) {
			whereClause.active = true;
		}

		const suppliers = await db.supplier.findMany({
			where: whereClause,
			include: {
				_count: {
					select: {
						purchases: {
							where: {
								status: 'REGISTRADA'
							}
						}
					}
				}
			},
			orderBy: {
				name: 'asc'
			}
		});

		return json({
			success: true,
			data: suppliers,
			count: suppliers.length
		});
	} catch (error) {
		console.error('Error fetching suppliers:', error);
		return json(
			{
				success: false,
				message: 'Error al obtener proveedores',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		const { name, phone, address, email } = data;

		// Validaciones básicas
		if (!name || name.trim() === '') {
			return json(
				{
					success: false,
					message: 'El nombre del proveedor es requerido'
				},
				{ status: 400 }
			);
		}

		// Verificar si ya existe un proveedor con el mismo nombre
		const existingSupplier = await db.supplier.findFirst({
			where: {
				name: name.trim(),
				active: true
			}
		});

		if (existingSupplier) {
			return json(
				{
					success: false,
					message: 'Ya existe un proveedor con ese nombre'
				},
				{ status: 400 }
			);
		}

		const supplier = await db.supplier.create({
			data: {
				name: name.trim(),
				phone: phone?.trim() || null,
				address: address?.trim() || null,
				email: email?.trim() || null
			}
		});

		return json({
			success: true,
			message: 'Proveedor creado exitosamente',
			data: supplier
		});
	} catch (error) {
		console.error('Error creating supplier:', error);
		return json(
			{
				success: false,
				message: 'Error al crear proveedor',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
