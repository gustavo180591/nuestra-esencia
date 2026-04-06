<script lang="ts">
	import { onMount } from 'svelte';
	import type { Product, ProductSaleFormat } from '$lib/types';

	let products = $state<Product[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showEditModal = $state(false);
	let selectedProduct = $state<Product | null>(null);

	// Form data for editing formats
	let formatsData = $state<
		Array<{
			id?: string;
			unitMeasure: 'UNIDAD' | 'DOCENA' | 'MEDIA_DOCENA' | 'KILOGRAMO' | 'PORCION';
			label: string;
			price: number;
			active: boolean;
		}>
	>([]);

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

	function openEditModal(product: Product) {
		selectedProduct = product;
		formatsData = product.saleFormats.map((format) => ({
			id: format.id,
			unitMeasure: format.unitMeasure,
			label: format.label || '',
			price: Number(format.price),
			active: format.active
		}));
		showEditModal = true;
	}

	function addFormat() {
		formatsData.push({
			unitMeasure: 'UNIDAD',
			label: '',
			price: 0,
			active: true
		});
	}

	function removeFormat(index: number) {
		if (formatsData.length > 1) {
			formatsData.splice(index, 1);
		}
	}

	async function saveFormats() {
		if (!selectedProduct) return;

		try {
			const response = await fetch(`/api/products/${selectedProduct.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: selectedProduct.name,
					description: selectedProduct.description,
					categoryId: selectedProduct.categoryId,
					status: selectedProduct.status,
					stock: Number(selectedProduct.stock),
					stockMin: Number(selectedProduct.stockMin),
					isPerishable: selectedProduct.isPerishable,
					saleFormats: formatsData
				})
			});

			const result = await response.json();

			if (result.success) {
				await loadProducts();
				showEditModal = false;
				selectedProduct = null;
				alert('Formatos de venta actualizados exitosamente');
			} else {
				alert(result.message);
			}
		} catch {
			alert('Error al guardar formatos');
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
			<h1 class="text-3xl font-bold text-gray-900">Gestión de Formatos de Venta</h1>
			<p class="mt-2 text-gray-600">Administra los formatos y precios de venta de cada producto</p>
		</div>

		{#if loading}
			<div class="py-8 text-center">
				<div class="text-gray-500">Cargando productos...</div>
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
								Formatos de Venta
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
									<div class="text-sm text-gray-900">
										{#each product.saleFormats.filter((f) => f.active) as format}
											<div class="mb-1">
												<span class="font-medium">{format.label}:</span>
												<span class="font-bold text-amber-600">${format.price}</span>
											</div>
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
										class="text-amber-600 hover:text-amber-900"
									>
										Editar Formatos
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

<!-- Modal Editar Formatos -->
{#if showEditModal && selectedProduct}
	<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
		<div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white">
			<div class="p-6">
				<h2 class="mb-4 text-xl font-semibold text-gray-900">
					Editar Formatos de Venta - {selectedProduct.name}
				</h2>

				<div class="mb-6">
					<div class="mb-3 flex items-center justify-between">
						<h3 class="text-lg font-medium text-gray-900">Formatos Actuales</h3>
						<button
							type="button"
							onclick={addFormat}
							class="text-sm text-amber-600 hover:text-amber-700"
						>
							+ Agregar formato
						</button>
					</div>

					<div class="space-y-3">
						{#each formatsData as format, index}
							<div class="rounded-lg border bg-gray-50 p-4">
								<div class="mb-3 flex items-center gap-2">
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
										placeholder="Etiqueta del formato"
										class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900"
									/>

									<input
										type="number"
										step="0.01"
										bind:value={format.price}
										placeholder="Precio"
										class="w-24 rounded-md border border-gray-300 px-3 py-2 text-gray-900"
									/>

									<label class="flex items-center">
										<input type="checkbox" bind:checked={format.active} class="mr-2" />
										<span class="text-sm">Activo</span>
									</label>

									{#if formatsData.length > 1}
										<button
											type="button"
											onclick={() => removeFormat(index)}
											class="text-red-600 hover:text-red-700"
										>
											×
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>

				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={() => {
							showEditModal = false;
							selectedProduct = null;
							formatsData = [];
						}}
						class="rounded-md border border-gray-300 px-4 py-2 text-gray-900 hover:bg-gray-50"
					>
						Cancelar
					</button>
					<button
						type="button"
						onclick={saveFormats}
						class="rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
					>
						Guardar Formatos
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
