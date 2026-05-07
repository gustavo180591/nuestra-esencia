<script lang="ts">
	import { onMount } from 'svelte';

	interface PaymentMethod {
		id: string;
		code: string;
		name: string;
		description?: string;
		icon?: string;
		active: boolean;
		sortOrder: number;
		createdAt: string;
		updatedAt: string;
	}

	let methods = $state<PaymentMethod[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let editingMethod = $state<PaymentMethod | null>(null);
	let showInactive = $state(false);
	let saving = $state(false);

	async function loadMethods() {
		loading = true;
		error = '';
		try {
			const params = new URLSearchParams();
			if (showInactive) params.append('includeInactive', 'true');

			const response = await fetch(`/api/payment-methods?${params.toString()}`);
			if (response.ok) {
				const data = await response.json();
				methods = data.data;
			} else {
				error = 'Error al cargar métodos de pago';
			}
		} catch {
			error = 'Error al cargar métodos de pago';
		} finally {
			loading = false;
		}
	}

	async function handleCreateSubmit(event: Event) {
		event.preventDefault();
		saving = true;

		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);

		const methodData = {
			name: formData.get('name') as string,
			code: formData.get('code') as string,
			description: formData.get('description') as string,
			icon: formData.get('icon') as string,
			sortOrder: parseInt(formData.get('sortOrder') as string) || 1,
			active: formData.get('active') === 'on'
		};

		try {
			const response = await fetch('/api/payment-methods', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(methodData)
			});

			const result = await response.json();
			if (result.success) {
				showCreateModal = false;
				await loadMethods();
			} else {
				alert(`Error: ${result.message}`);
			}
		} catch {
			alert('Error al crear método de pago');
		} finally {
			saving = false;
		}
	}

	async function handleEditSubmit(event: Event) {
		event.preventDefault();
		saving = true;

		const form = event.target as HTMLFormElement;
		const formData = new FormData(form);

		const methodData = {
			name: formData.get('name') as string,
			code: formData.get('code') as string,
			description: formData.get('description') as string,
			icon: formData.get('icon') as string,
			sortOrder: parseInt(formData.get('sortOrder') as string) || 1,
			active: formData.get('active') === 'on'
		};

		try {
			const response = await fetch(`/api/payment-methods/${editingMethod!.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(methodData)
			});

			const result = await response.json();
			if (result.success) {
				showEditModal = false;
				editingMethod = null;
				await loadMethods();
			} else {
				alert(`Error: ${result.message}`);
			}
		} catch {
			alert('Error al actualizar método de pago');
		} finally {
			saving = false;
		}
	}

	async function deleteMethod(id: string) {
		if (!confirm('¿Está seguro de eliminar este método de pago?')) return;

		try {
			const response = await fetch(`/api/payment-methods/${id}`, {
				method: 'DELETE'
			});

			const result = await response.json();
			if (result.success) {
				await loadMethods();
			} else {
				alert(`Error: ${result.message}`);
			}
		} catch {
			alert('Error al eliminar método de pago');
		}
	}

	async function toggleActive(id: string, currentActive: boolean) {
		try {
			const response = await fetch(`/api/payment-methods/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ active: !currentActive })
			});

			const result = await response.json();
			if (result.success) {
				await loadMethods();
			} else {
				alert(`Error: ${result.message}`);
			}
		} catch {
			alert('Error al cambiar estado del método de pago');
		}
	}

	function openCreateModal() {
		editingMethod = null;
		showCreateModal = true;
	}

	function openEditModal(method: PaymentMethod) {
		editingMethod = { ...method };
		showEditModal = true;
	}

	function closeModals() {
		showCreateModal = false;
		showEditModal = false;
		editingMethod = null;
	}

	function moveMethodUp(index: number) {
		if (index > 0) {
			const method = methods[index];
			const prevMethod = methods[index - 1];

			// Swap en array
			methods[index] = prevMethod;
			methods[index - 1] = method;

			// Update sortOrder
			methods.forEach((m, i) => {
				m.sortOrder = i + 1;
			});

			// Update backend
			updateSortOrders();
		}
	}

	async function moveMethodDown(index: number) {
		if (index < methods.length - 1) {
			const method = methods[index];
			const nextMethod = methods[index + 1];

			// Swap en array
			methods[index] = nextMethod;
			methods[index + 1] = method;

			// Update sortOrders
			methods.forEach((m, i) => {
				m.sortOrder = i + 1;
			});

			// Update backend
			updateSortOrders();
		}
	}

	async function updateSortOrders() {
		try {
			const updates = methods.map((method, index) =>
				fetch(`/api/payment-methods/${method.id}`, {
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ sortOrder: index + 1 })
				})
			);

			await Promise.all(updates);
			await loadMethods();
		} catch {
			console.error('Error updating sort orders');
		}
	}

	onMount(() => {
		loadMethods();
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
					<a href="/admin/payment-methods" class="font-medium text-white">Medios de Pago</a>
				</nav>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="container mx-auto px-4 py-6">
		<div class="mb-6">
			<div class="flex items-center justify-between">
				<h2 class="text-2xl font-semibold text-gray-900">Medios de Pago</h2>
				<div class="flex items-center space-x-4">
					<button
						onclick={openCreateModal}
						class="rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
					>
						Nuevo Medio de Pago
					</button>
					<label class="flex items-center">
						<input type="checkbox" bind:checked={showInactive} class="mr-2" />
						<span class="text-sm text-gray-700">Ver inactivos</span>
					</label>
				</div>
			</div>

			{#if error}
				<div class="rounded bg-red-50 p-4 text-red-700">
					{error}
					<button
						onclick={loadMethods}
						class="mt-2 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
					>
						Reintentar
					</button>
				</div>
			{:else if loading}
				<div class="py-8 text-center">
					<div class="text-gray-900">Cargando...</div>
				</div>
			{:else if methods.length === 0}
				<div class="py-8 text-center">
					<div class="text-gray-900">No hay medios de pago configurados</div>
					<button
						onclick={openCreateModal}
						class="mt-4 rounded bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
					>
						Crear Primer Medio de Pago
					</button>
				</div>
			{:else}
				<!-- Tabla de métodos de pago -->
				<div class="overflow-hidden rounded-lg border border-gray-200 shadow">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase"
									>Icono</th
								>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase"
									>Nombre</th
								>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase"
									>Código</th
								>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase"
									>Descripción</th
								>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase"
									>Orden</th
								>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase"
									>Estado</th
								>
								<th class="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase"
									>Acciones</th
								>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 bg-white">
							{#each methods as method, index (method.id)}
								<tr class="hover:bg-gray-50">
									<td class="px-4 py-2 text-sm">
										<span class="text-2xl">{method.icon || '💳'}</span>
									</td>
									<td class="px-4 py-2 text-sm font-medium text-gray-900">
										{method.name}
									</td>
									<td class="px-4 py-2 text-sm text-gray-500">
										{method.code}
									</td>
									<td class="px-4 py-2 text-sm text-gray-500">
										{method.description || '-'}
									</td>
									<td class="px-4 py-2 text-sm font-medium text-gray-900">
										{method.sortOrder}
									</td>
									<td class="px-4 py-2 text-sm">
										<span
											class={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${method.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
										>
											{method.active ? 'Activo' : 'Inactivo'}
										</span>
									</td>
									<td class="px-4 py-2 text-right text-sm">
										<div class="flex justify-end space-x-2">
											<!-- Flechas para reordenar -->
											{#if index > 0}
												<button
													onclick={() => moveMethodUp(index)}
													class="text-gray-400 hover:text-gray-600"
													title="Subir"
												>
													↑
												</button>
											{/if}
											{#if index < methods.length - 1}
												<button
													onclick={() => moveMethodDown(index)}
													class="text-gray-400 hover:text-gray-600"
													title="Bajar"
												>
													↓
												</button>
											{/if}

											<!-- Editar -->
											<button
												onclick={() => openEditModal(method)}
												class="mr-2 text-blue-600 hover:text-blue-800"
												title="Editar"
											>
												✏️
											</button>

											<!-- Activar/Desactivar -->
											<button
												onclick={() => toggleActive(method.id, method.active)}
												class={`${method.active ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'} mr-2`}
												title={method.active ? 'Desactivar' : 'Activar'}
											>
												{method.active ? '🔴' : '🟢'}
											</button>

											<!-- Eliminar -->
											<button
												onclick={() => deleteMethod(method.id)}
												class="text-red-600 hover:text-red-800"
												title="Eliminar"
											>
												🗑️
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</main>

	<!-- Modal Crear/Editar -->
	{#if showCreateModal || showEditModal}
		<div class="fixed inset-0 z-50 overflow-y-auto">
			<div class="bg-opacity-50 flex min-h-full items-center justify-center bg-black p-4">
				<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
					<div class="mb-4 flex items-center justify-between">
						<h3 class="text-lg font-semibold text-gray-900">
							{showEditModal ? 'Editar Medio de Pago' : 'Nuevo Medio de Pago'}
						</h3>
						<button onclick={closeModals} class="text-gray-400 hover:text-gray-600">✕</button>
					</div>

					<form onsubmit={showEditModal ? handleEditSubmit : handleCreateSubmit}>
						<div class="space-y-4">
							<div>
								<label for="name" class="block text-sm font-medium text-gray-700">Nombre</label>
								<input
									id="name"
									type="text"
									name="name"
									value={editingMethod?.name || ''}
									required
									class="w-full rounded-md border-gray-300 px-3 py-2 text-gray-900"
									placeholder="Ej: Efectivo"
								/>
							</div>

							<div>
								<label for="code" class="block text-sm font-medium text-gray-700">Código</label>
								<input
									id="code"
									type="text"
									name="code"
									value={editingMethod?.code || ''}
									required
									class="w-full rounded-md border-gray-300 px-3 py-2 text-gray-900"
									placeholder="Ej: EFECTIVO"
								/>
							</div>

							<div>
								<label for="description" class="block text-sm font-medium text-gray-700"
									>Descripción</label
								>
								<textarea
									id="description"
									name="description"
									value={editingMethod?.description || ''}
									rows="3"
									class="w-full rounded-md border-gray-300 px-3 py-2 text-gray-900"
									placeholder="Descripción opcional"
								></textarea>
							</div>

							<div>
								<label for="icon" class="block text-sm font-medium text-gray-700">Icono</label>
								<input
									id="icon"
									type="text"
									name="icon"
									value={editingMethod?.icon || ''}
									class="w-full rounded-md border-gray-300 px-3 py-2 text-gray-900"
									placeholder="Ej: 💵 o 📱"
								/>
							</div>

							<div>
								<label for="sortOrder" class="block text-sm font-medium text-gray-700">Orden</label>
								<input
									id="sortOrder"
									type="number"
									name="sortOrder"
									value={editingMethod?.sortOrder || 1}
									min="1"
									class="w-full rounded-md border-gray-300 px-3 py-2 text-gray-900"
								/>
							</div>

							<div>
								<label for="active" class="flex items-center">
									<input
										id="active"
										type="checkbox"
										name="active"
										checked={editingMethod?.active ?? true}
										class="mr-2"
									/>
									<span class="text-sm text-gray-700">Activo</span>
								</label>
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
								disabled={saving}
								class="rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:bg-gray-400"
							>
								{saving ? 'Guardando...' : showEditModal ? 'Actualizar' : 'Crear'}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	{/if}
</div>
