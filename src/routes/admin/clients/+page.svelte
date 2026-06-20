<script lang="ts">
	import { onMount } from 'svelte';

	interface Client {
		id: string;
		name: string;
		phone: string | null;
		address: string | null;
		email: string | null;
		accountDebt: number;
		active: boolean;
		createdAt: string;
		updatedAt: string;
	}

	let clients = $state<Client[]>([]);
	let loading = $state(false);
	let error = $state('');

	// Búsqueda
	let searchQuery = $state('');

	// Modal de crear/editar
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let editingClient = $state<Client | null>(null);
	let saving = $state(false);

	// Formulario
	let name = $state('');
	let phone = $state('');
	let address = $state('');
	let email = $state('');

	async function loadClients() {
		try {
			loading = true;
			const response = await fetch('/api/clients');
			if (response.ok) {
				const data = await response.json();
				clients = data.data;
			}
		} catch {
			error = 'Error al cargar clientes';
		} finally {
			loading = false;
		}
	}

	async function createClient() {
		saving = true;
		try {
			const response = await fetch('/api/clients', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					phone: phone || null,
					address: address || null,
					email: email || null
				})
			});

			if (response.ok) {
				await loadClients();
				showCreateModal = false;
				resetForm();
			} else {
				const data = await response.json();
				error = data.message || 'Error al crear cliente';
			}
		} catch {
			error = 'Error al crear cliente';
		} finally {
			saving = false;
		}
	}

	async function updateClient() {
		if (!editingClient) return;

		saving = true;
		try {
			const response = await fetch(`/api/clients/${editingClient.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name,
					phone: phone || null,
					address: address || null,
					email: email || null
				})
			});

			if (response.ok) {
				await loadClients();
				showEditModal = false;
				resetForm();
				editingClient = null;
			} else {
				const data = await response.json();
				error = data.message || 'Error al actualizar cliente';
			}
		} catch {
			error = 'Error al actualizar cliente';
		} finally {
			saving = false;
		}
	}

	async function deactivateClient(client: Client) {
		if (!confirm(`¿Estás seguro de desactivar el cliente "${client.name}"?`)) return;

		try {
			const response = await fetch(`/api/clients/${client.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ active: false })
			});

			if (response.ok) {
				await loadClients();
			} else {
				const data = await response.json();
				error = data.message || 'Error al desactivar cliente';
			}
		} catch {
			error = 'Error al desactivar cliente';
		}
	}

	function openEditModal(client: Client) {
		editingClient = client;
		name = client.name;
		phone = client.phone || '';
		address = client.address || '';
		email = client.email || '';
		showEditModal = true;
	}

	function resetForm() {
		name = '';
		phone = '';
		address = '';
		email = '';
	}

	onMount(() => {
		loadClients();
	});

	const filteredClients = $derived(
		clients.filter(
			(client) =>
				client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				client.phone?.includes(searchQuery) ||
				client.email?.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);
</script>

<main class="container mx-auto px-4 py-6">
	<div class="mb-6">
		<h1 class="text-3xl font-bold text-gray-900">Clientes</h1>
		<p class="text-gray-600">Gestión de clientes y cuentas corrientes</p>
	</div>

	<!-- Buscador y acciones -->
	<div class="mb-6 rounded-lg bg-white p-4 shadow-md">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div class="flex-1">
				<label for="search-client" class="mb-1 block text-sm font-medium text-gray-700"
					>Buscar cliente</label
				>
				<input
					id="search-client"
					type="text"
					bind:value={searchQuery}
					placeholder="Nombre, teléfono o email..."
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
				/>
			</div>
			<div class="flex items-end">
				<button
					onclick={() => {
						resetForm();
						showCreateModal = true;
					}}
					class="rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
				>
					+ Nuevo Cliente
				</button>
			</div>
		</div>
	</div>

	<!-- Error message -->
	{#if error}
		<div class="mb-4 rounded-md bg-red-50 p-4 text-red-800">
			{error}
		</div>
	{/if}

	<!-- Listado de clientes -->
	{#if loading}
		<div class="flex items-center justify-center py-8">
			<div class="text-gray-500">Cargando clientes...</div>
		</div>
	{:else if filteredClients.length === 0}
		<div class="rounded-lg bg-white p-8 text-center shadow-md">
			<p class="text-gray-500">
				{searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados'}
			</p>
		</div>
	{:else}
		<div class="overflow-hidden rounded-lg bg-white shadow-md">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							Nombre
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							Teléfono
						</th>
						<th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							Email
						</th>
						<th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
							Deuda
						</th>
						<th class="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
							Acciones
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#each filteredClients as client}
						<tr class="hover:bg-gray-50">
							<td class="whitespace-nowrap px-6 py-4">
								<div class="text-sm font-medium text-gray-900">{client.name}</div>
								{#if client.address}
									<div class="text-xs text-gray-500">{client.address}</div>
								{/if}
							</td>
							<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
								{client.phone || '-'}
							</td>
							<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
								{client.email || '-'}
							</td>
							<td class="whitespace-nowrap px-6 py-4 text-right text-sm">
								{#if client.accountDebt > 0}
									<span class="font-medium text-red-600">
										${Number(client.accountDebt).toFixed(2)}
									</span>
								{:else}
									<span class="text-gray-500">$0.00</span>
								{/if}
							</td>
							<td class="whitespace-nowrap px-6 py-4 text-center text-sm">
								<div class="flex justify-center gap-2">
									<a
										href="/admin/clients/{client.id}"
										class="rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700"
										title="Ver cuenta"
									>
										Ver cuenta
									</a>
									<button
										onclick={() => openEditModal(client)}
										class="rounded bg-amber-600 px-3 py-1 text-white hover:bg-amber-700"
										title="Editar"
									>
										Editar
									</button>
									<button
										onclick={() => deactivateClient(client)}
										class="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
										title="Desactivar"
									>
										Desactivar
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</main>

<!-- Modal de crear cliente -->
{#if showCreateModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
		<div class="w-full max-w-md rounded-lg bg-white shadow-xl">
			<div class="border-b px-6 py-4">
				<h2 class="text-xl font-semibold text-gray-900">Nuevo Cliente</h2>
				<button
					onclick={() => (showCreateModal = false)}
					class="float-right text-gray-400 hover:text-gray-600">✕</button
				>
			</div>
			<form onsubmit={createClient} class="p-6">
				<div class="space-y-4">
					<div>
						<label for="client-name" class="block text-sm font-medium text-gray-700"
							>Nombre *</label
						>
						<input
							id="client-name"
							type="text"
							bind:value={name}
							required
							class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
						/>
					</div>
					<div>
						<label for="client-phone" class="block text-sm font-medium text-gray-700"
							>Teléfono</label
						>
						<input
							id="client-phone"
							type="text"
							bind:value={phone}
							class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
						/>
					</div>
					<div>
						<label for="client-address" class="block text-sm font-medium text-gray-700"
							>Dirección</label
						>
						<input
							id="client-address"
							type="text"
							bind:value={address}
							class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
						/>
					</div>
					<div>
						<label for="client-email" class="block text-sm font-medium text-gray-700"
							>Email</label
						>
						<input
							id="client-email"
							type="email"
							bind:value={email}
							class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
						/>
					</div>
				</div>
				<div class="mt-6 flex justify-end gap-3">
					<button
						type="button"
						onclick={() => (showCreateModal = false)}
						class="rounded-md bg-gray-200 px-4 py-2 text-gray-900 hover:bg-gray-300"
					>
						Cancelar
					</button>
					<button
						type="submit"
						disabled={saving}
						class="rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:opacity-50"
					>
						{saving ? 'Guardando...' : 'Guardar'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Modal de editar cliente -->
{#if showEditModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
		<div class="w-full max-w-md rounded-lg bg-white shadow-xl">
			<div class="border-b px-6 py-4">
				<h2 class="text-xl font-semibold text-gray-900">Editar Cliente</h2>
				<button
					onclick={() => (showEditModal = false)}
					class="float-right text-gray-400 hover:text-gray-600">✕</button
				>
			</div>
			<form onsubmit={updateClient} class="p-6">
				<div class="space-y-4">
					<div>
						<label for="edit-client-name" class="block text-sm font-medium text-gray-700"
							>Nombre *</label
						>
						<input
							id="edit-client-name"
							type="text"
							bind:value={name}
							required
							class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
						/>
					</div>
					<div>
						<label for="edit-client-phone" class="block text-sm font-medium text-gray-700"
							>Teléfono</label
						>
						<input
							id="edit-client-phone"
							type="text"
							bind:value={phone}
							class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
						/>
					</div>
					<div>
						<label for="edit-client-address" class="block text-sm font-medium text-gray-700"
							>Dirección</label
						>
						<input
							id="edit-client-address"
							type="text"
							bind:value={address}
							class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
						/>
					</div>
					<div>
						<label for="edit-client-email" class="block text-sm font-medium text-gray-700"
							>Email</label
						>
						<input
							id="edit-client-email"
							type="email"
							bind:value={email}
							class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
						/>
					</div>
				</div>
				<div class="mt-6 flex justify-end gap-3">
					<button
						type="button"
						onclick={() => {
							showEditModal = false;
							resetForm();
							editingClient = null;
						}}
						class="rounded-md bg-gray-200 px-4 py-2 text-gray-900 hover:bg-gray-300"
					>
						Cancelar
					</button>
					<button
						type="submit"
						disabled={saving}
						class="rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:opacity-50"
					>
						{saving ? 'Guardando...' : 'Guardar'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
