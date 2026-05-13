<script lang="ts">
	import { onMount } from 'svelte';

	interface Movement {
		id: string;
		type: 'OPENING' | 'CLOSING';
		cashRegisterId: string;
		amount: number;
		user: {
			id: string;
			name: string;
			email: string;
		};
		timestamp: string;
		notes?: string;
		billCounts?: any;
		expectedAmount?: number;
		difference?: number;
		description: string;
	}

	interface MovementsResponse {
		movements: Movement[];
		pagination: {
			page: number;
			limit: number;
			total: number;
			pages: number;
		};
	}

	let movements = $state<Movement[]>([]);
	let loading = $state(true);
	let error = $state('');
	let currentPage = $state(1);
	let totalPages = $state(1);
	let totalMovements = $state(0);
	let showMovementView = $state(false);

	// Filtros
	let selectedType = $state<string>('');
	let startDate = $state('');
	let endDate = $state('');

	async function loadMovements() {
		loading = true;
		error = '';
		
		try {
			const params = new URLSearchParams({
				page: currentPage.toString(),
				limit: '50'
			});

			if (selectedType) params.append('type', selectedType);
			if (startDate) params.append('startDate', startDate);
			if (endDate) params.append('endDate', endDate);

			const response = await fetch(`/api/movements?${params}`);
			
			if (!response.ok) {
				if (response.status === 401) {
					error = 'No autenticado. Por favor inicie sesión.';
					return;
				}
				throw new Error(`HTTP ${response.status}`);
			}

			const result = await response.json();

			if (result.success) {
				const data: MovementsResponse = result.data;
				movements = data.movements;
				currentPage = data.pagination.page;
				totalPages = data.pagination.pages;
				totalMovements = data.pagination.total;
			} else {
				error = result.message || 'Error al cargar movimientos';
			}
		} catch (err) {
			console.error('Error loading movements:', err);
			error = `Error de conexión: ${err instanceof Error ? err.message : 'Error desconocido'}`;
		} finally {
			loading = false;
		}
	}

	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleString('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('es-AR', {
			style: 'currency',
			currency: 'ARS'
		}).format(amount);
	}

	function getTypeColor(type: string): string {
		return type === 'OPENING' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
	}

	function getTypeLabel(type: string): string {
		return type === 'OPENING' ? 'Apertura' : 'Cierre';
	}

	async function applyFilters() {
		currentPage = 1;
		await loadMovements();
	}

	async function resetFilters() {
		selectedType = '';
		startDate = '';
		endDate = '';
		currentPage = 1;
		await loadMovements();
	}

	async function changePage(page: number) {
		if (page >= 1 && page <= totalPages) {
			currentPage = page;
			await loadMovements();
		}
	}

	async function toggleMovementView() {
		showMovementView = !showMovementView;
		if (showMovementView && movements.length === 0) {
			await loadMovements();
		}
	}

	onMount(() => {
		loadMovements();
	});
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="bg-amber-600 text-white shadow-lg">
		<div class="container mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<h1 class="text-2xl font-bold">Nuestra Esencia</h1>
					<span class="text-amber-100">Administración</span>
				</div>
				<nav class="flex space-x-4">
					<a href="/admin" class="text-amber-100 hover:text-white">Panel</a>
					<a href="/admin/products" class="text-amber-100 hover:text-white">Productos</a>
					<a href="/admin/sales" class="text-amber-100 hover:text-white">Ventas</a>
					<a href="/admin/payment-methods" class="text-amber-100 hover:text-white">Medios de Pago</a>
				</nav>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="container mx-auto px-4 py-6">
		<div class="mb-6">
			<h2 class="text-2xl font-semibold text-gray-900 mb-4">Auditoría de Movimientos</h2>
			<div class="flex items-center">
				<button
					onclick={toggleMovementView}
					class="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
				>
					Apertura y Cierre de Caja
				</button>
			</div>
		</div>

		<!-- Vista de Movimientos (se muestra al presionar el botón) -->
		{#if showMovementView}
			<!-- Filtros -->
			<div class="mb-6 bg-white rounded-lg shadow p-4">
				<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
					<div>
						<label for="type-filter" class="block text-sm font-medium text-black mb-1">Tipo</label>
						<select id="type-filter" bind:value={selectedType} class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 text-black">
							<option value="">Todos</option>
							<option value="OPENING">Apertura</option>
							<option value="CLOSING">Cierre</option>
						</select>
					</div>
					<div>
						<label for="start-date" class="block text-sm font-medium text-black mb-1">Desde</label>
						<input id="start-date" type="date" bind:value={startDate} class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 text-black">
					</div>
					<div>
						<label for="end-date" class="block text-sm font-medium text-black mb-1">Hasta</label>
						<input id="end-date" type="date" bind:value={endDate} class="w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 text-black">
					</div>
					<div class="flex items-end space-x-2">
						<button onclick={applyFilters} class="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700">
							Filtrar
						</button>
						<button onclick={resetFilters} class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">
							Reset
						</button>
					</div>
				</div>
			</div>

		{#if loading}
			<div class="py-8 text-center">
				<div class="text-gray-500">Cargando movimientos...</div>
			</div>
		{:else if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4">
				<div class="text-red-800">{error}</div>
			</div>
		{:else}
			<!-- Tabla de movimientos -->
			<div class="bg-white rounded-lg shadow overflow-hidden">
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha/Hora</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
								<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							{#each movements as movement (movement.id)}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										{formatDate(movement.timestamp)}
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getTypeColor(movement.type)}">
											{getTypeLabel(movement.type)}
										</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
										<div class="font-medium">{movement.user.name}</div>
										<div class="text-gray-500">{movement.user.email}</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
										{formatCurrency(movement.amount)}
									</td>
									<td class="px-6 py-4 text-sm text-gray-900">
										{movement.description}
										{#if movement.difference !== undefined}
											<div class="text-xs text-gray-500 mt-1">
												Diferencia: {formatCurrency(movement.difference)}
											</div>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

			<!-- Paginación -->
			{#if totalPages > 1}
				<div class="bg-white px-4 py-3 border-t border-gray-200 sm:px-6 rounded-lg shadow">
					<div class="flex items-center justify-between">
						<div class="flex-1 flex justify-between sm:hidden">
							<button onclick={() => changePage(currentPage - 1)} disabled={currentPage === 1} class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
								Anterior
							</button>
							<button onclick={() => changePage(currentPage + 1)} disabled={currentPage === totalPages} class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
								Siguiente
							</button>
						</div>
						<div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
							<div>
								<p class="text-sm text-gray-700">
									Página <span class="font-medium">{currentPage}</span> de <span class="font-medium">{totalPages}</span>
								</p>
							</div>
							<div>
								<nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
									<button onclick={() => changePage(currentPage - 1)} disabled={currentPage === 1} class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
										Anterior
									</button>
									<button onclick={() => changePage(currentPage + 1)} disabled={currentPage === totalPages} class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
										Siguiente
									</button>
								</nav>
							</div>
						</div>
					</div>
				</div>
			{/if}

			{#if movements.length === 0}
				<div class="text-center py-12">
					<div class="text-gray-500">No se encontraron movimientos</div>
				</div>
			{/if}
		{/if}
		{/if}
	</main>
</div>
