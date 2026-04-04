import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';

export async function GET() {
	try {
		const products = await db.product.findMany({
			where: {
				status: 'ACTIVO'
			},
			include: {
				category: {
					select: {
						id: true,
						name: true
					}
				},
				saleFormats: {
					where: {
						active: true
					},
					select: {
						id: true,
						unitMeasure: true,
						label: true,
						price: true
					},
					orderBy: {
						price: 'asc'
					}
				}
			},
			orderBy: [
				{
					category: {
						name: 'asc'
					}
				},
				{
					name: 'asc'
				}
			]
		});

		return json({
			success: true,
			data: products,
			count: products.length
		});
	} catch (error) {
		console.error('Error fetching products:', error);
		return json(
			{
				success: false,
				message: 'Error al obtener productos',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}
