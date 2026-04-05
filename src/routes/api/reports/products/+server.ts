import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const startDate = url.searchParams.get('startDate');
		const endDate = url.searchParams.get('endDate');
		const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : 20;

		// Validar parámetros de fecha
		if (!startDate || !endDate) {
			return json(
				{
					success: false,
					message: 'Las fechas de inicio y fin son requeridas'
				},
				{ status: 400 }
			);
		}

		const start = new Date(startDate);
		const end = new Date(endDate);
		end.setHours(23, 59, 59, 999); // Incluir todo el día final

		// Obtener items de ventas en el período
		const saleItems = await db.saleItem.findMany({
			where: {
				sale: {
					status: 'COMPLETADA',
					createdAt: {
						gte: start,
						lte: end
					}
				}
			},
			include: {
				product: {
					select: {
						id: true,
						name: true,
						category: {
							select: {
								name: true
							}
						}
					}
				},
				sale: {
					select: {
						createdAt: true
					}
				}
			},
			orderBy: {
				quantity: 'desc'
			}
		});

		// Agrupar por producto y calcular estadísticas
		const productStats: Record<string, any> = {};
		let totalRevenue = 0;
		let totalUnits = 0;

		for (const item of saleItems) {
			const productId = item.product.id;
			const quantity = Number(item.quantity);
			const revenue = Number(item.subtotal);

			if (!productStats[productId]) {
				productStats[productId] = {
					id: productId,
					name: item.product.name,
					category: item.product.category?.name || 'Sin categoría',
					totalQuantity: 0,
					totalRevenue: 0,
					averagePrice: 0,
					salesCount: 0,
					firstSale: item.sale.createdAt,
					lastSale: item.sale.createdAt
				};
			}

			productStats[productId].totalQuantity += quantity;
			productStats[productId].totalRevenue += revenue;
			productStats[productId].salesCount += 1;

			// Actualizar fechas de primera y última venta
			if (new Date(item.sale.createdAt) < new Date(productStats[productId].firstSale)) {
				productStats[productId].firstSale = item.sale.createdAt;
			}
			if (new Date(item.sale.createdAt) > new Date(productStats[productId].lastSale)) {
				productStats[productId].lastSale = item.sale.createdAt;
			}

			totalRevenue += revenue;
			totalUnits += quantity;
		}

		// Calcular precio promedio
		for (const productId in productStats) {
			const stats = productStats[productId];
			if (stats.totalQuantity > 0) {
				stats.averagePrice = stats.totalRevenue / stats.totalQuantity;
			}
		}

		// Convertir a array, ordenar por cantidad vendida y limitar
		const topProducts = Object.values(productStats)
			.sort((a: any, b: any) => b.totalQuantity - a.totalQuantity)
			.slice(0, limit);

		// Calcular porcentajes
		for (const product of topProducts) {
			product.quantityPercentage = totalUnits > 0 ? (product.totalQuantity / totalUnits) * 100 : 0;
			product.revenuePercentage = totalRevenue > 0 ? (product.totalRevenue / totalRevenue) * 100 : 0;
		}

		// Estadísticas generales
		const summary = {
			totalProducts: Object.keys(productStats).length,
			totalUnits,
			totalRevenue,
			averageUnitsPerProduct: Object.keys(productStats).length > 0 ? totalUnits / Object.keys(productStats).length : 0,
			averageRevenuePerProduct: Object.keys(productStats).length > 0 ? totalRevenue / Object.keys(productStats).length : 0
		};

		return json({
			success: true,
			data: {
				period: {
					startDate: start.toISOString().split('T')[0],
					endDate: end.toISOString().split('T')[0]
				},
				summary,
				topProducts
			}
		});
	} catch (error) {
		console.error('Error generating products report:', error);
		return json(
			{
				success: false,
				message: 'Error al generar reporte de productos',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
