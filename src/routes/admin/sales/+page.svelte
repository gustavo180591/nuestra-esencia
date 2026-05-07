<script lang="ts">
	import { onMount } from 'svelte';

	interface Sale {
		id: string;
		saleNumber: number;
		status: 'COMPLETADA' | 'CANCELADA';
		total: string;
		paymentMethodId: string;
		paymentMethod?: {
			code: string;
			name: string;
			icon: string;
		};
		items: Array<{
			id: string;
			productNameSnapshot: string;
			quantity: number;
			unitPrice: string;
			unitCost: string;
			subtotal: string;
		}>;
		createdAt: string;
	}

	interface Purchase {
		id: string;
		purchaseNumber: number;
		supplierName: string;
		total: string;
		status: string;
		createdAt: string;
		items: Array<{
			productNameSnapshot: string;
			quantity: number;
			unitCost: string;
			subtotal: string;
		}>;
	}

	let sales = $state<Sale[]>([]);
	let purchases = $state<Purchase[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showDetailModal = $state(false);
	let selectedSale = $state<Sale | null>(null);
	let cancellingSaleId = $state<string | null>(null);
	let deletingSaleId = $state<string | null>(null);
	let showProfitModal = $state(false);

	// Filtros
	let filters = $state({
		dateFrom: '',
		dateTo: '',
		status: '',
		paymentMethodId: '',
		saleNumber: ''
	});

	async function loadSales() {
		loading = true;
		try {
			const params = new URLSearchParams();
			if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
			if (filters.dateTo) params.append('dateTo', filters.dateTo);
			if (filters.status) params.append('status', filters.status);
			if (filters.paymentMethodId) params.append('paymentMethodId', filters.paymentMethodId);
			if (filters.saleNumber) params.append('saleNumber', filters.saleNumber);

			const [salesRes, purchasesRes] = await Promise.all([
				fetch(`/api/sales?${params.toString()}`),
				fetch('/api/purchases')
			]);

			const salesData = await salesRes.json();
			const purchasesData = await purchasesRes.json();

			if (salesData.success) {
				sales = salesData.data;
			}
			if (purchasesData.success) {
				purchases = purchasesData.data;
			}
		} catch {
			error = 'Error al cargar datos';
		} finally {
			loading = false;
		}
	}

	function applyFilters() {
		loadSales();
	}

	function clearFilters() {
		filters = {
			dateFrom: '',
			dateTo: '',
			status: '',
			paymentMethodId: '',
			saleNumber: ''
		};
		loadSales();
	}

	async function cancelSale(saleId: string, reason?: string) {
		cancellingSaleId = saleId;
		try {
			const response = await fetch(`/api/sales/${saleId}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason })
			});
			const data = await response.json();
			if (data.success) {
				sales = sales.map((s) => (s.id === saleId ? { ...s, status: 'CANCELADA' } : s));
				alert('Venta cancelada exitosamente');
			}
		} catch {
			alert('Error al cancelar venta');
		} finally {
			cancellingSaleId = null;
		}
	}

	async function deleteSale(saleId: string) {
		if (!confirm('¿Eliminar permanentemente esta venta?')) return;
		deletingSaleId = saleId;
		try {
			const response = await fetch(`/api/sales/${saleId}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ permanent: true })
			});
			const data = await response.json();
			if (data.success) {
				sales = sales.filter((s) => s.id !== saleId);
			}
		} catch {
			alert('Error al eliminar venta');
		} finally {
			deletingSaleId = null;
		}
	}

	function openDetailModal(sale: Sale) {
		selectedSale = sale;
		showDetailModal = true;
	}

	function closeDetailModal() {
		showDetailModal = false;
		selectedSale = null;
	}

	function confirmCancelSale(saleId: string) {
		const reason = prompt('¿Cancelar esta venta? El stock será restaurado.\nMotivo (opcional):');
		if (reason !== null) {
			cancelSale(saleId, reason);
		}
	}

	function getPaymentMethodLabel(method: { code: string; name: string; icon: string } | undefined) {
		if (!method) return '-';
		return `${method.icon} ${method.name}`;
	}

	function getStatusColor(status: string) {
		return status === 'COMPLETADA' ? 'green' : 'red';
	}

	function formatNumber(value: number | string): string {
		const num = typeof value === 'string' ? parseFloat(value) : value;
		if (isNaN(num)) return '0';
		return new Intl.NumberFormat('es-AR', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(num);
	}

	function calculateProfit() {
		let totalSales = 0;
		let totalCost = 0;

		for (const sale of sales) {
			if (sale.status === 'COMPLETADA') {
				for (const item of sale.items) {
					const quantity = Number(item.quantity);
					const unitPrice = Number(item.unitPrice);
					const unitCost = Number(item.unitCost);
					totalSales += quantity * unitPrice;
					totalCost += quantity * unitCost;
				}
			}
		}

		const profit = totalSales - totalCost;
		const profitMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0;

		return {
			totalSales,
			totalCost,
			profit,
			profitMargin
		};
	}

	function calculateSaleProfit(sale: Sale) {
		let sales = 0;
		let cost = 0;

		for (const item of sale.items) {
			const quantity = Number(item.quantity);
			const unitPrice = Number(item.unitPrice);
			const unitCost = Number(item.unitCost);
			sales += quantity * unitPrice;
			cost += quantity * unitCost;
		}

		const profit = sales - cost;
		const margin = sales > 0 ? (profit / sales) * 100 : 0;

		return { sales, cost, profit, margin };
	}

	const profitData = $derived(calculateProfit());

	onMount(() => {
		loadSales();
	});
</script>

<div class="min-h-screen bg-gray-50 p-6">
	<div class="mx-auto max-w-7xl">
		<div class="mb-6">
			<h1 class="text-3xl font-bold text-gray-900">Gestión de Ventas</h1>
		</div>

		<!-- Filtros -->
		<div class="mb-6 rounded-lg bg-white p-4 shadow">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
				<div>
					<label for="dateFrom" class="mb-1 block text-xs font-medium text-gray-600"
						>Fecha desde</label
					>
					<input
						id="dateFrom"
						type="date"
						bind:value={filters.dateFrom}
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
					/>
				</div>
				<div>
					<label for="dateTo" class="mb-1 block text-xs font-medium text-gray-600"
						>Fecha hasta</label
					>
					<input
						id="dateTo"
						type="date"
						bind:value={filters.dateTo}
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
					/>
				</div>
				<div>
					<label for="status" class="mb-1 block text-xs font-medium text-gray-600">Estado</label>
					<select
						id="status"
						bind:value={filters.status}
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
					>
						<option value="">Todos</option>
						<option value="COMPLETADA">Completada</option>
						<option value="CANCELADA">Cancelada</option>
					</select>
				</div>
				<div>
					<label for="paymentMethod" class="mb-1 block text-xs font-medium text-gray-600"
						>Método de pago</label
					>
					<select
						id="paymentMethod"
						bind:value={filters.paymentMethodId}
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
					>
						<option value="">Todos</option>
						<option value="EFECTIVO">Efectivo</option>
						<option value="TRANSFERENCIA">Transferencia</option>
						<option value="TARJETA">Tarjeta</option>
					</select>
				</div>
				<div>
					<label for="saleNumber" class="mb-1 block text-xs font-medium text-gray-600"
						>N° Venta</label
					>
					<input
						id="saleNumber"
						type="number"
						bind:value={filters.saleNumber}
						placeholder="N° venta"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900"
					/>
				</div>
			</div>
			<div class="mt-4 flex gap-2">
				<button
					onclick={applyFilters}
					class="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
				>
					Filtrar
				</button>
				<button
					onclick={clearFilters}
					class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50"
				>
					Limpiar filtros
				</button>
			</div>
		</div>

		<!-- Botón de Ganancias -->
		{#if sales.length > 0}
			<div class="mb-6">
				<button
					onclick={() => (showProfitModal = true)}
					class="rounded-lg bg-green-600 px-6 py-3 font-medium text-white shadow hover:bg-green-700"
				>
					💰 Ver Ganancias
				</button>
			</div>
		{/if}

		{#if loading}
			<div class="py-8 text-center text-gray-500">Cargando ventas...</div>
		{:else if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>
		{:else}
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
								>Venta</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
								>Fecha</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
								>Items</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
								>Total</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
								>Método</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
								>Estado</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
								>Acciones</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each sales as sale (sale.id)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">#{sale.saleNumber}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm text-gray-900">
										{new Date(sale.createdAt).toLocaleDateString('es-AR')}
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="inline-flex rounded-full bg-blue-100 px-2 text-xs font-semibold text-blue-800"
									>
										{sale.items.length} items
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">${sale.total}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm text-gray-900">
										{getPaymentMethodLabel(sale.paymentMethod)}
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="inline-flex rounded-full px-2 text-xs font-semibold bg-{getStatusColor(
											sale.status
										)}-100 text-{getStatusColor(sale.status)}-800"
									>
										{sale.status === 'COMPLETADA' ? 'Completada' : 'Cancelada'}
									</span>
								</td>
								<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
									<div class="flex gap-2">
										<button
											onclick={() => openDetailModal(sale)}
											class="text-amber-600 hover:text-amber-900"
										>
											Ver
										</button>
										{#if sale.status === 'COMPLETADA'}
											<button
												onclick={() => confirmCancelSale(sale.id)}
												disabled={cancellingSaleId === sale.id}
												class="text-red-600 hover:text-red-900"
											>
												{cancellingSaleId === sale.id ? 'Cancelando...' : 'Cancelar'}
											</button>
										{:else}
											<button
												onclick={() => deleteSale(sale.id)}
												disabled={deletingSaleId === sale.id}
												class="text-red-600 hover:text-red-900"
											>
												{deletingSaleId === sale.id ? 'Eliminando...' : 'Eliminar'}
											</button>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<!-- Modal Detalle -->
{#if showDetailModal && selectedSale}
	<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
		<div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white text-gray-900">
			<div class="p-6">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-xl font-semibold">Venta #{selectedSale.saleNumber}</h2>
					<button onclick={closeDetailModal} class="text-2xl text-gray-400 hover:text-gray-600"
						>×</button
					>
				</div>

				<div class="mb-4 grid grid-cols-2 gap-4">
					<div>
						<div class="text-xs text-gray-500">Fecha</div>
						<div class="text-sm font-medium">
							{new Date(selectedSale.createdAt).toLocaleString('es-AR')}
						</div>
					</div>
					<div>
						<div class="text-xs text-gray-500">Total</div>
						<div class="text-lg font-bold">${selectedSale.total}</div>
					</div>
					<div>
						<div class="text-xs text-gray-500">Método de pago</div>
						<div class="text-sm font-medium">
							{getPaymentMethodLabel(selectedSale.paymentMethod)}
						</div>
					</div>
					<div>
						<div class="text-xs text-gray-500">Estado</div>
						<div class="text-sm font-medium">
							<span
								class={`inline-flex rounded-full px-2 py-1 text-xs font-medium text-${getStatusColor(selectedSale.status)}-800 bg-${getStatusColor(selectedSale.status)}-100`}
								>{selectedSale.status}</span
							>
						</div>
					</div>
				</div>

				<h3 class="mb-3 font-medium">Items</h3>
				<div class="overflow-hidden rounded-lg border">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase"
									>Producto</th
								>
								<th class="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase"
									>Cantidad</th
								>
								<th class="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase"
									>Precio</th
								>
								<th class="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase"
									>Subtotal</th
								>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 bg-white">
							{#each selectedSale.items as item}
								<tr>
									<td class="px-4 py-2 text-sm text-gray-900">{item.productNameSnapshot}</td>
									<td class="px-4 py-2 text-right text-sm text-gray-900">{item.quantity}</td>
									<td class="px-4 py-2 text-right text-sm text-gray-900">${item.unitPrice}</td>
									<td class="px-4 py-2 text-right text-sm font-medium text-gray-900"
										>${item.subtotal}</td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="mt-6 flex justify-end">
					<button
						onclick={closeDetailModal}
						class="rounded-md border border-gray-300 px-4 py-2 text-gray-900 hover:bg-gray-50"
					>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Ganancias -->
{#if showProfitModal}
	<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
		<div class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white text-gray-900">
			<div class="p-6">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-xl font-semibold">Detalle de Ganancias</h2>
					<button
						onclick={() => (showProfitModal = false)}
						class="text-2xl text-gray-400 hover:text-gray-600">×</button
					>
				</div>

				<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
					<div class="rounded-lg bg-green-50 p-4">
						<div class="text-sm text-gray-600">Total Ventas</div>
						<div class="text-2xl font-bold text-gray-900">
							${formatNumber(profitData.totalSales)}
						</div>
					</div>
					<div class="rounded-lg bg-red-50 p-4">
						<div class="text-sm text-gray-600">Total Costos</div>
						<div class="text-2xl font-bold text-gray-900">
							${formatNumber(profitData.totalCost)}
						</div>
					</div>
					<div class="rounded-lg bg-green-100 p-4">
						<div class="text-sm text-gray-600">Ganancia</div>
						<div
							class="text-2xl font-bold {profitData.profit >= 0
								? 'text-green-600'
								: 'text-red-600'}"
						>
							${formatNumber(profitData.profit)}
						</div>
					</div>
					<div class="rounded-lg bg-blue-50 p-4">
						<div class="text-sm text-gray-600">Margen</div>
						<div
							class="text-2xl font-bold {profitData.profitMargin >= 0
								? 'text-green-600'
								: 'text-red-600'}"
						>
							{profitData.profitMargin.toFixed(1)}%
						</div>
					</div>
				</div>

				<h3 class="mb-3 text-lg font-medium">Detalle por Venta (con Items)</h3>
				<div class="mb-6 space-y-4">
					{#each sales as sale}
						{#if sale.status === 'COMPLETADA'}
							{@const saleProfit = calculateSaleProfit(sale)}
							<div class="rounded-lg border border-gray-200 bg-white p-4">
								<div class="mb-3 flex items-center justify-between">
									<div class="font-medium text-gray-900">Venta #{sale.saleNumber}</div>
									<div class="text-sm text-gray-600">
										{new Date(sale.createdAt).toLocaleDateString('es-AR')}
									</div>
								</div>
								<div class="mb-3 grid grid-cols-4 gap-2 text-sm">
									<div class="rounded bg-green-50 p-2">
										<div class="text-xs text-gray-600">Ventas</div>
										<div class="font-medium text-gray-900">${formatNumber(saleProfit.sales)}</div>
									</div>
									<div class="rounded bg-red-50 p-2">
										<div class="text-xs text-gray-600">Costos</div>
										<div class="font-medium text-gray-900">${formatNumber(saleProfit.cost)}</div>
									</div>
									<div class="rounded bg-green-100 p-2">
										<div class="text-xs text-gray-600">Ganancia</div>
										<div
											class="font-medium {saleProfit.profit >= 0
												? 'text-green-600'
												: 'text-red-600'}"
										>
											${formatNumber(saleProfit.profit)}
										</div>
									</div>
									<div class="rounded bg-blue-50 p-2">
										<div class="text-xs text-gray-600">Margen</div>
										<div class="font-medium text-gray-900">{saleProfit.margin.toFixed(1)}%</div>
									</div>
								</div>
								<div class="overflow-hidden rounded border border-gray-200">
									<table class="min-w-full divide-y divide-gray-200">
										<thead class="bg-gray-50">
											<tr>
												<th class="px-3 py-1 text-left text-xs font-medium text-gray-700 uppercase"
													>Producto</th
												>
												<th class="px-3 py-1 text-right text-xs font-medium text-gray-700 uppercase"
													>Cant</th
												>
												<th class="px-3 py-1 text-right text-xs font-medium text-gray-700 uppercase"
													>Precio Venta</th
												>
												<th class="px-3 py-1 text-right text-xs font-medium text-gray-700 uppercase"
													>Costo</th
												>
												<th class="px-3 py-1 text-right text-xs font-medium text-gray-700 uppercase"
													>Ganancia</th
												>
											</tr>
										</thead>
										<tbody class="divide-y divide-gray-200 bg-white">
											{#each sale.items as item}
												{@const itemProfit =
													(Number(item.unitPrice) - Number(item.unitCost)) * Number(item.quantity)}
												<tr>
													<td class="px-3 py-1 text-sm text-gray-900">{item.productNameSnapshot}</td
													>
													<td class="px-3 py-1 text-right text-sm text-gray-600">{item.quantity}</td
													>
													<td class="px-3 py-1 text-right text-sm text-gray-900"
														>${formatNumber(item.unitPrice)}</td
													>
													<td class="px-3 py-1 text-right text-sm text-gray-900"
														>${formatNumber(item.unitCost)}</td
													>
													<td
														class="px-3 py-1 text-right text-sm font-medium {itemProfit >= 0
															? 'text-green-600'
															: 'text-red-600'}"
													>
														${formatNumber(itemProfit)}
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						{/if}
					{/each}
				</div>

				<h3 class="mb-3 text-lg font-medium">Compras Registradas (con Items)</h3>
				<div class="space-y-4">
					{#each purchases as purchase}
						<div class="rounded-lg border border-gray-200 bg-white p-4">
							<div class="mb-3 flex items-center justify-between">
								<div class="font-medium text-gray-900">
									Compra #{purchase.purchaseNumber} - {purchase.supplierName}
								</div>
								<div class="text-sm text-gray-600">
									{new Date(purchase.createdAt).toLocaleDateString('es-AR')}
								</div>
							</div>
							<div class="mb-3 flex items-center gap-2">
								<span
									class="inline-flex rounded-full px-2 text-xs font-semibold {purchase.status ===
									'REGISTRADA'
										? 'bg-green-100 text-green-800'
										: 'bg-red-100 text-red-800'}"
								>
									{purchase.status}
								</span>
								<span class="text-sm text-gray-900">Total: ${formatNumber(purchase.total)}</span>
							</div>
							{#if purchase.items && purchase.items.length > 0}
								<div class="overflow-hidden rounded border border-gray-200">
									<table class="min-w-full divide-y divide-gray-200">
										<thead class="bg-gray-50">
											<tr>
												<th class="px-3 py-1 text-left text-xs font-medium text-gray-700 uppercase"
													>Producto</th
												>
												<th class="px-3 py-1 text-right text-xs font-medium text-gray-700 uppercase"
													>Cant</th
												>
												<th class="px-3 py-1 text-right text-xs font-medium text-gray-700 uppercase"
													>Costo Unit</th
												>
												<th class="px-3 py-1 text-right text-xs font-medium text-gray-700 uppercase"
													>Subtotal</th
												>
											</tr>
										</thead>
										<tbody class="divide-y divide-gray-200 bg-white">
											{#each purchase.items as item}
												<tr>
													<td class="px-3 py-1 text-sm text-gray-900">{item.productNameSnapshot}</td
													>
													<td class="px-3 py-1 text-right text-sm text-gray-600">{item.quantity}</td
													>
													<td class="px-3 py-1 text-right text-sm text-gray-900"
														>${formatNumber(item.unitCost)}</td
													>
													<td class="px-3 py-1 text-right text-sm text-gray-900"
														>${formatNumber(item.subtotal)}</td
													>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<div class="mt-6 flex justify-end">
					<button
						onclick={() => (showProfitModal = false)}
						class="rounded-md border border-gray-300 px-4 py-2 text-gray-900 hover:bg-gray-50"
					>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
