import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		// Parse pagination params
		const page = parseInt(url.searchParams.get('page') || '1', 10);
		const limit = parseInt(url.searchParams.get('limit') || '50', 10);
		const skip = (page - 1) * limit;

		// Get total count for pagination
		const totalCount = await db.purchaseItem.count({
			where: {
				productId: params.id
			}
		});

		const purchaseItems = await db.purchaseItem.findMany({
			where: {
				productId: params.id
			},
			include: {
				purchase: {
					select: {
						id: true,
						purchaseNumber: true,
						status: true,
						total: true,
						createdAt: true,
						supplier: {
							select: {
								name: true
							}
						},
						user: {
							select: {
								name: true
							}
						}
					}
				}
			},
			orderBy: {
				purchase: {
					createdAt: 'desc'
				}
			},
			skip,
			take: limit
		});

		return json({
			success: true,
			data: purchaseItems.map((item) => ({
				id: item.id,
				quantity: Number(item.quantity),
				unitCost: Number(item.unitCost),
				subtotal: Number(item.subtotal),
				unitMeasure: item.unitMeasure,
				productNameSnapshot: item.productNameSnapshot,
				purchase: {
					id: item.purchase.id,
					purchaseNumber: item.purchase.purchaseNumber,
					status: item.purchase.status,
					total: Number(item.purchase.total),
					createdAt: item.purchase.createdAt,
					supplierName: item.purchase.supplier?.name || 'Sin proveedor',
					userName: item.purchase.user?.name || 'Sistema'
				}
			})),
			pagination: {
				page,
				limit,
				totalCount,
				totalPages: Math.ceil(totalCount / limit),
				hasMore: skip + purchaseItems.length < totalCount
			}
		});
	} catch (error) {
		console.error('Error fetching product purchases:', error);
		return json(
			{
				success: false,
				message: 'Error al obtener compras del producto',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
