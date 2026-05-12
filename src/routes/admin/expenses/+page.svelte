<script lang="ts">
	import { onMount } from 'svelte';
	import type { ExpenseCategory } from '@prisma/client';

	interface Expense {
		id: string;
		description: string;
		amount: number;
		category: ExpenseCategory;
		date: string;
		paymentMethod: string;
		supplierId: string | null;
		supplier: { id: string; name: string } | null;
		notes: string | null;
		userId: string;
		user: { id: string; name: string };
		cashRegisterId: string | null;
		cashRegister: { id: string; openedAt: string; status: string } | null;
		createdAt: string;
		updatedAt: string;
	}

	interface Supplier {
		id: string;
		name: string;
	}

	let expenses = $state<Expense[]>([]);
	let suppliers = $state<Supplier[]>([]);
	let loading = $state(false);
	let error = $state('');

	// Filtros
	let filterStartDate = $state('');
	let filterEndDate = $state('');
	let filterCategory = $state<ExpenseCategory | ''>('');
	let filterSupplierId = $state('');

	// Modal de crear/editar
	let showCreateModal = $state(false);
	let showEditModal = $state(false);
	let editingExpense = $state<Expense | null>(null);
	let saving = $state(false);

	// Formulario
	let description = $state('');
	let amount = $state('');
	let category = $state<ExpenseCategory>('OTRO');
	let date = $state(new Date().toISOString().split('T')[0]);
	let paymentMethod = $state('EFECTIVO');
	let supplierId = $state('');
	let notes = $state('');

	const categories: ExpenseCategory[] = ['PROVEEDOR', 'SERVICIO', 'INSUMO', 'OTRO'];
	const paymentMethods = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'QR'];

	async function loadExpenses() {
		try {
			loading = true;
			const params = new URLSearchParams();
			if (filterStartDate) params.append('startDate', filterStartDate);
			if (filterEndDate) params.append('endDate', filterEndDate);
			if (filterCategory) params.append('category', filterCategory);
			if (filterSupplierId) params.append('supplierId', filterSupplierId);

			const response = await fetch(`/api/expenses?${params}`);
			if (response.ok) {
				const data = await response.json();
				expenses = data.data;
			}
		} catch {
			error = 'Error al cargar gastos';
		} finally {
			loading = false;
		}
	}

	async function loadSuppliers() {
		try {
			const response = await fetch('/api/suppliers');
			if (response.ok) {
				const data = await response.json();
				suppliers = data.data;
			}
		} catch {
			console.error('Error loading suppliers');
		}
	}

	async function createExpense() {
		saving = true;
		try {
			const userId = localStorage.getItem('userId');
			if (!userId) {
				alert('Error: No hay usuario autenticado');
				return;
			}

			const response = await fetch('/api/expenses', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					description,
					amount: Number(amount),
					category,
					date,
					paymentMethod,
					supplierId: supplierId || null,
					notes,
					userId
				})
			});

			const result = await response.json();
			if (!result.success) {
				alert(`Error al crear gasto: ${result.message}`);
				return;
			}

			showCreateModal = false;
			resetForm();
			await loadExpenses();
		} catch {
			alert('Error al crear gasto');
		} finally {
			saving = false;
		}
	}

	async function updateExpense() {
		if (!editingExpense) return;

		saving = true;
		try {
			const response = await fetch(`/api/expenses/${editingExpense.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					description,
					amount: Number(amount),
					category,
					date,
					paymentMethod,
					supplierId: supplierId || null,
					notes
				})
			});

			const result = await response.json();
			if (!result.success) {
				alert(`Error al actualizar gasto: ${result.message}`);
				return;
			}

			showEditModal = false;
			editingExpense = null;
			resetForm();
			await loadExpenses();
		} catch {
			alert('Error al actualizar gasto');
		} finally {
			saving = false;
		}
	}

	async function deleteExpense(id: string) {
		if (!confirm('¿Estás seguro de eliminar este gasto?')) return;

		try {
			const response = await fetch(`/api/expenses/${id}`, {
				method: 'DELETE'
			});

			const result = await response.json();
			if (!result.success) {
				alert(`Error al eliminar gasto: ${result.message}`);
				return;
			}

			await loadExpenses();
		} catch {
			alert('Error al eliminar gasto');
		}
	}

	function openEditModal(expense: Expense) {
		editingExpense = expense;
		description = expense.description;
		amount = expense.amount.toString();
		category = expense.category;
		date = new Date(expense.date).toISOString().split('T')[0];
		paymentMethod = expense.paymentMethod;
		supplierId = expense.supplierId || '';
		notes = expense.notes || '';
		showEditModal = true;
	}

	function resetForm() {
		description = '';
		amount = '';
		category = 'OTRO';
		date = new Date().toISOString().split('T')[0];
		paymentMethod = 'EFECTIVO';
		supplierId = '';
		notes = '';
	}

	function formatCurrency(value: number) {
		return new Intl.NumberFormat('es-AR', {
			style: 'currency',
			currency: 'ARS'
		}).format(value);
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleDateString('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function getCategoryLabel(category: ExpenseCategory) {
		const labels: Record<ExpenseCategory, string> = {
			PROVEEDOR: '🏭 Proveedor',
			SERVICIO: '⚡ Servicio',
			INSUMO: '📦 Insumo',
			OTRO: '📝 Otro'
		};
		return labels[category];
	}

	function getCategoryColor(category: ExpenseCategory) {
		const colors: Record<ExpenseCategory, string> = {
			PROVEEDOR: 'bg-blue-100 text-blue-700',
			SERVICIO: 'bg-yellow-100 text-yellow-700',
			INSUMO: 'bg-green-100 text-green-700',
			OTRO: 'bg-gray-100 text-gray-700'
		};
		return colors[category];
	}

	async function applyFilters() {
		await loadExpenses();
	}

	async function clearFilters() {
		filterStartDate = '';
		filterEndDate = '';
		filterCategory = '';
		filterSupplierId = '';
		await loadExpenses();
	}

	onMount(async () => {
		await Promise.all([loadExpenses(), loadSuppliers()]);
	});
</script>

<div class="min-h-screen bg-gray-50">
	<main class="container mx-auto px-4 py-6">
		<div class="mb-6">
			<h1 class="text-3xl font-bold text-gray-900">Gastos</h1>
			<p class="text-gray-600">Registro de egresos y gastos operativos</p>
		</div>

		<!-- Filtros -->
		<div class="mb-6 rounded-lg bg-white p-4 shadow-md">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-5">
				<div>
					<label class="block text-sm font-medium text-gray-700">Fecha desde</label>
					<input
						type="date"
						bind:value={filterStartDate}
						class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700">Fecha hasta</label>
					<input
						type="date"
						bind:value={filterEndDate}
						class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
					/>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700">Categoría</label>
					<select
						bind:value={filterCategory}
						class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
					>
						<option value="">Todas</option>
						{#each categories as cat}
							<option value={cat}>{getCategoryLabel(cat)}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700">Proveedor</label>
					<select
						bind:value={filterSupplierId}
						class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
					>
						<option value="">Todos</option>
						{#each suppliers as supplier}
							<option value={supplier.id}>{supplier.name}</option>
						{/each}
					</select>
				</div>
				<div class="flex items-end gap-2">
					<button
						onclick={applyFilters}
						class="flex-1 rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
					>
						Filtrar
					</button>
					<button
						onclick={clearFilters}
						class="rounded-md bg-gray-200 px-4 py-2 text-gray-900 hover:bg-gray-300"
					>
						Limpiar
					</button>
				</div>
			</div>
		</div>

		<!-- Botón crear -->
		<div class="mb-6">
			<button
				onclick={() => (showCreateModal = true)}
				class="rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
			>
				+ Nuevo Gasto
			</button>
		</div>

		<!-- Lista de gastos -->
		{#if loading}
			<div class="py-8 text-center text-gray-600">Cargando...</div>
		{:else if expenses.length === 0}
			<div class="rounded-lg bg-white p-8 text-center shadow-md">
				<div class="text-gray-900">No hay gastos registrados</div>
				<button
					onclick={() => (showCreateModal = true)}
					class="mt-4 rounded bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
				>
					Crear Primer Gasto
				</button>
			</div>
		{:else}
			<div class="rounded-lg bg-white shadow-md">
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Fecha</th>
								<th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Descripción</th>
								<th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Categoría</th>
								<th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Monto</th>
								<th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Pago</th>
								<th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Proveedor</th>
								<th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Registrado por</th>
								<th class="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Acciones</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200">
							{#each expenses as expense}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 text-sm text-gray-900">{formatDate(expense.date)}</td>
									<td class="px-6 py-4">
										<div class="text-sm font-medium text-gray-900">{expense.description}</div>
										{#if expense.notes}
											<div class="text-xs text-gray-500">{expense.notes}</div>
										{/if}
									</td>
									<td class="px-6 py-4">
										<span class="rounded px-2 py-1 text-xs font-medium {getCategoryColor(expense.category)}">
											{getCategoryLabel(expense.category)}
										</span>
									</td>
									<td class="px-6 py-4 text-sm font-bold text-gray-900">{formatCurrency(expense.amount)}</td>
									<td class="px-6 py-4 text-sm text-gray-900">{expense.paymentMethod}</td>
									<td class="px-6 py-4 text-sm text-gray-900">
										{expense.supplier ? expense.supplier.name : '-'}
									</td>
									<td class="px-6 py-4 text-sm text-gray-900">{expense.user.name}</td>
									<td class="px-6 py-4 text-right">
										<button
											onclick={() => openEditModal(expense)}
											class="mr-2 text-amber-600 hover:text-amber-700"
										>
											Editar
										</button>
										<button
											onclick={() => deleteExpense(expense.id)}
											class="text-red-600 hover:text-red-700"
										>
											Eliminar
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</main>

	<!-- Modal Crear Gasto -->
	{#if showCreateModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
			<div class="w-full max-w-lg rounded-lg bg-white shadow-xl">
				<div class="border-b px-6 py-4">
					<h2 class="text-xl font-semibold text-gray-900">Nuevo Gasto</h2>
					<button onclick={() => (showCreateModal = false)} class="float-right text-gray-400 hover:text-gray-600">✕</button>
				</div>
				<form onsubmit={createExpense} class="p-6">
					<div class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-gray-700">Descripción *</label>
							<input
								type="text"
								bind:value={description}
								required
								class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
							/>
						</div>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-gray-700">Monto *</label>
								<input
									type="number"
									bind:value={amount}
									required
									min="0"
									step="0.01"
									class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700">Categoría *</label>
								<select
									bind:value={category}
									class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
								>
									{#each categories as cat}
										<option value={cat}>{getCategoryLabel(cat)}</option>
									{/each}
								</select>
							</div>
						</div>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-gray-700">Fecha *</label>
								<input
									type="date"
									bind:value={date}
									required
									class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700">Método de pago *</label>
								<select
									bind:value={paymentMethod}
									class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
								>
									{#each paymentMethods as method}
										<option value={method}>{method}</option>
									{/each}
								</select>
							</div>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700">Proveedor (opcional)</label>
							<select
								bind:value={supplierId}
								class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
							>
								<option value="">Sin proveedor</option>
								{#each suppliers as supplier}
									<option value={supplier.id}>{supplier.name}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700">Notas (opcional)</label>
							<textarea
								bind:value={notes}
								rows="2"
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
							class="rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:bg-gray-400"
						>
							{saving ? 'Guardando...' : 'Crear Gasto'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Modal Editar Gasto -->
	{#if showEditModal && editingExpense}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
			<div class="w-full max-w-lg rounded-lg bg-white shadow-xl">
				<div class="border-b px-6 py-4">
					<h2 class="text-xl font-semibold text-gray-900">Editar Gasto</h2>
					<button onclick={() => (showEditModal = false)} class="float-right text-gray-400 hover:text-gray-600">✕</button>
				</div>
				<form onsubmit={updateExpense} class="p-6">
					<div class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-gray-700">Descripción *</label>
							<input
								type="text"
								bind:value={description}
								required
								class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
							/>
						</div>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-gray-700">Monto *</label>
								<input
									type="number"
									bind:value={amount}
									required
									min="0"
									step="0.01"
									class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700">Categoría *</label>
								<select
									bind:value={category}
									class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
								>
									{#each categories as cat}
										<option value={cat}>{getCategoryLabel(cat)}</option>
									{/each}
								</select>
							</div>
						</div>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-gray-700">Fecha *</label>
								<input
									type="date"
									bind:value={date}
									required
									class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
								/>
							</div>
							<div>
								<label class="block text-sm font-medium text-gray-700">Método de pago *</label>
								<select
									bind:value={paymentMethod}
									class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
								>
									{#each paymentMethods as method}
										<option value={method}>{method}</option>
									{/each}
								</select>
							</div>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700">Proveedor (opcional)</label>
							<select
								bind:value={supplierId}
								class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
							>
								<option value="">Sin proveedor</option>
								{#each suppliers as supplier}
									<option value={supplier.id}>{supplier.name}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700">Notas (opcional)</label>
							<textarea
								bind:value={notes}
								rows="2"
								class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
							/>
						</div>
					</div>
					<div class="mt-6 flex justify-end gap-3">
						<button
							type="button"
							onclick={() => (showEditModal = false)}
							class="rounded-md bg-gray-200 px-4 py-2 text-gray-900 hover:bg-gray-300"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={saving}
							class="rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:bg-gray-400"
						>
							{saving ? 'Guardando...' : 'Actualizar Gasto'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
