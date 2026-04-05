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
			return total + (item.quantity * item.unitPrice);
		}, 0);
	}

	async function savePurchase() {
		try {
			// Validaciones
			if (!formData.supplierId) {
				alert('Debe seleccionar un proveedor');
				return;
			}

			if (formData.items.length === 0 || formData.items.some(item => !item.productId)) {
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
	<div class="max-w-7xl mx-auto">
		<div class="flex justify-between items-center mb-6">
			<h1 class="text-3xl font-bold text-gray-900">Gestión de Compras</h1>
			<button
				onclick={openCreateModal}
				class="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700"
			>
				Nueva Compra
			</button>
		</div>

		{#if loading}
			<div class="text-center py-8">
				<div class="text-gray-500">Cargando compras...</div>
			</div>
		{:else if error}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4">
				<div class="text-red-600">{error}</div>
				<button onclick={loadData} class="mt-2 text-red-600 underline">
					Reintentar
				</button>
			</div>
		{:else}
			<div class="bg-white shadow rounded-lg overflow-hidden">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Compra
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Proveedor
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Items
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Total
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Estado
							</th>
							<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Fecha
							</th>
						</tr>
					</thead>
					<tbody class="bg-white divide-y divide-gray-200">
						{#each purchases as purchase (purchase.id)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">#{purchase.purchaseNumber}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm text-gray-900">{purchase.supplier?.name}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
										{purchase._count?.items || 0} items
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">${purchase.total}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-{getPurchaseStatusColor(purchase.status)}-100 text-{getPurchaseStatusColor(purchase.status)}-800">
										{getPurchaseStatusLabel(purchase.status)}
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
		<div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
			<div class="p-6">
				<h2 class="text-xl font-semibold mb-4">Nueva Compra</h2>

				<form onsubmit={savePurchase}>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
						<div>
							<label for="purchase-supplier" class="block text-sm font-medium text-gray-700 mb-1">
								Proveedor *
							</label>
							<select id="purchase-supplier" bind:value={formData.supplierId} class="w-full px-3 py-2 border border-gray-300 rounded-md" required>
								<option value="">Seleccionar proveedor</option>
								{#each suppliers as supplier}
									<option value={supplier.id}>{supplier.name}</option>
								{/each}
							</select>
						</div>

						<div>
							<label for="purchase-notes" class="block text-sm font-medium text-gray-700 mb-1">
								Notas
							</label>
							<input
								id="purchase-notes"
								type="text"
								bind:value={formData.notes}
								placeholder="Notas de la compra"
								class="w-full px-3 py-2 border border-gray-300 rounded-md"
							/>
						</div>
					</div>

					<div class="mb-6">
						<div class="flex justify-between items-center mb-3">
							<h3 class="text-lg font-medium">Productos</h3>
							<button
								type="button"
								onclick={addPurchaseItem}
								class="text-amber-600 hover:text-amber-700 text-sm"
							>
								+ Agregar producto
							</button>
						</div>

						<div class="space-y-3">
							{#each formData.items as item, index}
								<div class="flex gap-2 items-center p-3 border rounded-lg bg-gray-50">
									<select bind:value={item.productId} class="flex-1 px-3 py-2 border border-gray-300 rounded-md">
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
										class="w-24 px-3 py-2 border border-gray-300 rounded-md"
									/>

									<input
										type="number"
										step="0.01"
										bind:value={item.unitPrice}
										placeholder="Precio unit."
										class="w-32 px-3 py-2 border border-gray-300 rounded-md"
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
						<div class="flex justify-between items-center mb-4">
							<span class="text-lg font-medium">Total:</span>
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
							class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
						>
							Cancelar
						</button>
						<button
							type="submit"
							class="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700"
						>
							Registrar Compra
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
