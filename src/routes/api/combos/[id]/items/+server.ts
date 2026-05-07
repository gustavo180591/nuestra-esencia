import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// DELETE /api/combos/[id]/items - Eliminar todos los componentes de un combo
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { id } = params;
	try {
		const userId = locals.user?.id;
		if (!userId) {
			return json(
				{ success: false, message: 'Usuario no autenticado' },
				{ status: 401 }
			);
		}

		await db.productComboItem.deleteMany({
			where: { comboProductId: id }
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
