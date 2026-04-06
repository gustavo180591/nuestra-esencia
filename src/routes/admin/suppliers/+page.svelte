<script lang="ts">
	import { onMount } from 'svelte';
	import type { Supplier } from '$lib/types';

	let suppliers = $state<Supplier[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let selectedSupplier = $state<Supplier | null>(null);

	// Form data
	let formData = $state({
		name: '',
		phone: '',
		address: '',
		email: '',
		active: true
	});

	async function loadSuppliers() {
		try {
			const response = await fetch('/api/suppliers?includeInactive=true');
			const data = await response.json();

			if (data.success) {
				suppliers = data.data;
			} else {
				error = data.message;
			}
		} catch {
			error = 'Error al cargar proveedores';
		}
	}

	function resetForm() {
		formData = {
			name: '',
			phone: '',
			address: '',
			email: '',
			active: true
		};
	}

	function openCreateModal() {
		resetForm();
		showCreateModal = true;
	}

	function openEditModal(supplier: Supplier) {
		selectedSupplier = supplier;
		formData = {
			name: supplier.name,
			phone: supplier.phone || '',
			address: supplier.address || '',
			email: supplier.email || '',
			active: supplier.active
		};
		showEditModal = true;
	}

	async function saveSupplier() {
		try {
			const url = showEditModal ? `/api/suppliers/${selectedSupplier?.id}` : '/api/suppliers';
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
				await loadSuppliers();
				showCreateModal = false;
				showEditModal = false;
				selectedSupplier = null;
				resetForm();
				alert(result.message);
			} else {
				alert(result.message);
			}
		} catch {
			alert('Error al guardar proveedor');
		}
	}

	async function deleteSupplier(supplierId: string) {
		if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;

		try {
			const response = await fetch(`/api/suppliers/${supplierId}`, {
				method: 'DELETE'
			});

			const result = await response.json();

			if (result.success) {
				await loadSuppliers();
				alert(result.message);
			} else {
				alert(result.message);
			}
		} catch {
			alert('Error al eliminar proveedor');
		}
	}

	onMount(async () => {
		await loadSuppliers();
		loading = false;
	});
</script>

<div class="min-h-screen bg-gray-50 p-6">
	<div class="mx-auto max-w-7xl">
		<div class="mb-6 flex items-center justify-between">
			<h1 class="text-3xl font-bold text-gray-900">Gestión de Proveedores</h1>
			<button
				onclick={openCreateModal}
				class="rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
			>
				Nuevo Proveedor
			</button>
		</div>

		{#if loading}
			<div class="py-8 text-center">
				<div class="text-gray-500">Cargando proveedores...</div>
			</div>
		{:else if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4">
				<div class="text-red-600">{error}</div>
				<button onclick={loadSuppliers} class="mt-2 text-red-600 underline"> Reintentar </button>
			</div>
		{:else}
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Proveedor
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Contacto
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Compras
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
						{#each suppliers as supplier (supplier.id)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div>
										<div class="text-sm font-medium text-gray-900">{supplier.name}</div>
										{#if supplier.address}
											<div class="text-sm text-gray-500">{supplier.address}</div>
										{/if}
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm text-gray-900">
										{#if supplier.phone}
											<div>📞 {supplier.phone}</div>
										{/if}
										{#if supplier.email}
											<div>📧 {supplier.email}</div>
										{/if}
										{#if !supplier.phone && !supplier.email}
											<span class="text-gray-400">Sin contacto</span>
										{/if}
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="inline-flex rounded-full bg-blue-100 px-2 text-xs leading-5 font-semibold text-blue-800"
									>
										{supplier._count?.purchases || 0} compras
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="inline-flex rounded-full px-2 text-xs leading-5 font-semibold {supplier.active
											? 'bg-green-100 text-green-800'
											: 'bg-red-100 text-red-800'}"
									>
										{supplier.active ? 'Activo' : 'Inactivo'}
									</span>
								</td>
								<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
									<button
										onclick={() => openEditModal(supplier)}
										class="mr-3 text-amber-600 hover:text-amber-900"
									>
										Editar
									</button>
									{#if (supplier._count?.purchases || 0) === 0}
										<button
											onclick={() => deleteSupplier(supplier.id)}
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
				<h2 class="mb-4 text-xl font-semibold text-gray-900">
					{showEditModal ? 'Editar Proveedor' : 'Nuevo Proveedor'}
				</h2>

				<form onsubmit={saveSupplier}>
					<div class="space-y-4">
						<div>
							<label for="supplier-name" class="mb-1 block text-sm font-medium text-gray-900">
								Nombre *
							</label>
							<input
								id="supplier-name"
								type="text"
								bind:value={formData.name}
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
								required
							/>
						</div>

						<div>
							<label for="supplier-phone" class="mb-1 block text-sm font-medium text-gray-900">
								Teléfono
							</label>
							<input
								id="supplier-phone"
								type="tel"
								bind:value={formData.phone}
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
							/>
						</div>

						<div>
							<label for="supplier-email" class="mb-1 block text-sm font-medium text-gray-900">
								Email
							</label>
							<input
								id="supplier-email"
								type="email"
								bind:value={formData.email}
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
							/>
						</div>

						<div>
							<label for="supplier-address" class="mb-1 block text-sm font-medium text-gray-900">
								Dirección
							</label>
							<textarea
								id="supplier-address"
								bind:value={formData.address}
								rows="3"
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
							></textarea>
						</div>

						{#if showEditModal}
							<div>
								<label class="flex items-center">
									<input type="checkbox" bind:checked={formData.active} class="mr-2" />
									<span class="text-sm font-medium text-gray-900">Proveedor activo</span>
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
								selectedSupplier = null;
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
