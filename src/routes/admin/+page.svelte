<script lang="ts">
	import { onMount } from 'svelte';
	import type { Product, Category } from '$lib/types';

	let products = $state<Product[]>([]);
	let categories = $state<Category[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let selectedProduct = $state<Product | null>(null);

	// Form data
	let formData = $state<{
		name: string;
		description: string;
		categoryId: string;
		stock: number;
		stockMin: number;
		isPerishable: boolean;
		status: 'ACTIVO' | 'INACTIVO';
		saleFormats: Array<{
			id?: string;
			unitMeasure: 'UNIDAD' | 'DOCENA' | 'MEDIA_DOCENA' | 'KILOGRAMO' | 'PORCION';
			label: string;
			price: number;
		}>;
	}>({
		name: '',
		description: '',
		categoryId: '',
		stock: 0,
		stockMin: 0,
		isPerishable: false,
		status: 'ACTIVO',
		saleFormats: [
			{
				unitMeasure: 'UNIDAD',
				label: 'Unidad',
				price: 0
			}
		]
	});

	async function loadProducts() {
		try {
			const response = await fetch('/api/products?includeInactive=true');
			const data = await response.json();

			if (data.success) {
				products = data.data;
			} else {
				error = data.message;
			}
		} catch {
			error = 'Error al cargar productos';
		}
	}

	async function loadCategories() {
		try {
			const response = await fetch('/api/categories');
			const data = await response.json();

			if (data.success) {
				categories = data.data;
			}
		} catch {
			console.error('Error loading categories');
		}
	}

	function resetForm() {
		formData = {
			name: '',
			description: '',
			categoryId: '',
			stock: 0,
			stockMin: 0,
			isPerishable: false,
			status: 'ACTIVO',
			saleFormats: [
				{
					unitMeasure: 'UNIDAD',
					label: 'Unidad',
					price: 0
				}
			]
		};
	}

	function openCreateModal() {
		resetForm();
		showCreateModal = true;
	}

	function openEditModal(product: Product) {
		selectedProduct = product;
		formData = {
			name: product.name,
			description: product.description || '',
			categoryId: product.categoryId || '',
			stock: Number(product.stock),
			stockMin: Number(product.stockMin),
			isPerishable: product.isPerishable,
			status: product.status,
			saleFormats: product.saleFormats.map((format) => ({
				id: format.id,
				unitMeasure: format.unitMeasure,
				label: format.label || '',
				price: Number(format.price)
			}))
		};
		showEditModal = true;
	}

	function addSaleFormat() {
		formData.saleFormats.push({
			unitMeasure: 'UNIDAD',
			label: '',
			price: 0
		});
	}

	function removeSaleFormat(index: number) {
		if (formData.saleFormats.length > 1) {
			formData.saleFormats.splice(index, 1);
		}
	}

	async function saveProduct() {
		try {
			const url = showEditModal ? `/api/products/${selectedProduct?.id}` : '/api/products';
			const method = showEditModal ? 'PUT' : 'POST';

			const response = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});

			const result = await response.json();

			if (result.success) {
				await loadProducts();
				showCreateModal = false;
				showEditModal = false;
				selectedProduct = null;
				resetForm();
				alert(result.message);
			} else {
				alert(result.message);
			}
		} catch {
			alert('Error al guardar producto');
		}
	}

	async function deleteProduct(productId: string) {
		if (!confirm('¿Estás seguro de eliminar este producto?')) return;

		try {
			const response = await fetch(`/api/products/${productId}`, {
				method: 'DELETE'
			});

			const result = await response.json();

			if (result.success) {
				await loadProducts();
				alert(result.message);
			} else {
				alert(result.message);
			}
		} catch {
			alert('Error al eliminar producto');
		}
	}

	onMount(async () => {
		await Promise.all([loadProducts(), loadCategories()]);
		loading = false;
	});
</script>

<div class="min-h-screen bg-gray-50 p-6">
	<div class="mx-auto max-w-7xl">
		<div class="mb-6 flex items-center justify-between">
			<h1 class="text-3xl font-bold text-gray-900">Gestión de Productos</h1>
			<div class="flex flex-wrap gap-3">
				<a
					href="/admin/categories"
					class="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
				>
					Gestionar Categorías
				</a>
				<a
					href="/admin/formats"
					class="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
				>
					Gestionar Formatos
				</a>
				<a
					href="/admin/stock"
					class="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
				>
					Gestión de Stock
				</a>
				<a
					href="/admin/suppliers"
					class="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
				>
					Proveedores
				</a>
				<a
					href="/admin/purchases"
					class="rounded-lg bg-teal-600 px-4 py-2 text-white hover:bg-teal-700"
				>
					Compras
				</a>
				<a
					href="/admin/reports"
					class="rounded-lg bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
				>
					Reportes
				</a>
				<button
					onclick={openCreateModal}
					class="rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
				>
					Nuevo Producto
				</button>
			</div>
		</div>

		{#if loading}
			<div class="py-8 text-center">
				<div class="text-gray-900">Cargando productos...</div>
			</div>
		{:else if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4">
				<div class="text-red-600">{error}</div>
				<button onclick={loadProducts} class="mt-2 text-red-600 underline"> Reintentar </button>
			</div>
		{:else}
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
							>
								Producto
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
							>
								Categoría
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
							>
								Stock
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
							>
								Precios
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
							>
								Estado
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
							>
								Acciones
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each products as product (product.id)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div>
										<div class="text-sm font-medium text-gray-900">{product.name}</div>
										{#if product.description}
											<div class="text-sm text-gray-900">{product.description}</div>
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
									<div class="text-sm text-gray-900">{product.stock}</div>
									{#if Number(product.stock) <= Number(product.stockMin)}
										<div class="text-xs text-red-600">Stock bajo</div>
									{/if}
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm text-gray-900">
										{#each product.saleFormats as format}
											<div>{format.label}: ${format.price}</div>
										{/each}
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="inline-flex rounded-full px-2 text-xs leading-5 font-semibold {product.status ===
										'ACTIVO'
											? 'bg-green-100 text-green-800'
											: 'bg-red-100 text-red-800'}"
									>
										{product.status}
									</span>
								</td>
								<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
									<button
										onclick={() => openEditModal(product)}
										class="mr-3 text-amber-600 hover:text-amber-900"
									>
										Editar
									</button>
									<button
										onclick={() => deleteProduct(product.id)}
										class="text-red-600 hover:text-red-900"
									>
										Eliminar
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<!-- Modal Crear/Editar -->
{#if showCreateModal || showEditModal}
	<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
		<div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white">
			<div class="p-6">
				<h2 class="mb-4 text-xl font-semibold text-gray-900">
					{showEditModal ? 'Editar Producto' : 'Nuevo Producto'}
				</h2>

				<form onsubmit={saveProduct}>
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div class="md:col-span-2">
							<label for="product-name" class="mb-1 block text-sm font-medium text-gray-900">
								Nombre *
							</label>
							<input
								id="product-name"
								type="text"
								bind:value={formData.name}
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
								required
							/>
						</div>

						<div class="md:col-span-2">
							<label for="product-description" class="mb-1 block text-sm font-medium text-gray-900">
								Descripción
							</label>
							<textarea
								id="product-description"
								bind:value={formData.description}
								rows="3"
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
							></textarea>
						</div>

						<div>
							<label for="product-category" class="mb-1 block text-sm font-medium text-gray-900">
								Categoría
							</label>
							<select
								id="product-category"
								bind:value={formData.categoryId}
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
							>
								<option value="">Sin categoría</option>
								{#each categories as category}
									<option value={category.id}>{category.name}</option>
								{/each}
							</select>
						</div>

						{#if showEditModal}
							<div>
								<label for="product-status" class="mb-1 block text-sm font-medium text-gray-900">
									Estado
								</label>
								<select
									id="product-status"
									bind:value={formData.status}
									class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
								>
									<option value="ACTIVO">Activo</option>
									<option value="INACTIVO">Inactivo</option>
								</select>
							</div>
						{/if}

						<div>
							<label for="product-stock" class="mb-1 block text-sm font-medium text-gray-900">
								Stock Actual
							</label>
							<input
								id="product-stock"
								type="number"
								step="0.001"
								bind:value={formData.stock}
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
							/>
						</div>

						<div>
							<label for="product-stock-min" class="mb-1 block text-sm font-medium text-gray-900">
								Stock Mínimo
							</label>
							<input
								id="product-stock-min"
								type="number"
								step="0.001"
								bind:value={formData.stockMin}
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
							/>
						</div>

						<div class="md:col-span-2">
							<label for="product-is-perishable" class="flex items-center">
								<input
									id="product-is-perishable"
									type="checkbox"
									bind:checked={formData.isPerishable}
									class="mr-2"
								/>
								<span class="text-sm font-medium text-gray-900">Producto perecedero</span>
							</label>
						</div>
					</div>

					<div class="mt-6">
						<div class="mb-3 flex items-center justify-between">
							<h3 class="text-lg font-medium text-gray-900">Formatos de Venta</h3>
							<button
								type="button"
								onclick={addSaleFormat}
								class="text-sm text-amber-600 hover:text-amber-700"
							>
								+ Agregar formato
							</button>
						</div>

						<div class="space-y-3">
							{#each formData.saleFormats as format, index}
								<div class="flex items-center gap-2">
									<select
										bind:value={format.unitMeasure}
										class="rounded-md border border-gray-300 px-3 py-2 text-gray-900"
									>
										<option value="UNIDAD">Unidad</option>
										<option value="DOCENA">Docena</option>
										<option value="MEDIA_DOCENA">Media Docena</option>
										<option value="KILOGRAMO">Kilogramo</option>
										<option value="PORCION">Porción</option>
									</select>

									<input
										type="text"
										bind:value={format.label}
										placeholder="Etiqueta"
										class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900"
									/>

									<input
										type="number"
										step="0.01"
										bind:value={format.price}
										placeholder="Precio"
										class="w-24 rounded-md border border-gray-300 px-3 py-2 text-gray-900"
									/>

									{#if formData.saleFormats.length > 1}
										<button
											type="button"
											onclick={() => removeSaleFormat(index)}
											class="text-red-600 hover:text-red-700"
										>
											×
										</button>
									{/if}
								</div>
							{/each}
						</div>
					</div>

					<div class="mt-6 flex justify-end gap-3">
						<button
							type="button"
							onclick={() => {
								showCreateModal = false;
								showEditModal = false;
								selectedProduct = null;
								resetForm();
							}}
							class="rounded-md border border-gray-300 px-4 py-2 text-gray-900 hover:bg-gray-50"
						>
							Cancelar
						</button>
						<button
							type="submit"
							class="rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
						>
							{showEditModal ? 'Actualizar' : 'Crear'}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
