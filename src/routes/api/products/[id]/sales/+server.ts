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
		const totalCount = await db.saleItem.count({
			where: {
				productId: params.id
			}
		});

		const saleItems = await db.saleItem.findMany({
			where: {
				productId: params.id
			},
			include: {
				sale: {
					select: {
						id: true,
						saleNumber: true,
						status: true,
						total: true,
						paymentMethod: true,
						createdAt: true,
						user: {
							select: {
								name: true
							}
						}
					}
				},
				productSaleFormat: {
					select: {
						unitMeasure: true,
						label: true
					}
				}
			},
			orderBy: {
				sale: {
					createdAt: 'desc'
				}
			},
			skip,
			take: limit
		});

		return json({
			success: true,
			data: saleItems.map((item) => ({
				id: item.id,
				quantity: Number(item.quantity),
				unitPrice: Number(item.unitPrice),
				subtotal: Number(item.subtotal),
				unitMeasure: item.unitMeasure,
				formatLabel: item.formatLabelSnapshot,
				sale: {
					id: item.sale.id,
					saleNumber: item.sale.saleNumber,
					status: item.sale.status,
					total: Number(item.sale.total),
					paymentMethod: item.sale.paymentMethod,
					createdAt: item.sale.createdAt,
					userName: item.sale.user?.name || 'Sistema'
				}
			})),
			pagination: {
				page,
				limit,
				totalCount,
				totalPages: Math.ceil(totalCount / limit),
				hasMore: skip + saleItems.length < totalCount
			}
		});
	} catch (error) {
		console.error('Error fetching product sales:', error);
		return json(
			{
				success: false,
				message: 'Error al obtener ventas del producto',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
