<script lang="ts">
	import { onMount } from 'svelte';
	import type { Product } from '$lib/types';

	let products = $state<Product[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showAdjustmentModal = $state(false);
	let selectedProduct = $state<Product | null>(null);

	// Stock statistics
	let stats = $state({
		totalProducts: 0,
		activeProducts: 0,
		lowStockProducts: 0,
		outOfStockProducts: 0,
		totalValue: 0,
		criticalStockProducts: 0
	});

	// Form data for stock adjustment
	let adjustmentData = $state({
		type: 'MANUAL' as 'MANUAL' | 'SALE' | 'PURCHASE' | 'ADJUSTMENT',
		quantity: 0,
		reason: '',
		note: ''
	});

	async function loadProducts() {
		try {
			const response = await fetch('/api/products?includeInactive=true');
			const data = await response.json();

			if (data.success) {
				products = data.data;
				calculateStats();
			} else {
				error = data.message;
			}
		} catch {
			error = 'Error al cargar productos';
		}
	}

	function calculateStats() {
		stats.totalProducts = products.length;
		stats.activeProducts = products.filter((p) => p.status === 'ACTIVO').length;
		stats.lowStockProducts = products.filter(
			(p) => Number(p.stock) <= Number(p.stockMin) && Number(p.stock) > 0
		).length;
		stats.outOfStockProducts = products.filter((p) => Number(p.stock) === 0).length;
		stats.criticalStockProducts = products.filter(
			(p) => Number(p.stock) <= Number(p.stockMin) / 2
		).length;

		// Calculate total inventory value
		stats.totalValue = products.reduce((total, product) => {
			const stock = Number(product.stock);
			const avgPrice =
				product.saleFormats.reduce((sum, format) => sum + Number(format.price), 0) /
				product.saleFormats.length;
			return total + stock * avgPrice;
		}, 0);
	}

	function getStockStatus(product: Product) {
		const stock = Number(product.stock);
		const stockMin = Number(product.stockMin);

		if (stock === 0) return { status: 'SIN STOCK', color: 'red', icon: '🚫' };
		if (stock <= stockMin / 2) return { status: 'CRÍTICO', color: 'red', icon: '⚠️' };
		if (stock <= stockMin) return { status: 'BAJO', color: 'yellow', icon: '⚠️' };
		return { status: 'NORMAL', color: 'green', icon: '✅' };
	}

	function openAdjustmentModal(product: Product) {
		selectedProduct = product;
		adjustmentData = {
			type: 'MANUAL',
			quantity: 0,
			reason: '',
			note: ''
		};
		showAdjustmentModal = true;
	}

	async function saveStockAdjustment() {
		if (!selectedProduct) return;

		try {
			const response = await fetch(`/api/products/${selectedProduct.id}/stock`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(adjustmentData)
			});

			const result = await response.json();

			if (result.success) {
				await loadProducts();
				showAdjustmentModal = false;
				selectedProduct = null;
				alert('Ajuste de stock realizado exitosamente');
			} else {
				alert(result.message);
			}
		} catch {
			alert('Error al realizar ajuste de stock');
		}
	}

	onMount(async () => {
		await loadProducts();
		loading = false;
	});
</script>

<div class="min-h-screen bg-gray-50 p-6">
	<div class="mx-auto max-w-7xl">
		<div class="mb-6">
			<h1 class="text-3xl font-bold text-gray-900">Gestión de Stock</h1>
			<p class="mt-2 text-gray-600">Monitorea y ajusta el inventario de productos</p>
		</div>

		{#if loading}
			<div class="py-8 text-center">
				<div class="text-gray-500">Cargando datos de stock...</div>
			</div>
		{:else if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4">
				<div class="text-red-600">{error}</div>
				<button onclick={loadProducts} class="mt-2 text-red-600 underline"> Reintentar </button>
			</div>
		{:else}
			<!-- Statistics Cards -->
			<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<div class="rounded-lg bg-white p-6 shadow">
					<div class="flex items-center">
						<div class="flex-1">
							<p class="text-sm font-medium text-gray-600">Total Productos</p>
							<p class="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
						</div>
						<div class="text-3xl">📦</div>
					</div>
				</div>

				<div class="rounded-lg bg-white p-6 shadow">
					<div class="flex items-center">
						<div class="flex-1">
							<p class="text-sm font-medium text-gray-600">Sin Stock</p>
							<p class="text-2xl font-bold text-red-600">{stats.outOfStockProducts}</p>
						</div>
						<div class="text-3xl">🚫</div>
					</div>
				</div>

				<div class="rounded-lg bg-white p-6 shadow">
					<div class="flex items-center">
						<div class="flex-1">
							<p class="text-sm font-medium text-gray-600">Stock Bajo</p>
							<p class="text-2xl font-bold text-yellow-600">{stats.lowStockProducts}</p>
						</div>
						<div class="text-3xl">⚠️</div>
					</div>
				</div>

				<div class="rounded-lg bg-white p-6 shadow">
					<div class="flex items-center">
						<div class="flex-1">
							<p class="text-sm font-medium text-gray-600">Valor Inventario</p>
							<p class="text-2xl font-bold text-green-600">${stats.totalValue.toFixed(2)}</p>
						</div>
						<div class="text-3xl">💰</div>
					</div>
				</div>
			</div>

			<!-- Alerts Section -->
			{#if stats.criticalStockProducts > 0 || stats.outOfStockProducts > 0}
				<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
					<h3 class="mb-2 text-lg font-semibold text-red-800">⚠️ Alertas de Stock Crítico</h3>
					<div class="text-red-600">
						{#if stats.outOfStockProducts > 0}
							<p>• {stats.outOfStockProducts} productos sin stock</p>
						{/if}
						{#if stats.criticalStockProducts > 0}
							<p>• {stats.criticalStockProducts} productos con stock crítico</p>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Products Table -->
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<div class="border-b border-gray-200 px-6 py-4">
					<h2 class="text-lg font-semibold text-gray-900">Inventario de Productos</h2>
				</div>

				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Producto
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Categoría
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Stock Actual
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Stock Mínimo
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Estado
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Acciones
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 bg-white">
							{#each products as product (product.id)}
								{@const stockInfo = getStockStatus(product)}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap">
										<div>
											<div class="text-sm font-medium text-gray-900">{product.name}</div>
											{#if product.description}
												<div class="text-sm text-gray-500">{product.description}</div>
											{/if}
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span
											class="inline-flex rounded-full bg-blue-100 px-2 text-xs leading-5 font-semibold text-blue-800"
										>
											{product.category?.name || 'Sin categoría'}
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm font-medium text-gray-900">{product.stock}</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="text-sm text-gray-500">{product.stockMin}</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span
											class="inline-flex rounded-full px-2 text-xs leading-5 font-semibold bg-{stockInfo.color}-100 text-{stockInfo.color}-800"
										>
											{stockInfo.icon}
											{stockInfo.status}
										</span>
									</td>
									<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
										<button
											onclick={() => openAdjustmentModal(product)}
											class="mr-3 text-amber-600 hover:text-amber-900"
										>
											Ajustar Stock
										</button>
										<a href="/admin/stock/{product.id}" class="text-blue-600 hover:text-blue-900">
											Ver Historial
										</a>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Stock Adjustment Modal -->
{#if showAdjustmentModal && selectedProduct}
	<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
		<div class="w-full max-w-md rounded-lg bg-white">
			<div class="p-6">
				<h2 class="mb-4 text-xl font-semibold text-gray-900">
					Ajustar Stock - {selectedProduct.name}
				</h2>

				<div class="mb-4 rounded bg-gray-50 p-3">
					<p class="text-sm text-gray-600">
						Stock actual: <span class="font-bold">{selectedProduct.stock}</span> | Stock mínimo:
						<span class="font-bold">{selectedProduct.stockMin}</span>
					</p>
				</div>

				<form onsubmit={saveStockAdjustment}>
					<div class="space-y-4">
						<div>
							<label for="adjustment-type" class="mb-1 block text-sm font-medium text-gray-900">
								Tipo de Ajuste
							</label>
							<select
								id="adjustment-type"
								bind:value={adjustmentData.type}
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
							>
								<option value="MANUAL">Ajuste Manual</option>
								<option value="PURCHASE">Compra/Ingreso</option>
								<option value="SALE">Venta/Salida</option>
								<option value="ADJUSTMENT">Ajuste de Inventario</option>
							</select>
						</div>

						<div>
							<label for="adjustment-quantity" class="mb-1 block text-sm font-medium text-gray-900">
								Cantidad {adjustmentData.type === 'SALE' ? 'a restar' : 'a agregar'}
							</label>
							<input
								id="adjustment-quantity"
								type="number"
								step="0.001"
								bind:value={adjustmentData.quantity}
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
								required
							/>
						</div>

						<div>
							<label for="adjustment-reason" class="mb-1 block text-sm font-medium text-gray-900">
								Motivo
							</label>
							<input
								id="adjustment-reason"
								type="text"
								bind:value={adjustmentData.reason}
								placeholder="Motivo del ajuste"
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
								required
							/>
						</div>

						<div>
							<label for="adjustment-note" class="mb-1 block text-sm font-medium text-gray-900">
								Notas (opcional)
							</label>
							<textarea
								id="adjustment-note"
								bind:value={adjustmentData.note}
								rows="3"
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
							></textarea>
						</div>
					</div>

					<div class="mt-6 flex justify-end gap-3">
						<button
							type="button"
							onclick={() => {
								showAdjustmentModal = false;
								selectedProduct = null;
							}}
							class="rounded-md border border-gray-300 px-4 py-2 text-gray-900 hover:bg-gray-50"
						>
							Cancelar
						</button>
						<button
							type="submit"
							class="rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
						>
							Realizar Ajuste
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
