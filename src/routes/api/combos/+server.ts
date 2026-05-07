import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// POST /api/combos/items - Agregar componente a combo
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json(
				{ success: false, message: 'Usuario no autenticado' },
				{ status: 401 }
			);
		}

		const { comboProductId, componentId, quantity } = await request.json();

		if (!comboProductId || !componentId || !quantity) {
			return json(
				{ success: false, message: 'Datos incompletos' },
				{ status: 400 }
			);
		}

		// Verificar que no exista ya este componente en el combo
		const existing = await db.productComboItem.findUnique({
			where: {
				comboProductId_componentId: {
					comboProductId,
					componentId
				}
			}
		});

		if (existing) {
			return json(
				{ success: false, message: 'El componente ya existe en el combo' },
				{ status: 400 }
			);
		}

		// Verificar que ambos productos existan
		const [comboProduct, component] = await Promise.all([
			db.product.findUnique({ where: { id: comboProductId } }),
			db.product.findUnique({ where: { id: componentId } })
		]);

		if (!comboProduct || !component) {
			return json(
				{ success: false, message: 'Producto no encontrado' },
				{ status: 404 }
			);
		}

		const comboItem = await db.productComboItem.create({
			data: {
				comboProductId,
				componentId,
				quantity
			}
		});

		return json({
			success: true,
			message: 'Componente agregado exitosamente',
			data: comboItem
		});
	} catch (error) {
		console.error('Error adding combo item:', error);
		return json(
			{ success: false, message: 'Error al agregar componente' },
			{ status: 500 }
		);
	}
};

// DELETE /api/combos/[id]/items - Eliminar todos los componentes de un combo
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json(
				{ success: false, message: 'Usuario no autenticado' },
				{ status: 401 }
			);
		}

		const comboId = params.id as string;

		await db.productComboItem.deleteMany({
			where: { comboProductId: comboId }
		});

		return json({
			success: true,
			message: 'Componentes eliminados exitosamente'
		});
	} catch (error) {
		console.error('Error deleting combo items:', error);
		return json(
			{ success: false, message: 'Error al eliminar componentes' },
			{ status: 500 }
		);
	}
};
