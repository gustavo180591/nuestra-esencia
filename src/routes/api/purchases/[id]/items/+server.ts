import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const purchaseItems = await db.purchaseItem.findMany({
			where: {
				purchaseId: params.id
			},
			orderBy: {
				createdAt: 'asc'
			}
		});

		return json({
			success: true,
			data: purchaseItems.map((item) => ({
				id: item.id,
				productNameSnapshot: item.productNameSnapshot,
				unitMeasure: item.unitMeasure,
				quantity: Number(item.quantity),
				unitCost: Number(item.unitCost),
				subtotal: Number(item.subtotal)
			}))
		});
	} catch (error) {
		console.error('Error fetching purchase items:', error);
		return json(
			{
				success: false,
				message: 'Error al obtener items de la compra',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
