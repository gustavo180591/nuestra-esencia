<script lang="ts">
	import { onMount } from 'svelte';
	import type { Purchase, Supplier, Product } from '$lib/types';

	let purchases = $state<Purchase[]>([]);
	let suppliers = $state<Supplier[]>([]);
	let products = $state<Product[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showCreateModal = $state(false);

	// Form data
	let formData = $state({
		supplierId: '',
		notes: '',
		items: [] as Array<{
			productId: string;
			quantity: number;
			unitPrice: number;
		}>
	});

	async function loadData() {
		try {
			const [purchasesRes, suppliersRes, productsRes] = await Promise.all([
				fetch('/api/purchases'),
				fetch('/api/suppliers'),
				fetch('/api/products')
			]);

			const purchasesData = await purchasesRes.json();
			const suppliersData = await suppliersRes.json();
			const productsData = await productsRes.json();

			if (purchasesData.success) purchases = purchasesData.data;
			if (suppliersData.success) suppliers = suppliersData.data;
			if (productsData.success) products = productsData.data;
		} catch {
			error = 'Error al cargar datos';
		}
	}

	function resetForm() {
		formData = {
			supplierId: '',
			notes: '',
			items: []
		};
	}

	function openCreateModal() {
		resetForm();
		showCreateModal = true;
	}

	function addPurchaseItem() {
		formData.items.push({
			productId: '',
			quantity: 1,
			unitPrice: 0
		});
	}

	function removePurchaseItem(index: number) {
		if (formData.items.length > 1) {
			formData.items.splice(index, 1);
		}
	}

	function calculateTotal() {
		return formData.items.reduce((total, item) => {
			return total + item.quantity * item.unitPrice;
		}, 0);
	}

	async function savePurchase() {
		try {
			// Validaciones
			if (!formData.supplierId) {
				alert('Debe seleccionar un proveedor');
				return;
			}

			if (formData.items.length === 0 || formData.items.some((item) => !item.productId)) {
				alert('Debe agregar al menos un producto válido');
				return;
			}

			const response = await fetch('/api/purchases', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});

			const result = await response.json();

			if (result.success) {
				await loadData();
				showCreateModal = false;
				resetForm();
				alert('Compra registrada exitosamente');
			} else {
				alert(result.message);
			}
		} catch {
			alert('Error al registrar compra');
		}
	}

	function getPurchaseStatusColor(status: string) {
		return status === 'REGISTRADA' ? 'green' : 'red';
	}

	function getPurchaseStatusLabel(status: string) {
		return status === 'REGISTRADA' ? 'Registrada' : 'Cancelada';
	}

	onMount(async () => {
		await loadData();
		loading = false;
	});
</script>

<div class="min-h-screen bg-gray-50 p-6">
	<div class="mx-auto max-w-7xl">
		<div class="mb-6 flex items-center justify-between">
			<h1 class="text-3xl font-bold text-gray-900">Gestión de Compras</h1>
			<button
				onclick={openCreateModal}
				class="rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
			>
				Nueva Compra
			</button>
		</div>

		{#if loading}
			<div class="py-8 text-center">
				<div class="text-gray-900">Cargando compras...</div>
			</div>
		{:else if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4">
				<div class="text-red-600">{error}</div>
				<button onclick={loadData} class="mt-2 text-red-600 underline"> Reintentar </button>
			</div>
		{:else}
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
							>
								Compra
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
							>
								Proveedor
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
							>
								Items
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
							>
								Total
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
							>
								Estado
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
							>
								Fecha
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each purchases as purchase (purchase.id)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">#{purchase.purchaseNumber}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm text-gray-900">{purchase.supplier?.name}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="inline-flex rounded-full bg-blue-100 px-2 text-xs leading-5 font-semibold text-blue-800"
									>
										{purchase._count?.items || 0} items
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">${purchase.total}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="inline-flex rounded-full px-2 text-xs leading-5 font-semibold bg-{getPurchaseStatusColor(
											purchase.status
										)}-100 text-{getPurchaseStatusColor(purchase.status)}-800"
									>
										{getPurchaseStatusLabel(purchase.status)}
									</span>
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
									{new Date(purchase.createdAt).toLocaleDateString('es-AR')}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<!-- Modal Nueva Compra -->
{#if showCreateModal}
	<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
		<div class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white">
			<div class="p-6">
				<h2 class="mb-4 text-xl font-semibold text-gray-900">Nueva Compra</h2>

				<form onsubmit={savePurchase}>
					<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<label for="purchase-supplier" class="mb-1 block text-sm font-medium text-gray-900">
								Proveedor *
							</label>
							<select
								id="purchase-supplier"
								bind:value={formData.supplierId}
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
								required
							>
								<option value="">Seleccionar proveedor</option>
								{#each suppliers as supplier}
									<option value={supplier.id}>{supplier.name}</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="purchase-notes" class="mb-1 block text-sm font-medium text-gray-900">
								Notas
							</label>
							<input
								id="purchase-notes"
								type="text"
								bind:value={formData.notes}
								placeholder="Notas de la compra"
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
							/>
						</div>
					</div>

					<div class="mb-6">
						<div class="mb-3 flex items-center justify-between">
							<h3 class="text-lg font-medium text-gray-900">Productos</h3>
							<button
								type="button"
								onclick={addPurchaseItem}
								class="text-sm text-amber-600 hover:text-amber-700"
							>
								+ Agregar producto
							</button>
						</div>

						<div class="space-y-3">
							{#each formData.items as item, index}
								<div class="flex items-center gap-2 rounded-lg border bg-gray-50 p-3">
									<select
										bind:value={item.productId}
										class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900"
									>
										<option value="">Seleccionar producto</option>
										{#each products as product}
											<option value={product.id}>{product.name}</option>
										{/each}
									</select>

									<input
										type="number"
										step="0.001"
										bind:value={item.quantity}
										placeholder="Cantidad"
										class="w-24 rounded-md border border-gray-300 px-3 py-2 text-gray-900"
									/>

									<input
										type="number"
										step="0.01"
										bind:value={item.unitPrice}
										placeholder="Precio unit."
										class="w-32 rounded-md border border-gray-300 px-3 py-2 text-gray-900"
									/>

									<div class="w-24 text-sm font-medium text-gray-900">
										${(item.quantity * item.unitPrice).toFixed(2)}
									</div>

									{#if formData.items.length > 1}
										<button
											type="button"
											onclick={() => removePurchaseItem(index)}
											class="text-red-600 hover:text-red-700"
										>
											×
										</button>
									{/if}
								</div>
							{/each}
						</div>
					</div>

					<div class="border-t pt-4">
						<div class="mb-4 flex items-center justify-between">
							<span class="text-lg font-medium text-gray-900">Total:</span>
							<span class="text-xl font-bold text-gray-900">${calculateTotal().toFixed(2)}</span>
						</div>
					</div>

					<div class="mt-6 flex justify-end gap-3">
						<button
							type="button"
							onclick={() => {
								showCreateModal = false;
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
							Registrar Compra
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
