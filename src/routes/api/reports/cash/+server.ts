import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const startDate = url.searchParams.get('startDate');
		const endDate = url.searchParams.get('endDate');

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

		// Obtener ventas completadas en el período
		const sales = await db.sale.findMany({
			where: {
				status: 'COMPLETADA',
				createdAt: {
					gte: start,
					lte: end
				}
			},
			include: {
				items: {
					include: {
						product: {
							select: {
								name: true,
								category: {
									select: {
										name: true
									}
								}
							}
						}
					}
				},
				user: {
					select: {
						id: true,
						name: true
					}
				}
			},
			orderBy: {
				createdAt: 'asc'
			}
		});

		// Agrupar por día
		const dailyData: Record<string, any> = {};
		let totalRevenue = 0;
		let totalSales = 0;
		let totalItems = 0;
		let totalCash = 0;
		let totalTransfer = 0;

		// Estadísticas por método de pago
		const paymentStats: Record<string, any> = {};

		// Estadísticas por vendedor
		const sellerStats: Record<string, any> = {};

		// Estadísticas por categoría
		const categoryStats: Record<string, any> = {};

		for (const sale of sales) {
			const date = sale.createdAt.toISOString().split('T')[0];
			
			// Inicializar día si no existe
			if (!dailyData[date]) {
				dailyData[date] = {
					date,
					salesCount: 0,
					revenue: 0,
					itemsSold: 0,
					cashRevenue: 0,
					transferRevenue: 0,
					averageTicket: 0,
					sellers: {},
					paymentMethods: {},
					categories: {},
					sales: []
				};
			}

			const saleRevenue = Number(sale.total);
			const saleItems = sale.items.reduce((sum, item) => sum + Number(item.quantity), 0);
			const paymentMethod = sale.paymentMethod;
			const sellerName = sale.user?.name || 'Sistema';

			// Actualizar totales del día
			dailyData[date].salesCount += 1;
			dailyData[date].revenue += saleRevenue;
			dailyData[date].itemsSold += saleItems;
			dailyData[date].sales.push({
				id: sale.id,
				saleNumber: sale.saleNumber,
				total: sale.total,
				paymentMethod,
				items: sale.items.length,
				seller: sellerName,
				createdAt: sale.createdAt
			});

			// Actualizar método de pago del día
			if (!dailyData[date].paymentMethods[paymentMethod]) {
				dailyData[date].paymentMethods[paymentMethod] = {
					count: 0,
					amount: 0
				};
			}
			dailyData[date].paymentMethods[paymentMethod].count += 1;
			dailyData[date].paymentMethods[paymentMethod].amount += saleRevenue;

			// Actualizar vendedor del día
			if (!dailyData[date].sellers[sellerName]) {
				dailyData[date].sellers[sellerName] = {
					count: 0,
					amount: 0
				};
			}
			dailyData[date].sellers[sellerName].count += 1;
			dailyData[date].sellers[sellerName].amount += saleRevenue;

			// Actualizar categorías del día
			for (const item of sale.items) {
				const categoryName = item.product.category?.name || 'Sin categoría';
				if (!dailyData[date].categories[categoryName]) {
					dailyData[date].categories[categoryName] = {
						items: 0,
						revenue: 0
					};
				}
				dailyData[date].categories[categoryName].items += Number(item.quantity);
				dailyData[date].categories[categoryName].revenue += Number(item.subtotal);

				// Actualizar método de pago específico
				if (paymentMethod === 'EFECTIVO') {
					dailyData[date].cashRevenue += Number(item.subtotal);
				} else {
					dailyData[date].transferRevenue += Number(item.subtotal);
				}
			}

			// Actualizar totales generales
			totalRevenue += saleRevenue;
			totalSales += 1;
			totalItems += saleItems;

			// Actualizar método de pago general
			if (!paymentStats[paymentMethod]) {
				paymentStats[paymentMethod] = {
					count: 0,
					amount: 0,
					percentage: 0
				};
			}
			paymentStats[paymentMethod].count += 1;
			paymentStats[paymentMethod].amount += saleRevenue;

			// Actualizar vendedor general
			if (!sellerStats[sellerName]) {
				sellerStats[sellerName] = {
					count: 0,
					amount: 0,
					averageTicket: 0
				};
			}
			sellerStats[sellerName].count += 1;
			sellerStats[sellerName].amount += saleRevenue;

			// Actualizar categoría general
			for (const item of sale.items) {
				const categoryName = item.product.category?.name || 'Sin categoría';
				if (!categoryStats[categoryName]) {
					categoryStats[categoryName] = {
						items: 0,
						revenue: 0
					};
				}
				categoryStats[categoryName].items += Number(item.quantity);
				categoryStats[categoryName].revenue += Number(item.subtotal);
			}
		}

		// Calcular ticket promedio por día
		for (const date in dailyData) {
			if (dailyData[date].salesCount > 0) {
				dailyData[date].averageTicket = dailyData[date].revenue / dailyData[date].salesCount;
			}
		}

		// Calcular porcentajes de métodos de pago
		for (const method in paymentStats) {
			paymentStats[method].percentage = totalRevenue > 0 ? (paymentStats[method].amount / totalRevenue) * 100 : 0;
		}

		// Calcular ticket promedio por vendedor
		for (const seller in sellerStats) {
			if (sellerStats[seller].count > 0) {
				sellerStats[seller].averageTicket = sellerStats[seller].amount / sellerStats[seller].count;
			}
		}

		// Convertir a array y ordenar
		const reportData = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

		// Resumen general
		const summary = {
			totalSales,
			totalRevenue,
			totalItems,
			averageTicket: totalSales > 0 ? totalRevenue / totalSales : 0,
			paymentMethods: paymentStats,
			topSellers: Object.values(sellerStats)
				.sort((a: any, b: any) => b.amount - a.amount)
				.slice(0, 5),
			topCategories: Object.values(categoryStats)
				.sort((a: any, b: any) => b.revenue - a.revenue)
				.slice(0, 5)
		};

		return json({
			success: true,
			data: {
				period: {
					startDate: start.toISOString().split('T')[0],
					endDate: end.toISOString().split('T')[0]
				},
				summary,
				dailyData: reportData
			}
		});
	} catch (error) {
		console.error('Error generating cash register report:', error);
		return json(
			{
				success: false,
				message: 'Error al generar reporte de caja',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
