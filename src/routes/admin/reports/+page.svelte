<script lang="ts">
	import { onMount } from 'svelte';

	let loading = $state(true);
	let error = $state('');
	let activeTab = $state('sales');

	// Filtros de fecha
	let dateRange = $state({
		startDate: '',
		endDate: ''
	});

	// Datos de reportes
	let salesData = $state<any>(null);
	let productsData = $state<any>(null);
	let cashData = $state<any>(null);

	// Configuración de gráficos
	let chartConfig = $state({
		sales: {
			groupBy: 'day'
		},
		products: {
			limit: 20
		}
	});

	onMount(() => {
		// Establecer fechas por defecto (últimos 30 días)
		const today = new Date();
		const thirtyDaysAgo = new Date(today);
		thirtyDaysAgo.setDate(today.getDate() - 30);

		dateRange.startDate = thirtyDaysAgo.toISOString().split('T')[0];
		dateRange.endDate = today.toISOString().split('T')[0];

		loadReports();
	});

	async function loadReports() {
		if (!dateRange.startDate || !dateRange.endDate) {
			error = 'Seleccione un rango de fechas';
			return;
		}

		loading = true;
		error = '';

		try {
			const [salesRes, productsRes, cashRes] = await Promise.all([
				fetch(`/api/reports/sales?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&groupBy=${chartConfig.sales.groupBy}`),
				fetch(`/api/reports/products?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&limit=${chartConfig.products.limit}`),
				fetch(`/api/reports/cash?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`)
			]);

			const salesResult = await salesRes.json();
			const productsResult = await productsRes.json();
			const cashResult = await cashRes.json();

			if (salesResult.success) salesData = salesResult.data;
			else error = salesResult.message;

			if (productsResult.success) productsData = productsResult.data;
			else error = productsResult.message;

			if (cashResult.success) cashData = cashResult.data;
			else error = cashResult.message;

		} catch {
			error = 'Error al cargar reportes';
		} finally {
			loading = false;
		}
	}

	function formatCurrency(amount: number | string) {
		return new Intl.NumberFormat('es-AR', {
			style: 'currency',
			currency: 'ARS'
		}).format(Number(amount));
	}

	function formatNumber(num: number) {
		return new Intl.NumberFormat('es-AR').format(num);
	}

	function getPaymentMethodLabel(method: string) {
		const labels: Record<string, string> = {
			'EFECTIVO': 'Efectivo',
			'TRANSFERENCIA': 'Transferencia'
		};
		return labels[method] || method;
	}

	function getPaymentMethodColor(method: string) {
		return method === 'EFECTIVO' ? 'green' : 'blue';
	}
</script>

<div class="min-h-screen bg-gray-50 p-6">
	<div class="max-w-7xl mx-auto">
		<div class="mb-6">
			<h1 class="text-3xl font-bold text-gray-900">Reportes y Estadísticas</h1>
			<p class="text-gray-600 mt-2">Análisis detallado de ventas, productos y caja</p>
		</div>

		<!-- Filtros -->
		<div class="bg-white rounded-lg shadow p-4 mb-6">
			<div class="flex flex-wrap gap-4 items-end">
				<div>
					<label for="start-date" class="block text-sm font-medium text-gray-700 mb-1">
						Fecha Inicio
					</label>
					<input
						id="start-date"
						type="date"
						bind:value={dateRange.startDate}
						class="px-3 py-2 border border-gray-300 rounded-md"
					/>
				</div>
				<div>
					<label for="end-date" class="block text-sm font-medium text-gray-700 mb-1">
						Fecha Fin
					</label>
					<input
						id="end-date"
						type="date"
						bind:value={dateRange.endDate}
						class="px-3 py-2 border border-gray-300 rounded-md"
					/>
				</div>
				<div>
					<label for="sales-group" class="block text-sm font-medium text-gray-700 mb-1">
						Agrupar Ventas por
					</label>
					<select id="sales-group" bind:value={chartConfig.sales.groupBy} class="px-3 py-2 border border-gray-300 rounded-md">
						<option value="day">Día</option>
						<option value="week">Semana</option>
						<option value="month">Mes</option>
					</select>
				</div>
				<div>
					<label for="products-limit" class="block text-sm font-medium text-gray-700 mb-1">
						Top Productos
					</label>
					<select id="products-limit" bind:value={chartConfig.products.limit} class="px-3 py-2 border border-gray-300 rounded-md">
						<option value="10">Top 10</option>
						<option value="20">Top 20</option>
						<option value="50">Top 50</option>
					</select>
				</div>
				<button
					onclick={loadReports}
					class="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
				>
					Actualizar Reportes
				</button>
			</div>
		</div>

		{#if loading}
			<div class="text-center py-8">
				<div class="text-gray-500">Cargando reportes...</div>
			</div>
		{:else if error}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4">
				<div class="text-red-600">{error}</div>
				<button onclick={loadReports} class="mt-2 text-red-600 underline">
					Reintentar
				</button>
			</div>
		{:else}
			<!-- Tabs -->
			<div class="border-b border-gray-200 mb-6">
				<nav class="flex space-x-8">
					<button
						onclick={() => activeTab = 'sales'}
						class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'sales' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						Ventas por Día
					</button>
					<button
						onclick={() => activeTab = 'products'}
						class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'products' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						Productos más Vendidos
					</button>
					<button
						onclick={() => activeTab = 'cash'}
						class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'cash' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						Caja Diaria
					</button>
				</nav>
			</div>

			<!-- Tab Content -->
			{#if activeTab === 'sales' && salesData}
				<div class="space-y-6">
					<!-- Summary Cards -->
					<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div class="bg-white rounded-lg shadow p-6">
							<div class="text-sm font-medium text-gray-600">Total Ventas</div>
							<div class="text-2xl font-bold text-gray-900">{formatNumber(salesData.summary.totalSales)}</div>
						</div>
						<div class="bg-white rounded-lg shadow p-6">
							<div class="text-sm font-medium text-gray-600">Ingresos Totales</div>
							<div class="text-2xl font-bold text-green-600">{formatCurrency(salesData.summary.totalRevenue)}</div>
						</div>
						<div class="bg-white rounded-lg shadow p-6">
							<div class="text-sm font-medium text-gray-600">Tickets Promedio</div>
							<div class="text-2xl font-bold text-blue-600">{formatCurrency(salesData.summary.averageTicket)}</div>
						</div>
						<div class="bg-white rounded-lg shadow p-6">
							<div class="text-sm font-medium text-gray-600">Unidades Vendidas</div>
							<div class="text-2xl font-bold text-purple-600">{formatNumber(salesData.summary.totalItems)}</div>
						</div>
					</div>

					<!-- Sales Table -->
					<div class="bg-white shadow rounded-lg overflow-hidden">
						<div class="px-6 py-4 border-b border-gray-200">
							<h2 class="text-lg font-semibold text-gray-900">Ventas por {chartConfig.sales.groupBy === 'day' ? 'Día' : chartConfig.sales.groupBy === 'week' ? 'Semana' : 'Mes'}</h2>
						</div>
						<div class="overflow-x-auto">
							<table class="min-w-full divide-y divide-gray-200">
								<thead class="bg-gray-50">
									<tr>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											Período
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											Ventas
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											Ingresos
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											Ticket Promedio
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											Unidades
										</th>
									</tr>
								</thead>
								<tbody class="bg-white divide-y divide-gray-200">
									{#each salesData.dailyData as day (day.period)}
										<tr class="hover:bg-gray-50">
											<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{day.period}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{formatNumber(day.salesCount)}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
												{formatCurrency(day.revenue)}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
												{formatCurrency(day.averageTicket)}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
												{formatNumber(day.itemsSold)}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			{:else if activeTab === 'products' && productsData}
				<div class="space-y-6">
					<!-- Summary Cards -->
					<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div class="bg-white rounded-lg shadow p-6">
							<div class="text-sm font-medium text-gray-600">Productos Vendidos</div>
							<div class="text-2xl font-bold text-gray-900">{formatNumber(productsData.summary.totalProducts)}</div>
						</div>
						<div class="bg-white rounded-lg shadow p-6">
							<div class="text-sm font-medium text-gray-600">Total Unidades</div>
							<div class="text-2xl font-bold text-purple-600">{formatNumber(productsData.summary.totalUnits)}</div>
						</div>
						<div class="bg-white rounded-lg shadow p-6">
							<div class="text-sm font-medium text-gray-600">Ingresos Totales</div>
							<div class="text-2xl font-bold text-green-600">{formatCurrency(productsData.summary.totalRevenue)}</div>
						</div>
						<div class="bg-white rounded-lg shadow p-6">
							<div class="text-sm font-medium text-gray-600">Promedio por Producto</div>
							<div class="text-2xl font-bold text-blue-600">{formatCurrency(productsData.summary.averageRevenuePerProduct)}</div>
						</div>
					</div>

					<!-- Top Products Table -->
					<div class="bg-white shadow rounded-lg overflow-hidden">
						<div class="px-6 py-4 border-b border-gray-200">
							<h2 class="text-lg font-semibold text-gray-900">Top {chartConfig.products.limit} Productos más Vendidos</h2>
						</div>
						<div class="overflow-x-auto">
							<table class="min-w-full divide-y divide-gray-200">
								<thead class="bg-gray-50">
									<tr>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											Producto
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											Categoría
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											Unidades
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											Ingresos
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											Precio Promedio
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											% del Total
										</th>
									</tr>
								</thead>
								<tbody class="bg-white divide-y divide-gray-200">
									{#each productsData.topProducts as product (product.id)}
										<tr class="hover:bg-gray-50">
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="text-sm font-medium text-gray-900">{product.name}</div>
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
													{product.category}
												</span>
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
												{formatNumber(product.totalQuantity)}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
												{formatCurrency(product.totalRevenue)}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
												{formatCurrency(product.averagePrice)}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
												{product.quantityPercentage.toFixed(1)}%
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			{:else if activeTab === 'cash' && cashData}
				<div class="space-y-6">
					<!-- Summary Cards -->
					<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
						<div class="bg-white rounded-lg shadow p-6">
							<div class="text-sm font-medium text-gray-600">Total Ventas</div>
							<div class="text-2xl font-bold text-gray-900">{formatNumber(cashData.summary.totalSales)}</div>
						</div>
						<div class="bg-white rounded-lg shadow p-6">
							<div class="text-sm font-medium text-gray-600">Ingresos Totales</div>
							<div class="text-2xl font-bold text-green-600">{formatCurrency(cashData.summary.totalRevenue)}</div>
						</div>
						<div class="bg-white rounded-lg shadow p-6">
							<div class="text-sm font-medium text-gray-600">Ticket Promedio</div>
							<div class="text-2xl font-bold text-blue-600">{formatCurrency(cashData.summary.averageTicket)}</div>
						</div>
						<div class="bg-white rounded-lg shadow p-6">
							<div class="text-sm font-medium text-gray-600">Unidades Vendidas</div>
							<div class="text-2xl font-bold text-purple-600">{formatNumber(cashData.summary.totalItems)}</div>
						</div>
					</div>

					<!-- Payment Methods -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="bg-white shadow rounded-lg overflow-hidden">
							<div class="px-6 py-4 border-b border-gray-200">
								<h2 class="text-lg font-semibold text-gray-900">Métodos de Pago</h2>
							</div>
							<div class="p-6">
								{#each Object.entries(cashData.summary.paymentMethods) as [method, stats]}
									{@const color = getPaymentMethodColor(method)}
									<div class="flex justify-between items-center mb-3">
										<span class="text-sm font-medium text-gray-900">
											{getPaymentMethodLabel(method)}
										</span>
										<div class="text-right">
											<div class="text-sm font-bold text-{color}-600">
												{formatCurrency((stats as any).amount)}
											</div>
											<div class="text-xs text-gray-500">
												{(stats as any).count} ventas ({(stats as any).percentage.toFixed(1)}%)
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>

						<div class="bg-white shadow rounded-lg overflow-hidden">
							<div class="px-6 py-4 border-b border-gray-200">
								<h2 class="text-lg font-semibold text-gray-900">Top Vendedores</h2>
							</div>
							<div class="p-6">
								{#each cashData.summary.topSellers as seller}
									<div class="flex justify-between items-center mb-3">
										<span class="text-sm font-medium text-gray-900">{seller.name}</span>
										<div class="text-right">
											<div class="text-sm font-bold text-green-600">
												{formatCurrency(seller.amount)}
											</div>
											<div class="text-xs text-gray-500">
												{seller.count} ventas ({formatCurrency(seller.averageTicket)} promedio)
											</div>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</div>

					<!-- Daily Cash Table -->
					<div class="bg-white shadow rounded-lg overflow-hidden">
						<div class="px-6 py-4 border-b border-gray-200">
							<h2 class="text-lg font-semibold text-gray-900">Resumen Diario de Caja</h2>
						</div>
						<div class="overflow-x-auto">
							<table class="min-w-full divide-y divide-gray-200">
								<thead class="bg-gray-50">
									<tr>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											Fecha
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											Ventas
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											Ingresos
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											Efectivo
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											Transferencia
										</th>
										<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
											Ticket Promedio
										</th>
									</tr>
								</thead>
								<tbody class="bg-white divide-y divide-gray-200">
									{#each cashData.dailyData as day (day.date)}
										<tr class="hover:bg-gray-50">
											<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{day.date}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{formatNumber(day.salesCount)}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
												{formatCurrency(day.revenue)}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-green-600">
												{formatCurrency(day.cashRevenue)}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
												{formatCurrency(day.transferRevenue)}
											</td>
											<td class="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
												{formatCurrency(day.averageTicket)}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>
