<script lang="ts">
	import { onMount } from 'svelte';

	interface Product {
		id: string;
		name: string;
		description?: string;
		status: string;
		stock: number;
		stockUnit: string;
		isCombo: boolean;
		saleFormats: Array<{
			id: string;
			label: string;
			price: number;
		}>;
	}

	interface Combo {
		id: string;
		name: string;
		description?: string;
		status: string;
		saleFormats: Array<{
			id: string;
			label: string;
			price: number;
		}>;
		comboItems: Array<{
			id: string;
			componentId: string;
			component: Product;
			quantity: number;
		}>;
	}

	let products = $state<Product[]>([]);
	let combos = $state<Combo[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let editingCombo = $state<Combo | null>(null);
	let saving = $state(false);

	// Form data
	let comboName = $state('');
	let comboDescription = $state('');
	let comboPrice = $state(0);
	let comboLabel = $state('');
	let selectedComponents = $state<Array<{productId: string, quantity: number}>>([]);

	async function loadProducts() {
		try {
			const response = await fetch('/api/products');
			if (response.ok) {
				const data = await response.json();
				products = data.data.filter((p: Product) => !p.isCombo && p.status === 'ACTIVO');
			}
		} catch {
			console.error('Error loading products');
		}
	}

	async function loadCombos() {
		try {
			const response = await fetch('/api/products?includeCombos=true');
			if (response.ok) {
				const data = await response.json();
				combos = data.data.filter((p: Product) => p.isCombo);
			}
		} catch {
			console.error('Error loading combos');
		}
	}

	async function loadAll() {
		loading = true;
		error = '';
		try {
			await Promise.all([loadProducts(), loadCombos()]);
		} catch {
			error = 'Error al cargar datos';
		} finally {
			loading = false;
		}
	}

	async function createCombo() {
		saving = true;
		try {
			// Crear el producto combo
			const comboResponse = await fetch('/api/products', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: comboName,
					description: comboDescription,
					isCombo: true,
					saleFormats: [{
						label: comboLabel,
						price: comboPrice,
						unitMeasure: 'UNIDAD',
						quantity: 1
					}]
				})
			});

			const comboResult = await comboResponse.json();
			if (!comboResult.success) {
				alert(`Error al crear combo: ${comboResult.message}`);
				return;
			}

			const comboId = comboResult.data.id;

			// Crear los items del combo
			const comboItems = selectedComponents.map(comp => ({
				comboProductId: comboId,
				componentId: comp.productId,
				quantity: comp.quantity
			}));

			for (const item of comboItems) {
				const itemResponse = await fetch('/api/combos/items', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(item)
				});

				const itemResult = await itemResponse.json();
				if (!itemResult.success) {
					alert(`Error al agregar componente: ${itemResult.message}`);
					return;
				}
			}

			showCreateModal = false;
			resetForm();
			await loadAll();
		} catch {
			alert('Error al crear combo');
		} finally {
			saving = false;
		}
	}

	async function updateCombo() {
		if (!editingCombo) return;

		saving = true;
		try {
			// Actualizar producto combo
			const comboResponse = await fetch(`/api/products/${editingCombo!.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: comboName,
					description: comboDescription,
					saleFormats: [{
						id: editingCombo.saleFormats[0]?.id,
						label: comboLabel,
						price: comboPrice,
						unitMeasure: 'UNIDAD',
						quantity: 1
					}]
				})
			});

			const comboResult = await comboResponse.json();
			if (!comboResult.success) {
				alert(`Error al actualizar combo: ${comboResult.message}`);
				return;
			}

			// Actualizar items del combo (eliminar y recrear)
			await fetch(`/api/combos/${editingCombo.id}/items`, { method: 'DELETE' });

			const comboItems = selectedComponents.map(comp => ({
				comboProductId: editingCombo!.id,
				componentId: comp.productId,
				quantity: comp.quantity
			}));

			for (const item of comboItems) {
				const itemResponse = await fetch('/api/combos/items', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(item)
				});

				const itemResult = await itemResponse.json();
				if (!itemResult.success) {
					alert(`Error al actualizar componente: ${itemResult.message}`);
					return;
				}
			}

			showEditModal = false;
			editingCombo = null;
			resetForm();
			await loadAll();
		} catch {
			alert('Error al actualizar combo');
		} finally {
			saving = false;
		}
	}

	async function deleteCombo(id: string) {
		if (!confirm('¿Está seguro de eliminar este combo?')) return;

		try {
			const response = await fetch(`/api/products/${id}`, {
				method: 'DELETE'
			});

			const result = await response.json();
			if (result.success) {
				await loadAll();
			} else {
				alert(`Error: ${result.message}`);
			}
		} catch {
			alert('Error al eliminar combo');
		}
	}

	function openCreateModal() {
		resetForm();
		showCreateModal = true;
	}

	function openEditModal(combo: Combo) {
		editingCombo = combo;
		comboName = combo.name;
		comboDescription = combo.description || '';
		comboPrice = combo.saleFormats[0]?.price || 0;
		comboLabel = combo.saleFormats[0]?.label || '';
		selectedComponents = combo.comboItems.map(item => ({
			productId: item.componentId,
			quantity: Number(item.quantity)
		}));
		showEditModal = true;
	}

	function closeModals() {
		showCreateModal = false;
		showEditModal = false;
		editingCombo = null;
		resetForm();
	}

	function resetForm() {
		comboName = '';
		comboDescription = '';
		comboPrice = 0;
		comboLabel = '';
		selectedComponents = [];
	}

	function addComponent(productId: string) {
		if (!selectedComponents.find(c => c.productId === productId)) {
			selectedComponents.push({ productId, quantity: 1 });
		}
	}

	function removeComponent(productId: string) {
		selectedComponents = selectedComponents.filter(c => c.productId !== productId);
	}

	function updateComponentQuantity(productId: string, quantity: number) {
		const component = selectedComponents.find(c => c.productId === productId);
		if (component) {
			component.quantity = Math.max(0.1, quantity);
		}
	}

	function getComponentName(productId: string) {
		const product = products.find(p => p.id === productId);
		return product?.name || '';
	}

	function getComboTotal() {
		return selectedComponents.reduce((total, comp) => {
			const product = products.find(p => p.id === comp.productId);
			const price = product?.saleFormats[0]?.price || 0;
			return total + (price * comp.quantity);
		}, 0);
	}

	onMount(() => {
		loadAll();
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
					<a href="/admin/combos" class="text-white font-medium">Combos</a>
					<a href="/admin/sales" class="text-amber-100 hover:text-white">Ventas</a>
					<a href="/admin/payment-methods" class="text-amber-100 hover:text-white">Medios de Pago</a>
				</nav>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="container mx-auto px-4 py-6">
		<div class="mb-6">
			<div class="flex items-center justify-between">
				<h2 class="text-2xl font-semibold text-gray-900">Combos</h2>
				<button
					onclick={openCreateModal}
					class="rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
				>
					Nuevo Combo
				</button>
			</div>

			{#if error}
				<div class="rounded bg-red-50 p-4 text-red-700">
					{error}
					<button
						onclick={loadAll}
						class="mt-2 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
					>
						Reintentar
					</button>
				</div>
			{:else if loading}
				<div class="text-center py-8">
					<div class="text-gray-900">Cargando...</div>
				</div>
			{:else if combos.length === 0}
				<div class="text-center py-8">
					<div class="text-gray-900">No hay combos configurados</div>
					<button
						onclick={openCreateModal}
						class="mt-4 rounded bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
					>
						Crear Primer Combo
					</button>
				</div>
			{:else}
				<!-- Grid de combos -->
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{#each combos as combo (combo.id)}
						<div class="rounded-lg bg-white p-6 shadow-md">
							<div class="flex items-start justify-between mb-4">
								<div>
									<h3 class="text-lg font-semibold text-gray-900">{combo.name}</h3>
									{#if combo.description}
										<p class="text-sm text-gray-600">{combo.description}</p>
									{/if}
								</div>
								<div class="flex space-x-2">
									<button
										onclick={() => openEditModal(combo)}
										class="text-blue-600 hover:text-blue-800"
										title="Editar"
									>
										✏️
									</button>
									<button
										onclick={() => deleteCombo(combo.id)}
										class="text-red-600 hover:text-red-800"
										title="Eliminar"
									>
										🗑️
									</button>
								</div>
							</div>

							<div class="mb-4">
								<div class="text-2xl font-bold text-amber-600">
									${combo.saleFormats[0]?.price || 0}
								</div>
								<div class="text-sm text-gray-500">
									{combo.saleFormats[0]?.label || 'Unidad'}
								</div>
							</div>

							<div class="border-t pt-4">
								<h4 class="text-sm font-medium text-gray-700 mb-2">Componentes:</h4>
								<div class="space-y-1">
									{#each combo.comboItems as item (item.id)}
										<div class="flex justify-between text-sm">
											<span class="text-gray-600">{item.component.name}</span>
											<span class="text-gray-900">x{item.quantity}</span>
										</div>
									{/each}
								</div>
							</div>

							<div class="mt-4">
								<span class={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
									combo.status === 'ACTIVO' 
										? 'text-green-800 bg-green-100' 
										: 'text-gray-800 bg-gray-100'
								}`}>
									{combo.status}
								</span>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</main>

	<!-- Modal Crear/Editar Combo -->
	{#if showCreateModal || showEditModal}
		<div class="fixed inset-0 z-50 overflow-y-auto">
			<div class="flex min-h-full items-center justify-center bg-black bg-opacity-50 p-4">
				<div class="w-full max-w-4xl bg-white rounded-lg shadow-xl p-6">
					<div class="flex items-center justify-between mb-4">
						<h3 class="text-lg font-semibold text-gray-900">
							{showEditModal ? 'Editar Combo' : 'Nuevo Combo'}
						</h3>
						<button onclick={closeModals} class="text-gray-400 hover:text-gray-600">✕</button>
					</div>

					<form onsubmit={showEditModal ? updateCombo : createCombo}>
						<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
							<!-- Datos del combo -->
							<div class="space-y-4">
								<div>
									<label for="comboName" class="block text-sm font-medium text-gray-700">Nombre del Combo</label>
									<input
										id="comboName"
										name="comboName"
										type="text"
										bind:value={comboName}
										required
										class="w-full rounded-md border-gray-300 px-3 py-2 text-gray-900"
										placeholder="Ej: Combo Hamburguesa"
									/>
								</div>

								<div>
									<label for="comboDescription" class="block text-sm font-medium text-gray-700">Descripción</label>
									<textarea
										id="comboDescription"
										name="comboDescription"
										bind:value={comboDescription}
										rows="3"
										class="w-full rounded-md border-gray-300 px-3 py-2 text-gray-900"
										placeholder="Descripción opcional del combo"
									></textarea>
								</div>

								<div>
									<label for="comboLabel" class="block text-sm font-medium text-gray-700">Etiqueta</label>
									<input
										id="comboLabel"
										name="comboLabel"
										type="text"
										bind:value={comboLabel}
										required
										class="w-full rounded-md border-gray-300 px-3 py-2 text-gray-900"
										placeholder="Ej: Combo"
									/>
								</div>

								<div>
									<label for="comboPrice" class="block text-sm font-medium text-gray-700">Precio</label>
									<div class="relative">
										<span class="absolute left-3 top-2 text-gray-500">$</span>
										<input
											id="comboPrice"
											name="comboPrice"
											type="number"
											bind:value={comboPrice}
											min="0"
											step="0.01"
											required
											class="w-full rounded-md border-gray-300 pl-8 pr-3 py-2 text-gray-900"
											placeholder="0.00"
										/>
									</div>
								</div>

								<div>
									<div class="flex justify-between items-center mb-2">
										<h4 class="text-sm font-medium text-gray-700">Componentes</h4>
										<span class="text-sm text-gray-500">
											Total componentes: ${getComboTotal().toFixed(2)}
										</span>
									</div>
									
									<div class="border rounded-md p-3 max-h-64 overflow-y-auto">
										{#each selectedComponents as comp (comp.productId)}
											<div class="flex items-center justify-between mb-2">
												<span class="text-sm text-gray-900">{getComponentName(comp.productId)}</span>
												<div class="flex items-center space-x-2">
													<input
														type="number"
														bind:value={comp.quantity}
														min="0.1"
														step="0.1"
														class="w-16 rounded border-gray-300 px-2 py-1 text-sm"
													/>
													<button
														type="button"
														onclick={() => removeComponent(comp.productId)}
														class="text-red-600 hover:text-red-800"
													>
														❌
													</button>
												</div>
											</div>
										{/each}
									</div>
								</div>
							</div>

							<!-- Lista de productos disponibles -->
							<div>
								<h4 class="text-sm font-medium text-gray-700 mb-2">Productos Disponibles</h4>
								<div class="border rounded-md p-3 max-h-96 overflow-y-auto">
									{#each products as product (product.id)}
										<div class="flex items-center justify-between py-2 border-b last:border-b-0">
											<div>
												<div class="font-medium text-gray-900">{product.name}</div>
												<div class="text-sm text-gray-500">
													${product.saleFormats[0]?.price || 0} | Stock: {product.stock}
												</div>
											</div>
											{#if !selectedComponents.find(c => c.productId === product.id)}
												<button
													type="button"
													onclick={() => addComponent(product.id)}
													class="rounded bg-green-600 px-3 py-1 text-white text-sm hover:bg-green-700"
												>
													Agregar
												</button>
											{:else}
												<span class="text-sm text-green-600">✓ Agregado</span>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						</div>

						<div class="mt-6 flex justify-end space-x-3">
							<button
								type="button"
								onclick={closeModals}
								class="rounded-md border border-gray-300 px-4 py-2 text-gray-900 hover:bg-gray-50"
							>
								Cancelar
							</button>
							<button
								type="submit"
								disabled={saving || selectedComponents.length === 0}
								class="rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:bg-gray-400"
							>
								{saving ? 'Guardando...' : (showEditModal ? 'Actualizar' : 'Crear')}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	{/if}
</div>
