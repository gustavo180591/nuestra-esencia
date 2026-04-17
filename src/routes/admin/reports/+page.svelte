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

	// Opciones de fecha predefinidas
	const datePresets = [
		{ label: 'Hoy', days: 0 },
		{ label: 'Ayer', days: 1 },
		{ label: 'Últimos 3 días', days: 3 },
		{ label: 'Últimos 7 días', days: 7 },
		{ label: 'Últimos 15 días', days: 15 },
		{ label: 'Últimos 30 días', days: 30 },
		{ label: 'Este mes', days: 'month' },
		{ label: 'Mes pasado', days: 'lastMonth' },
		{ label: 'Este año', days: 'year' }
	];

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

	// Fila expandida en reportes
	let expandedPeriod = $state<string | null>(null);

	function togglePeriod(period: string) {
		expandedPeriod = expandedPeriod === period ? null : period;
	}

	// Función para aplicar preset de fecha
	function applyDatePreset(preset: (typeof datePresets)[0]) {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		if (preset.days === 'month') {
			// Primer día del mes actual
			const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
			dateRange.startDate = firstDay.toISOString().split('T')[0];
			dateRange.endDate = today.toISOString().split('T')[0];
		} else if (preset.days === 'lastMonth') {
			// Mes pasado
			const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
			const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
			dateRange.startDate = lastMonth.toISOString().split('T')[0];
			dateRange.endDate = lastMonthEnd.toISOString().split('T')[0];
		} else if (preset.days === 'year') {
			// Año actual
			const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
			dateRange.startDate = firstDayOfYear.toISOString().split('T')[0];
			dateRange.endDate = today.toISOString().split('T')[0];
		} else {
			// Días específicos
			const startDate = new Date(today);
			startDate.setDate(today.getDate() - (preset.days as number));
			dateRange.startDate = startDate.toISOString().split('T')[0];
			dateRange.endDate = today.toISOString().split('T')[0];
		}

		loadReports();
	}

	onMount(() => {
		// Establecer fechas por defecto (últimos 7 días para incluir hoy)
		applyDatePreset({ label: 'Últimos 7 días', days: 7 });

		// Actualizar fecha y hora actual cada segundo
		updateDateTime();
		setInterval(updateDateTime, 1000);
	});

	function updateDateTime() {
		const now = new Date();
		// Formatear para Buenos Aires (UTC-3)
		const options: Intl.DateTimeFormatOptions = {
			timeZone: 'America/Argentina/Buenos_Aires',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false
		};

		const dateTimeElement = document.getElementById('current-datetime');
		if (dateTimeElement) {
			dateTimeElement.textContent = now.toLocaleString('es-AR', options);
		}
	}

	async function loadReports() {
		if (!dateRange.startDate || !dateRange.endDate) {
			error = 'Seleccione un rango de fechas';
			return;
		}

		loading = true;
		error = '';

		try {
			const [salesRes, productsRes, cashRes] = await Promise.all([
				fetch(
					`/api/reports/sales?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&groupBy=${chartConfig.sales.groupBy}`
				),
				fetch(
					`/api/reports/products?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&limit=${chartConfig.products.limit}`
				),
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
			EFECTIVO: 'Efectivo',
			TRANSFERENCIA: 'Transferencia'
		};
		return labels[method] || method;
	}

	function getPaymentMethodColor(method: string) {
		return method === 'EFECTIVO' ? 'green' : 'blue';
	}
</script>

<div class="min-h-screen bg-gray-50 p-6">
	<div class="mx-auto max-w-7xl">
		<div class="mb-6">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Reportes y Estadísticas</h1>
					<p class="mt-2 text-gray-600">Análisis detallado de ventas, productos y caja</p>
				</div>
				<div class="text-right">
					<div class="text-sm text-gray-500">Fecha y hora actual (Buenos Aires)</div>
					<div class="text-lg font-semibold text-gray-700" id="current-datetime"></div>
				</div>
			</div>
		</div>

		<!-- Filtros -->
		<div class="mb-6 rounded-lg bg-white p-4 shadow">
			<div class="mb-4">
				<h3 class="mb-3 text-sm font-semibold text-gray-900">Período Rápido</h3>
				<div class="flex flex-wrap gap-2">
					{#each datePresets as preset}
						<button
							onclick={() => applyDatePreset(preset)}
							class="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 transition-colors hover:border-amber-500 hover:bg-gray-50 hover:text-amber-700"
						>
							{preset.label}
						</button>
					{/each}
				</div>
			</div>

			<div class="border-t pt-4">
				<h3 class="mb-3 text-sm font-semibold text-gray-900">Filtros Personalizados</h3>
				<div class="flex flex-wrap items-end gap-4">
					<div>
						<label for="start-date" class="mb-1 block text-sm font-medium text-gray-700">
							Fecha Inicio
						</label>
						<input
							id="start-date"
							type="date"
							bind:value={dateRange.startDate}
							class="rounded-md border border-gray-300 px-3 py-2 text-gray-900"
						/>
					</div>
					<div>
						<label for="end-date" class="mb-1 block text-sm font-medium text-gray-700">
							Fecha Fin
						</label>
						<input
							id="end-date"
							type="date"
							bind:value={dateRange.endDate}
							class="rounded-md border border-gray-300 px-3 py-2 text-gray-900"
						/>
					</div>
					<div>
						<label for="sales-group" class="mb-1 block text-sm font-medium text-gray-700">
							Agrupar Ventas por
						</label>
						<select
							id="sales-group"
							bind:value={chartConfig.sales.groupBy}
							class="rounded-md border border-gray-300 px-3 py-2 text-gray-900"
						>
							<option value="day">Día</option>
							<option value="week">Semana</option>
							<option value="month">Mes</option>
						</select>
					</div>
					<div>
						<label for="products-limit" class="mb-1 block text-sm font-medium text-gray-700">
							Top Productos
						</label>
						<select
							id="products-limit"
							bind:value={chartConfig.products.limit}
							class="rounded-md border border-gray-300 px-3 py-2 text-gray-900"
						>
							<option value="10">Top 10</option>
							<option value="20">Top 20</option>
							<option value="50">Top 50</option>
						</select>
					</div>
					<button
						onclick={loadReports}
						class="rounded-md bg-amber-600 px-4 py-2 text-white transition-colors hover:bg-amber-700"
					>
						Actualizar Reportes
					</button>
				</div>
			</div>
		</div>

		{#if loading}
			<div class="py-8 text-center">
				<div class="text-gray-500">Cargando reportes...</div>
			</div>
		{:else if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4">
				<div class="text-red-600">{error}</div>
				<button onclick={loadReports} class="mt-2 text-red-600 underline"> Reintentar </button>
			</div>
		{:else}
			<!-- Tabs -->
			<div class="mb-6 border-b border-gray-200">
				<nav class="flex space-x-8">
					<button
						onclick={() => (activeTab = 'sales')}
						class="border-b-2 px-1 py-2 text-sm font-medium {activeTab === 'sales'
							? 'border-amber-500 text-amber-600'
							: 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						Ventas por Día
					</button>
					<button
						onclick={() => (activeTab = 'products')}
						class="border-b-2 px-1 py-2 text-sm font-medium {activeTab === 'products'
							? 'border-amber-500 text-amber-600'
							: 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						Productos más Vendidos
					</button>
					<button
						onclick={() => (activeTab = 'cash')}
						class="border-b-2 px-1 py-2 text-sm font-medium {activeTab === 'cash'
							? 'border-amber-500 text-amber-600'
							: 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						Caja Diaria
					</button>
				</nav>
			</div>

			<!-- Tab Content -->
			{#if activeTab === 'sales' && salesData}
				<div class="space-y-6">
					<!-- Summary Cards -->
					<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
						<div class="rounded-lg bg-white p-6 shadow">
							<div class="text-sm font-medium text-gray-600">Total Ventas</div>
							<div class="text-2xl font-bold text-gray-900">
								{formatNumber(salesData.summary.totalSales)}
							</div>
						</div>
						<div class="rounded-lg bg-white p-6 shadow">
							<div class="text-sm font-medium text-gray-600">Ingresos Totales</div>
							<div class="text-2xl font-bold text-green-600">
								{formatCurrency(salesData.summary.totalRevenue)}
							</div>
						</div>
						<div class="rounded-lg bg-white p-6 shadow">
							<div class="text-sm font-medium text-gray-600">Tickets Promedio</div>
							<div class="text-2xl font-bold text-blue-600">
								{formatCurrency(salesData.summary.averageTicket)}
							</div>
						</div>
						<div class="rounded-lg bg-white p-6 shadow">
							<div class="text-sm font-medium text-gray-600">Unidades Vendidas</div>
							<div class="text-2xl font-bold text-purple-600">
								{formatNumber(salesData.summary.totalItems)}
							</div>
						</div>
					</div>

					<!-- Sales Table -->
					<div class="overflow-hidden rounded-lg bg-white shadow">
						<div class="border-b border-gray-200 px-6 py-4">
							<h2 class="text-lg font-semibold text-gray-900">
								Ventas por {chartConfig.sales.groupBy === 'day'
									? 'Día'
									: chartConfig.sales.groupBy === 'week'
										? 'Semana'
										: 'Mes'}
							</h2>
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
								<tbody class="divide-y divide-gray-200 bg-white">
									{#each salesData.dailyData as day (day.period)}
										<tr
											class="cursor-pointer hover:bg-gray-50 {expandedPeriod === day.period
												? 'bg-amber-50'
												: ''}"
											onclick={() => togglePeriod(day.period)}
										>
											<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
												<div class="flex items-center gap-2">
													<span
														class="transform transition-transform {expandedPeriod === day.period
															? 'rotate-90'
															: ''}">▶</span
													>
													{day.period}
												</div>
											</td>
											<td class="px-6 py-4 text-sm whitespace-nowrap">
												<span
													class={day.salesCount === 0
														? 'font-medium text-gray-400'
														: 'text-gray-900'}
												>
													{formatNumber(day.salesCount)}
												</span>
											</td>
											<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
												<span class={day.revenue === 0 ? 'text-gray-400' : 'text-green-600'}>
													{formatCurrency(day.revenue)}
												</span>
											</td>
											<td class="px-6 py-4 text-sm whitespace-nowrap">
												<span class={day.averageTicket === 0 ? 'text-gray-400' : 'text-blue-600'}>
													{formatCurrency(day.averageTicket)}
												</span>
											</td>
											<td class="px-6 py-4 text-sm whitespace-nowrap">
												<span class={day.itemsSold === 0 ? 'text-gray-400' : 'text-purple-600'}>
													{formatNumber(day.itemsSold)}
												</span>
											</td>
										</tr>
										{#if expandedPeriod === day.period}
											<tr class="bg-gray-50">
												<td colspan="5" class="px-6 py-4">
													<div class="space-y-3">
														<div class="mb-2 text-sm font-medium text-gray-700">
															Ventas del {day.period} ({day.sales.length} ventas)
														</div>
														<div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
															{#each day.sales as sale (sale.id)}
																<div class="rounded-lg border bg-white p-3 shadow-sm">
																	<div class="mb-2 flex items-center justify-between">
																		<span class="font-medium text-gray-800">
																			Venta #{sale.saleNumber}
																		</span>
																		<span class="text-sm font-medium text-green-600">
																			{formatCurrency(sale.total)}
																		</span>
																	</div>
																	<div class="mb-2 text-xs text-gray-500">
																		Vendedor: {sale.user}
																	</div>
																	<div class="space-y-1 border-t pt-2">
																		{#each sale.saleItems as item (item.productName + item.quantity)}
																			<div class="flex items-center justify-between text-xs">
																				<span class="text-gray-700">{item.productName}</span>
																				<span class="text-gray-500">×{item.quantity}</span>
																			</div>
																		{/each}
																	</div>
																</div>
															{/each}
														</div>
													</div>
												</td>
											</tr>
										{/if}
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			{:else if activeTab === 'products' && productsData}
				<div class="space-y-6">
					<!-- Summary Cards -->
					<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
						<div class="rounded-lg bg-white p-6 shadow">
							<div class="text-sm font-medium text-gray-600">Productos Vendidos</div>
							<div class="text-2xl font-bold text-gray-900">
								{formatNumber(productsData.summary.totalProducts)}
							</div>
						</div>
						<div class="rounded-lg bg-white p-6 shadow">
							<div class="text-sm font-medium text-gray-600">Total Unidades</div>
							<div class="text-2xl font-bold text-purple-600">
								{formatNumber(productsData.summary.totalUnits)}
							</div>
						</div>
						<div class="rounded-lg bg-white p-6 shadow">
							<div class="text-sm font-medium text-gray-600">Ingresos Totales</div>
							<div class="text-2xl font-bold text-green-600">
								{formatCurrency(productsData.summary.totalRevenue)}
							</div>
						</div>
						<div class="rounded-lg bg-white p-6 shadow">
							<div class="text-sm font-medium text-gray-600">Promedio por Producto</div>
							<div class="text-2xl font-bold text-blue-600">
								{formatCurrency(productsData.summary.averageRevenuePerProduct)}
							</div>
						</div>
					</div>

					<!-- Top Products Table -->
					<div class="overflow-hidden rounded-lg bg-white shadow">
						<div class="border-b border-gray-200 px-6 py-4">
							<h2 class="text-lg font-semibold text-gray-900">
								Top {chartConfig.products.limit} Productos más Vendidos
							</h2>
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
								<tbody class="divide-y divide-gray-200 bg-white">
									{#each productsData.topProducts as product (product.id)}
										<tr class="hover:bg-gray-50">
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="text-sm font-medium text-gray-900">{product.name}</div>
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<span
													class="inline-flex rounded-full bg-blue-100 px-2 text-xs leading-5 font-semibold text-blue-800"
												>
													{product.category}
												</span>
											</td>
											<td class="px-6 py-4 text-sm font-medium whitespace-nowrap text-purple-600">
												{formatNumber(product.totalQuantity)}
											</td>
											<td class="px-6 py-4 text-sm font-medium whitespace-nowrap text-green-600">
												{formatCurrency(product.totalRevenue)}
											</td>
											<td class="px-6 py-4 text-sm whitespace-nowrap text-blue-600">
												{formatCurrency(product.averagePrice)}
											</td>
											<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-600">
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
					<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
						<div class="rounded-lg bg-white p-6 shadow">
							<div class="text-sm font-medium text-gray-600">Total Ventas</div>
							<div class="text-2xl font-bold text-gray-900">
								{formatNumber(cashData.summary.totalSales)}
							</div>
						</div>
						<div class="rounded-lg bg-white p-6 shadow">
							<div class="text-sm font-medium text-gray-600">Ingresos Totales</div>
							<div class="text-2xl font-bold text-green-600">
								{formatCurrency(cashData.summary.totalRevenue)}
							</div>
						</div>
						<div class="rounded-lg bg-white p-6 shadow">
							<div class="text-sm font-medium text-gray-600">Ticket Promedio</div>
							<div class="text-2xl font-bold text-blue-600">
								{formatCurrency(cashData.summary.averageTicket)}
							</div>
						</div>
						<div class="rounded-lg bg-white p-6 shadow">
							<div class="text-sm font-medium text-gray-600">Unidades Vendidas</div>
							<div class="text-2xl font-bold text-purple-600">
								{formatNumber(cashData.summary.totalItems)}
							</div>
						</div>
					</div>

					<!-- Payment Methods -->
					<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div class="overflow-hidden rounded-lg bg-white shadow">
							<div class="border-b border-gray-200 px-6 py-4">
								<h2 class="text-lg font-semibold text-gray-900">Métodos de Pago</h2>
							</div>
							<div class="p-6">
								{#each Object.entries(cashData.summary.paymentMethods) as [method, stats]}
									{@const color = getPaymentMethodColor(method)}
									<div class="mb-3 flex items-center justify-between">
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

						<div class="overflow-hidden rounded-lg bg-white shadow">
							<div class="border-b border-gray-200 px-6 py-4">
								<h2 class="text-lg font-semibold text-gray-900">Top Vendedores</h2>
							</div>
							<div class="p-6">
								{#each cashData.summary.topSellers as seller (seller.name)}
									<div class="mb-3 flex items-center justify-between">
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
					<div class="overflow-hidden rounded-lg bg-white shadow">
						<div class="border-b border-gray-200 px-6 py-4">
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
								<tbody class="divide-y divide-gray-200 bg-white">
									{#each cashData.dailyData as day (day.date)}
										<tr class="hover:bg-gray-50">
											<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
												{day.date}
											</td>
											<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
												{formatNumber(day.salesCount)}
											</td>
											<td class="px-6 py-4 text-sm font-medium whitespace-nowrap text-green-600">
												{formatCurrency(day.revenue)}
											</td>
											<td class="px-6 py-4 text-sm whitespace-nowrap text-green-600">
												{formatCurrency(day.cashRevenue)}
											</td>
											<td class="px-6 py-4 text-sm whitespace-nowrap text-blue-600">
												{formatCurrency(day.transferRevenue)}
											</td>
											<td class="px-6 py-4 text-sm whitespace-nowrap text-blue-600">
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
