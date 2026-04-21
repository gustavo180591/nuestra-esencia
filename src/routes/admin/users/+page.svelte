<script lang="ts">
	import { onMount } from 'svelte';
	import type { User } from '$lib/types';

	let users = $state<User[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let selectedUser = $state<User | null>(null);

	// Form data
	let formData = $state({
		name: '',
		email: '',
		password: '',
		role: 'CAJERO' as 'ADMIN' | 'CAJERO',
		active: true
		});

	async function loadUsers() {
		try {
			const response = await fetch('/api/users?includeInactive=true');
			const data = await response.json();

			if (data.success) {
				users = data.data;
			} else {
				error = data.message;
			}
		} catch {
			error = 'Error al cargar usuarios';
		}
	}

	function resetForm() {
		formData = {
			name: '',
			email: '',
			password: '',
			role: 'CAJERO',
			active: true
		};
	}

	function openCreateModal() {
		resetForm();
		showCreateModal = true;
	}

	function openEditModal(user: User) {
		selectedUser = user;
		formData = {
			name: user.name,
			email: user.email,
			password: '', // No mostramos la contraseña actual
			role: user.role as 'ADMIN' | 'CAJERO',
			active: user.active
		};
		showEditModal = true;
	}

	async function saveUser() {
		try {
			const url = showEditModal ? `/api/users/${selectedUser?.id}` : '/api/users';
			const method = showEditModal ? 'PUT' : 'POST';

			const dataToSend = showEditModal
				? { ...formData, ...(formData.password ? { password: formData.password } : {}) }
				: formData;

			const response = await fetch(url, {
				method,
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(dataToSend)
			});

			const result = await response.json();

			if (result.success) {
				await loadUsers();
				showCreateModal = false;
				showEditModal = false;
				selectedUser = null;
				resetForm();
				alert(result.message);
			} else {
				alert(result.message);
			}
		} catch {
			alert('Error al guardar usuario');
		}
	}

	async function deleteUser(userId: string) {
		if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

		try {
			const response = await fetch(`/api/users/${userId}`, {
				method: 'DELETE'
			});

			const result = await response.json();

			if (result.success) {
				await loadUsers();
				alert(result.message);
			} else {
				alert(result.message);
			}
		} catch {
			alert('Error al eliminar usuario');
		}
	}

	onMount(async () => {
		await loadUsers();
		loading = false;
	});
</script>

<div class="min-h-screen bg-gray-50 p-6">
	<div class="mx-auto max-w-7xl">
		<div class="mb-6 flex items-center justify-between">
			<h1 class="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
			<button
				onclick={openCreateModal}
				class="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
			>
				Nuevo Usuario
			</button>
		</div>

		{#if loading}
			<div class="py-8 text-center">
				<div class="text-gray-500">Cargando usuarios...</div>
			</div>
		{:else if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4">
				<div class="text-red-600">{error}</div>
				<button onclick={loadUsers} class="mt-2 text-red-600 underline"> Reintentar </button>
			</div>
		{:else}
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Usuario
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Email
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Rol
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
						{#each users as user (user.id)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">{user.name}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm text-gray-900">{user.email}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="inline-flex rounded-full px-2 text-xs leading-5 font-semibold {user.role === 'ADMIN'
											? 'bg-purple-100 text-purple-800'
											: 'bg-blue-100 text-blue-800'}"
									>
										{user.role === 'ADMIN' ? 'Administrador' : 'Cajero'}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="inline-flex rounded-full px-2 text-xs leading-5 font-semibold {user.active
											? 'bg-green-100 text-green-800'
											: 'bg-red-100 text-red-800'}"
									>
										{user.active ? 'Activo' : 'Inactivo'}
									</span>
								</td>
								<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
									<button
										onclick={() => openEditModal(user)}
										class="mr-3 text-amber-600 hover:text-amber-900"
									>
										Editar
									</button>
									<button
										onclick={() => deleteUser(user.id)}
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
		<div class="w-full max-w-md rounded-lg bg-white">
			<div class="p-6">
				<h2 class="mb-4 text-xl font-semibold text-gray-900">
					{showEditModal ? 'Editar Usuario' : 'Nuevo Usuario'}
				</h2>

				<form onsubmit={saveUser}>
					<div class="space-y-4">
						<div>
							<label for="user-name" class="mb-1 block text-sm font-medium text-gray-900">
								Nombre *
							</label>
							<input
								id="user-name"
								type="text"
								bind:value={formData.name}
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
								required
							/>
						</div>

						<div>
							<label for="user-email" class="mb-1 block text-sm font-medium text-gray-900">
								Email *
							</label>
							<input
								id="user-email"
								type="email"
								bind:value={formData.email}
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
								required
							/>
						</div>

						<div>
							<label for="user-password" class="mb-1 block text-sm font-medium text-gray-900">
								Contraseña {showEditModal ? '(dejar vacío para no cambiar)' : '*'}
							</label>
							<input
								id="user-password"
								type="password"
								bind:value={formData.password}
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
								required={!showEditModal}
							/>
						</div>

						<div>
							<label for="user-role" class="mb-1 block text-sm font-medium text-gray-900">
								Rol *
							</label>
							<select
								id="user-role"
								bind:value={formData.role}
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
								required
							>
								<option value="CAJERO">Cajero</option>
								<option value="ADMIN">Administrador</option>
							</select>
						</div>

						{#if showEditModal}
							<div>
								<label class="flex items-center">
									<input type="checkbox" bind:checked={formData.active} class="mr-2" />
									<span class="text-sm font-medium text-gray-900">Usuario activo</span>
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
								selectedUser = null;
								resetForm();
							}}
							class="rounded-md border border-gray-300 px-4 py-2 text-gray-900 hover:bg-gray-50"
							>
							Cancelar
						</button>
						<button
							type="submit"
							class="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
							>
							{showEditModal ? 'Actualizar' : 'Crear'}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
