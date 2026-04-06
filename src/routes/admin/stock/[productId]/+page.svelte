<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import type { Product } from '$lib/types';

	let product = $state<Product | null>(null);
	let movements = $state<any[]>([]);
	let loading = $state(true);
	let error = $state('');

	const productId = $page.params.productId;

	async function loadProduct() {
		try {
			const response = await fetch(`/api/products/${productId}`);
			const data = await response.json();

			if (data.success) {
				product = data.data;
			} else {
				error = data.message;
			}
		} catch {
			error = 'Error al cargar producto';
		}
	}

	async function loadMovements() {
		try {
			const response = await fetch(`/api/products/${productId}/stock`);
			const data = await response.json();

			if (data.success) {
				movements = data.data;
			} else {
				error = data.message;
			}
		} catch {
			error = 'Error al cargar movimientos';
		}
	}

	function getMovementTypeLabel(type: string) {
		const labels: Record<string, string> = {
			ENTRADA_COMPRA: 'Compra',
			SALIDA_VENTA: 'Venta',
			AJUSTE_MANUAL: 'Ajuste Manual',
			REVERSO_VENTA: 'Reverso Venta',
			REVERSO_COMPRA: 'Reverso Compra'
		};
		return labels[type] || type;
	}

	function getMovementTypeColor(type: string) {
		const colors: Record<string, string> = {
			ENTRADA_COMPRA: 'green',
			SALIDA_VENTA: 'red',
			AJUSTE_MANUAL: 'blue',
			REVERSO_VENTA: 'yellow',
			REVERSO_COMPRA: 'orange'
		};
		return colors[type] || 'gray';
	}

	onMount(async () => {
		await Promise.all([loadProduct(), loadMovements()]);
		loading = false;
	});
</script>

<div class="min-h-screen bg-gray-50 p-6">
	<div class="mx-auto max-w-7xl">
		<div class="mb-6">
			<nav class="mb-4 flex" aria-label="Breadcrumb">
				<ol class="flex items-center space-x-2">
					<li>
						<a href="/admin/stock" class="text-gray-500 hover:text-gray-700">Stock</a>
					</li>
					<li>
						<span class="mx-2 text-gray-500">/</span>
					</li>
					<li class="text-gray-900">Historial</li>
				</ol>
			</nav>

			<h1 class="text-3xl font-bold text-gray-900">Historial de Movimientos</h1>
			{#if product}
				<p class="mt-2 text-gray-600">
					Historial de stock para: <span class="font-semibold">{product.name}</span>
				</p>
			{/if}
		</div>

		{#if loading}
			<div class="py-8 text-center">
				<div class="text-gray-500">Cargando historial...</div>
			</div>
		{:else if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4">
				<div class="text-red-600">{error}</div>
				<button
					onclick={() => Promise.all([loadProduct(), loadMovements()])}
					class="mt-2 text-red-600 underline"
				>
					Reintentar
				</button>
			</div>
		{:else if !product}
			<div class="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
				<div class="text-yellow-600">Producto no encontrado</div>
			</div>
		{:else}
			<!-- Product Info Card -->
			<div class="mb-6 rounded-lg bg-white p-6 shadow">
				<div class="grid grid-cols-1 gap-4 md:grid-cols-4">
					<div>
						<p class="text-sm font-medium text-gray-600">Producto</p>
						<p class="text-lg font-semibold text-gray-900">{product.name}</p>
					</div>
					<div>
						<p class="text-sm font-medium text-gray-600">Stock Actual</p>
						<p class="text-lg font-semibold text-gray-900">{product.stock}</p>
					</div>
					<div>
						<p class="text-sm font-medium text-gray-600">Stock Mínimo</p>
						<p class="text-lg font-semibold text-gray-900">{product.stockMin}</p>
					</div>
					<div>
						<p class="text-sm font-medium text-gray-600">Estado</p>
						{#if Number(product.stock) === 0}
							<span
								class="inline-flex rounded-full bg-red-100 px-2 text-xs leading-5 font-semibold text-red-800"
							>
								SIN STOCK
							</span>
						{:else if Number(product.stock) <= Number(product.stockMin)}
							<span
								class="inline-flex rounded-full bg-yellow-100 px-2 text-xs leading-5 font-semibold text-yellow-800"
							>
								BAJO
							</span>
						{:else}
							<span
								class="inline-flex rounded-full bg-green-100 px-2 text-xs leading-5 font-semibold text-green-800"
							>
								NORMAL
							</span>
						{/if}
					</div>
				</div>
			</div>

			<!-- Movements Table -->
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<div class="border-b border-gray-200 px-6 py-4">
					<h2 class="text-lg font-semibold text-gray-900">Movimientos de Stock</h2>
					<p class="mt-1 text-sm text-gray-500">Últimos {movements.length} movimientos</p>
				</div>

				{#if movements.length === 0}
					<div class="py-8 text-center">
						<div class="text-gray-500">No hay movimientos registrados</div>
					</div>
				{:else}
					<div class="overflow-x-auto">
						<table class="min-w-full divide-y divide-gray-200">
							<thead class="bg-gray-50">
								<tr>
									<th
										class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>
										Fecha y Hora
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>
										Tipo
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>
										Cantidad
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>
										Stock Anterior
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>
										Stock Nuevo
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>
										Motivo
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
									>
										Usuario
									</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-200 bg-white">
								{#each movements as movement (movement.id)}
									<tr class="hover:bg-gray-50">
										<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
											{new Date(movement.createdAt).toLocaleString('es-AR')}
										</td>
										<td class="px-6 py-4 whitespace-nowrap">
											{#if movement.type === 'ENTRADA_COMPRA'}
												<span
													class="inline-flex rounded-full bg-green-100 px-2 text-xs leading-5 font-semibold text-green-800"
												>
													Compra
												</span>
											{:else if movement.type === 'SALIDA_VENTA'}
												<span
													class="inline-flex rounded-full bg-red-100 px-2 text-xs leading-5 font-semibold text-red-800"
												>
													Venta
												</span>
											{:else if movement.type === 'AJUSTE_MANUAL'}
												<span
													class="inline-flex rounded-full bg-blue-100 px-2 text-xs leading-5 font-semibold text-blue-800"
												>
													Ajuste Manual
												</span>
											{:else if movement.type === 'REVERSO_VENTA'}
												<span
													class="inline-flex rounded-full bg-yellow-100 px-2 text-xs leading-5 font-semibold text-yellow-800"
												>
													Reverso Venta
												</span>
											{:else}
												<span
													class="inline-flex rounded-full bg-orange-100 px-2 text-xs leading-5 font-semibold text-orange-800"
												>
													Reverso Compra
												</span>
											{/if}
										</td>
										<td class="px-6 py-4 whitespace-nowrap">
											<span
												class="text-sm font-medium {Number(movement.quantity) >= 0
													? 'text-green-600'
													: 'text-red-600'}"
											>
												{Number(movement.quantity) >= 0 ? '+' : ''}{movement.quantity}
											</span>
										</td>
										<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
											{movement.previousStock}
										</td>
										<td class="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900">
											{movement.newStock}
										</td>
										<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
											{movement.reason || '-'}
										</td>
										<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
											{movement.user?.name || 'Sistema'}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
