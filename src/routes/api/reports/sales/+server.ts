import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const startDate = url.searchParams.get('startDate');
		const endDate = url.searchParams.get('endDate');
		const groupBy = url.searchParams.get('groupBy') || 'day'; // day, week, month

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

		// Función para formatear fecha según agrupación
		function formatDate(date: Date, group: string): string {
			if (group === 'day') {
				return date.toISOString().split('T')[0];
			} else if (group === 'week') {
				const startOfWeek = new Date(date);
				const day = startOfWeek.getDay();
				const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
				startOfWeek.setDate(diff);
				return startOfWeek.toISOString().split('T')[0];
			} else if (group === 'month') {
				return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			}
			return date.toISOString().split('T')[0];
		}

		// Obtener ventas agrupadas
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
								name: true
							}
						}
					}
				},
				user: {
					select: {
						name: true
					}
				}
			},
			orderBy: {
				createdAt: 'asc'
			}
		});

		// Agrupar ventas por período
		const groupedSales: Record<string, any> = {};
		let totalRevenue = 0;
		let totalSales = 0;
		let totalItems = 0;

		for (const sale of sales) {
			const period = formatDate(new Date(sale.createdAt), groupBy);

			if (!groupedSales[period]) {
				groupedSales[period] = {
					period,
					salesCount: 0,
					revenue: 0,
					itemsSold: 0,
					averageTicket: 0,
					sales: []
				};
			}

			const saleRevenue = Number(sale.total);
			const saleItems = sale.items.reduce((sum, item) => sum + Number(item.quantity), 0);

			groupedSales[period].salesCount += 1;
			groupedSales[period].revenue += saleRevenue;
			groupedSales[period].itemsSold += saleItems;
			groupedSales[period].sales.push({
				id: sale.id,
				saleNumber: sale.saleNumber,
				total: sale.total,
				items: sale.items.length,
				user: sale.user?.name,
				createdAt: sale.createdAt
			});

			totalRevenue += saleRevenue;
			totalSales += 1;
			totalItems += saleItems;
		}

		// Calcular ticket promedio por período
		for (const period in groupedSales) {
			if (groupedSales[period].salesCount > 0) {
				groupedSales[period].averageTicket =
					groupedSales[period].revenue / groupedSales[period].salesCount;
			}
		}

		// Convertir a array y ordenar
		const reportData = Object.values(groupedSales).sort((a, b) => a.period.localeCompare(b.period));

		// Estadísticas generales
		const overallAverageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

		return json({
			success: true,
			data: {
				period: groupBy,
				startDate: start.toISOString().split('T')[0],
				endDate: end.toISOString().split('T')[0],
				summary: {
					totalSales,
					totalRevenue,
					totalItems,
					averageTicket: overallAverageTicket
				},
				dailyData: reportData
			}
		});
	} catch (error) {
		console.error('Error generating sales report:', error);
		return json(
			{
				success: false,
				message: 'Error al generar reporte de ventas',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
