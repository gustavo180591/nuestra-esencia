<script lang="ts">
	import { onMount } from 'svelte';
	import type { Category } from '$lib/types';

	let categories = $state<Category[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let selectedCategory = $state<Category | null>(null);

	// Form data
	let formData = $state({
		name: '',
		description: '',
		active: true
	});

	async function loadCategories() {
		try {
			const response = await fetch('/api/categories?includeInactive=true');
			const data = await response.json();

			if (data.success) {
				categories = data.data;
			} else {
				error = data.message;
			}
		} catch {
			error = 'Error al cargar categorías';
		}
	}

	function resetForm() {
		formData = {
			name: '',
			description: '',
			active: true
		};
	}

	function openCreateModal() {
		resetForm();
		showCreateModal = true;
	}

	function openEditModal(category: Category) {
		selectedCategory = category;
		formData = {
			name: category.name,
			description: category.description || '',
			active: category.active
		};
		showEditModal = true;
	}

	async function saveCategory() {
		try {
			const url = showEditModal ? `/api/categories/${selectedCategory?.id}` : '/api/categories';
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
				await loadCategories();
				showCreateModal = false;
				showEditModal = false;
				selectedCategory = null;
				resetForm();
				alert(result.message);
			} else {
				alert(result.message);
			}
		} catch {
			alert('Error al guardar categoría');
		}
	}

	async function deleteCategory(categoryId: string) {
		if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;

		try {
			const response = await fetch(`/api/categories/${categoryId}`, {
				method: 'DELETE'
			});

			const result = await response.json();

			if (result.success) {
				await loadCategories();
				alert(result.message);
			} else {
				alert(result.message);
			}
		} catch {
			alert('Error al eliminar categoría');
		}
	}

	onMount(async () => {
		await loadCategories();
		loading = false;
	});
</script>

<div class="min-h-screen bg-gray-50 p-6">
	<div class="mx-auto max-w-7xl">
		<div class="mb-6 flex items-center justify-between">
			<h1 class="text-3xl font-bold text-gray-900">Gestión de Categorías</h1>
			<button
				onclick={openCreateModal}
				class="rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
			>
				Nueva Categoría
			</button>
		</div>

		{#if loading}
			<div class="py-8 text-center">
				<div class="text-gray-500">Cargando categorías...</div>
			</div>
		{:else if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4">
				<div class="text-red-600">{error}</div>
				<button onclick={loadCategories} class="mt-2 text-red-600 underline"> Reintentar </button>
			</div>
		{:else}
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Categoría
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Productos Activos
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
						{#each categories as category (category.id)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div>
										<div class="text-sm font-medium text-gray-900">{category.name}</div>
										{#if category.description}
											<div class="text-sm text-gray-500">{category.description}</div>
										{/if}
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="inline-flex rounded-full bg-blue-100 px-2 text-xs leading-5 font-semibold text-blue-800"
									>
										{category._count?.products || 0}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="inline-flex rounded-full px-2 text-xs leading-5 font-semibold {category.active
											? 'bg-green-100 text-green-800'
											: 'bg-red-100 text-red-800'}"
									>
										{category.active ? 'Activa' : 'Inactiva'}
									</span>
								</td>
								<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
									<button
										onclick={() => openEditModal(category)}
										class="mr-3 text-amber-600 hover:text-amber-900"
									>
										Editar
									</button>
									{#if (category._count?.products || 0) === 0}
										<button
											onclick={() => deleteCategory(category.id)}
											class="text-red-600 hover:text-red-900"
										>
											Eliminar
										</button>
									{:else}
										<span class="text-xs text-gray-400">No se puede eliminar</span>
									{/if}
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
		<div class="w-full max-w-md rounded-lg bg-white">
			<div class="p-6">
				<h2 class="mb-4 text-xl font-semibold">
					{showEditModal ? 'Editar Categoría' : 'Nueva Categoría'}
				</h2>

				<form onsubmit={saveCategory}>
					<div class="space-y-4">
						<div>
							<label for="category-name" class="mb-1 block text-sm font-medium text-gray-700">
								Nombre *
							</label>
							<input
								id="category-name"
								type="text"
								bind:value={formData.name}
								class="w-full rounded-md border border-gray-300 px-3 py-2"
								required
							/>
						</div>

						<div>
							<label
								for="category-description"
								class="mb-1 block text-sm font-medium text-gray-700"
							>
								Descripción
							</label>
							<textarea
								id="category-description"
								bind:value={formData.description}
								rows="3"
								class="w-full rounded-md border border-gray-300 px-3 py-2"
							></textarea>
						</div>

						{#if showEditModal}
							<div>
								<label class="flex items-center">
									<input type="checkbox" bind:checked={formData.active} class="mr-2" />
									<span class="text-sm font-medium text-gray-700">Categoría activa</span>
								</label>
							</div>
						{/if}
					</div>

					<div class="mt-6 flex justify-end gap-3">
						<button
							type="button"
							onclick={() => {
								showCreateModal = false;
								showEditModal = false;
								selectedCategory = null;
								resetForm();
							}}
							class="rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
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
