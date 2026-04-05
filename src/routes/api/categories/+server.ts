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

		const categories = await db.category.findMany({
			where: whereClause,
			include: {
				_count: {
					select: {
						products: {
							where: {
								status: 'ACTIVO'
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
			data: categories,
			count: categories.length
		});
	} catch (error) {
		console.error('Error fetching categories:', error);
		return json(
			{
				success: false,
				message: 'Error al obtener categorías',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		const { name, description } = data;

		// Validaciones básicas
		if (!name || name.trim() === '') {
			return json(
				{
					success: false,
					message: 'El nombre de la categoría es requerido'
				},
				{ status: 400 }
			);
		}

		// Verificar si ya existe una categoría con el mismo nombre
		const existingCategory = await db.category.findFirst({
			where: {
				name: name.trim(),
				active: true
			}
		});

		if (existingCategory) {
			return json(
				{
					success: false,
					message: 'Ya existe una categoría con ese nombre'
				},
				{ status: 400 }
			);
		}

		const category = await db.category.create({
			data: {
				name: name.trim(),
				description: description?.trim() || null
			}
		});

		return json({
			success: true,
			message: 'Categoría creada exitosamente',
			data: category
		});
	} catch (error) {
		console.error('Error creating category:', error);
		return json(
			{
				success: false,
				message: 'Error al crear categoría',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
