import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const startDate = url.searchParams.get('startDate');
		const endDate = url.searchParams.get('endDate');
		const groupBy = url.searchParams.get('groupBy') || 'day'; // day, week, month

		// Crear fechas con zona horaria consistente (Buenos Aires)
		const timeZone = 'America/Argentina/Buenos_Aires';

		// Si no hay fechas, buscar todas las ventas
		let start: Date;
		let end: Date;

		if (!startDate || !endDate) {
			// Buscar la primera y última venta para establecer rango
			const firstSale = await db.sale.findFirst({
				where: { status: 'COMPLETADA' },
				orderBy: { createdAt: 'asc' }
			});
			const lastSale = await db.sale.findFirst({
				where: { status: 'COMPLETADA' },
				orderBy: { createdAt: 'desc' }
			});

			if (firstSale && lastSale) {
				start = new Date(firstSale.createdAt);
				start.setHours(0, 0, 0, 0);
				end = new Date(lastSale.createdAt);
				end.setHours(23, 59, 59, 999);
			} else {
				// No hay ventas, usar rango por defecto (últimos 30 días)
				const today = new Date();
				end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
				start = new Date(today);
				start.setDate(start.getDate() - 30);
				start.setHours(0, 0, 0, 0);
			}
		} else {
			// Convertir a Date en zona horaria local
			start = new Date(startDate + 'T00:00:00.000-03:00');
			end = new Date(endDate + 'T23:59:59.999-03:00');
		}

		// Para debugging: log de las fechas
		console.log('Fechas de filtrado:', {
			startDateParam: startDate,
			endDateParam: endDate,
			startUTC: start.toISOString(),
			endUTC: end.toISOString(),
			startLocal: start.toLocaleString('es-AR', { timeZone }),
			endLocal: end.toLocaleString('es-AR', { timeZone })
		});

		// Función para formatear fecha según agrupación (consistente)
		function formatDate(date: Date, group: string): string {
			// Usar siempre la fecha local de Buenos Aires
			const localDate = new Date(
				date.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' })
			);

			if (group === 'day') {
				return localDate.toISOString().split('T')[0];
			} else if (group === 'week') {
				const startOfWeek = new Date(localDate);
				const day = startOfWeek.getDay();
				const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
				startOfWeek.setDate(diff);
				return startOfWeek.toISOString().split('T')[0];
			} else if (group === 'month') {
				return `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}`;
			}
			return localDate.toISOString().split('T')[0];
		}

		// Obtener ventas con filtrado preciso
		console.log('Buscando ventas entre:', start.toISOString(), 'y', end.toISOString());

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
		interface GroupedSale {
			period: string;
			salesCount: number;
			revenue: number;
			itemsSold: number;
			averageTicket: number;
			sales: Array<{
				id: string;
				saleNumber: number;
				total: number;
				items: number;
				user: string | undefined;
				createdAt: Date;
				saleItems: Array<{
					productName: string;
					quantity: number;
					unitPrice: number;
					subtotal: number;
				}>;
			}>;
		}
		const groupedSales: Record<string, GroupedSale> = {};
		let totalRevenue = 0;
		let totalSales = 0;
		let totalItems = 0;

		// Generar todos los períodos en el rango de fechas
		function generateAllPeriods(startDate: Date, endDate: Date, group: string): string[] {
			const periods: string[] = [];
			const current = new Date(startDate);

			if (group === 'day') {
				while (current <= endDate) {
					periods.push(formatDate(new Date(current), group));
					current.setDate(current.getDate() + 1);
				}
			} else if (group === 'week') {
				while (current <= endDate) {
					const weekStart = new Date(current);
					const day = weekStart.getDay();
					const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
					weekStart.setDate(diff);
					const weekKey = formatDate(weekStart, group);
					if (!periods.includes(weekKey)) {
						periods.push(weekKey);
					}
					current.setDate(current.getDate() + 7);
				}
			} else if (group === 'month') {
				while (current <= endDate) {
					const monthKey = formatDate(new Date(current), group);
					if (!periods.includes(monthKey)) {
						periods.push(monthKey);
					}
					current.setMonth(current.getMonth() + 1);
					current.setDate(1);
				}
			}

			return periods;
		}

		// Inicializar todos los períodos con valores en cero
		const allPeriods = generateAllPeriods(start, end, groupBy);
		for (const period of allPeriods) {
			groupedSales[period] = {
				period,
				salesCount: 0,
				revenue: 0,
				itemsSold: 0,
				averageTicket: 0,
				sales: []
			};
		}

		// Debug: mostrar ventas encontradas
		console.log(`Ventas encontradas: ${sales.length}`);
		console.log('Primera venta:', sales[0] ? new Date(sales[0].createdAt).toISOString() : 'N/A');
		console.log(
			'Última venta:',
			sales[sales.length - 1] ? new Date(sales[sales.length - 1].createdAt).toISOString() : 'N/A'
		);

		// Procesar las ventas y agruparlas
		for (const sale of sales) {
			const saleDate = new Date(sale.createdAt);
			const period = formatDate(saleDate, groupBy);

			// Debug para cada venta
			if (sales.indexOf(sale) < 5) {
				console.log(`Venta ${sale.saleNumber}: fecha=${saleDate.toISOString()}, periodo=${period}`);
			}

			// Verificar que el período exista en groupedSales
			if (!groupedSales[period]) {
				console.error(`Error: período ${period} no encontrado en groupedSales`);
				console.error('Períodos disponibles:', Object.keys(groupedSales));
				continue;
			}

			const saleRevenue = Number(sale.total);
			const saleItems = sale.items.reduce(
				(sum: number, item: (typeof sale.items)[0]) => sum + Number(item.quantity),
				0
			);

			groupedSales[period].salesCount += 1;
			groupedSales[period].revenue += saleRevenue;
			groupedSales[period].itemsSold += saleItems;
			groupedSales[period].sales.push({
				id: sale.id,
				saleNumber: sale.saleNumber,
				total: Number(sale.total),
				items: sale.items.length,
				user: sale.user?.name,
				createdAt: sale.createdAt,
				saleItems: sale.items.map((item: (typeof sale.items)[0]) => ({
					productName: item.product?.name || 'Producto',
					quantity: Number(item.quantity),
					unitPrice: Number(item.unitPrice),
					subtotal: Number(item.subtotal)
				}))
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
