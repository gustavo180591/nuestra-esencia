import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const category = await db.category.findUnique({
			where: {
				id: params.id
			},
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
			}
		});

		if (!category) {
			return json(
				{
					success: false,
					message: 'Categoría no encontrada'
				},
				{ status: 404 }
			);
		}

		return json({
			success: true,
			data: category
		});
	} catch (error) {
		console.error('Error fetching category:', error);
		return json(
			{
				success: false,
				message: 'Error al obtener categoría',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const data = await request.json();

		const { name, description, active } = data;

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

		// Verificar que la categoría existe
		const existingCategory = await db.category.findUnique({
			where: { id: params.id }
		});

		if (!existingCategory) {
			return json(
				{
					success: false,
					message: 'Categoría no encontrada'
				},
				{ status: 404 }
			);
		}

		// Verificar si ya existe otra categoría con el mismo nombre
		const duplicateCategory = await db.category.findFirst({
			where: {
				name: name.trim(),
				active: true,
				NOT: {
					id: params.id
				}
			}
		});

		if (duplicateCategory) {
			return json(
				{
					success: false,
					message: 'Ya existe otra categoría con ese nombre'
				},
				{ status: 400 }
			);
		}

		const category = await db.category.update({
			where: {
				id: params.id
			},
			data: {
				name: name.trim(),
				description: description?.trim() || null,
				active: active !== undefined ? active : true
			},
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
			}
		});

		return json({
			success: true,
			message: 'Categoría actualizada exitosamente',
			data: category
		});
	} catch (error) {
		console.error('Error updating category:', error);
		return json(
			{
				success: false,
				message: 'Error al actualizar categoría',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		// Verificar que la categoría existe
		const existingCategory = await db.category.findUnique({
			where: { id: params.id },
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
			}
		});

		if (!existingCategory) {
			return json(
				{
					success: false,
					message: 'Categoría no encontrada'
				},
				{ status: 404 }
			);
		}

		// Verificar si hay productos activos usando esta categoría
		if (existingCategory._count.products > 0) {
			return json(
				{
					success: false,
					message:
						'No se puede eliminar una categoría que tiene productos activos. Primero elimine o reasigne los productos.'
				},
				{ status: 400 }
			);
		}

		// Soft delete - cambiar active a false
		await db.category.update({
			where: {
				id: params.id
			},
			data: {
				active: false
			}
		});

		return json({
			success: true,
			message: 'Categoría eliminada exitosamente'
		});
	} catch (error) {
		console.error('Error deleting category:', error);
		return json(
			{
				success: false,
				message: 'Error al eliminar categoría',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
