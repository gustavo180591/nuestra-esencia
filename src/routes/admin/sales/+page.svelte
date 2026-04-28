<script lang="ts">
	import { onMount } from 'svelte';

	interface Sale {
		id: string;
		saleNumber: number;
		status: 'COMPLETADA' | 'CANCELADA';
		total: string;
		paymentMethod: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
		items: Array<{
			id: string;
			productNameSnapshot: string;
			quantity: number;
			unitPrice: string;
			subtotal: string;
		}>;
		createdAt: string;
	}

	let sales = $state<Sale[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showDetailModal = $state(false);
	let selectedSale = $state<Sale | null>(null);
	let cancellingSaleId = $state<string | null>(null);
	let deletingSaleId = $state<string | null>(null);

	async function loadSales() {
		try {
			const response = await fetch('/api/sales');
			const data = await response.json();
			if (data.success) {
				sales = data.data;
			}
		} catch {
			error = 'Error al cargar ventas';
		} finally {
			loading = false;
		}
	}

	async function cancelSale(saleId: string, reason?: string) {
		cancellingSaleId = saleId;
		try {
			const response = await fetch(`/api/sales/${saleId}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ reason })
			});
			const data = await response.json();
			if (data.success) {
				sales = sales.map((s) => (s.id === saleId ? { ...s, status: 'CANCELADA' } : s));
				alert('Venta cancelada exitosamente');
			}
		} catch {
			alert('Error al cancelar venta');
		} finally {
			cancellingSaleId = null;
		}
	}

	async function deleteSale(saleId: string) {
		if (!confirm('¿Eliminar permanentemente esta venta?')) return;
		deletingSaleId = saleId;
		try {
			const response = await fetch(`/api/sales/${saleId}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ permanent: true })
			});
			const data = await response.json();
			if (data.success) {
				sales = sales.filter((s) => s.id !== saleId);
			}
		} catch {
			alert('Error al eliminar venta');
		} finally {
			deletingSaleId = null;
		}
	}

	function openDetailModal(sale: Sale) {
		selectedSale = sale;
		showDetailModal = true;
	}

	function closeDetailModal() {
		showDetailModal = false;
		selectedSale = null;
	}

	function confirmCancelSale(saleId: string) {
		const reason = prompt('¿Cancelar esta venta? El stock será restaurado.\nMotivo (opcional):');
		if (reason !== null) {
			cancelSale(saleId, reason);
		}
	}

	function getPaymentMethodLabel(method: string) {
		const labels: Record<string, string> = {
			EFECTIVO: 'Efectivo',
			TRANSFERENCIA: 'Transferencia',
			TARJETA: 'Tarjeta'
		};
		return labels[method] || method;
	}

	function getStatusColor(status: string) {
		return status === 'COMPLETADA' ? 'green' : 'red';
	}

	onMount(() => {
		loadSales();
	});
</script>

<div class="min-h-screen bg-gray-50 p-6">
	<div class="mx-auto max-w-7xl">
		<div class="mb-6">
			<h1 class="text-3xl font-bold text-gray-900">Gestión de Ventas</h1>
		</div>

		{#if loading}
			<div class="py-8 text-center text-gray-500">Cargando ventas...</div>
		{:else if error}
			<div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">{error}</div>
		{:else}
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
								>Venta</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
								>Fecha</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
								>Items</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
								>Total</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
								>Método</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
								>Estado</th
							>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-900 uppercase"
								>Acciones</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each sales as sale (sale.id)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">#{sale.saleNumber}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm text-gray-900">
										{new Date(sale.createdAt).toLocaleDateString('es-AR')}
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="inline-flex rounded-full bg-blue-100 px-2 text-xs font-semibold text-blue-800"
									>
										{sale.items.length} items
									</span>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-gray-900">${sale.total}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm text-gray-900">
										{getPaymentMethodLabel(sale.paymentMethod)}
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<span
										class="inline-flex rounded-full px-2 text-xs font-semibold bg-{getStatusColor(
											sale.status
										)}-100 text-{getStatusColor(sale.status)}-800"
									>
										{sale.status === 'COMPLETADA' ? 'Completada' : 'Cancelada'}
									</span>
								</td>
								<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
									<div class="flex gap-2">
										<button
											onclick={() => openDetailModal(sale)}
											class="text-amber-600 hover:text-amber-900"
										>
											Ver
										</button>
										{#if sale.status === 'COMPLETADA'}
											<button
												onclick={() => confirmCancelSale(sale.id)}
												disabled={cancellingSaleId === sale.id}
												class="text-red-600 hover:text-red-900"
											>
												{cancellingSaleId === sale.id ? 'Cancelando...' : 'Cancelar'}
											</button>
										{:else}
											<button
												onclick={() => deleteSale(sale.id)}
												disabled={deletingSaleId === sale.id}
												class="text-red-600 hover:text-red-900"
											>
												{deletingSaleId === sale.id ? 'Eliminando...' : 'Eliminar'}
											</button>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>
</div>

<!-- Modal Detalle -->
{#if showDetailModal && selectedSale}
	<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
		<div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white text-gray-900">
			<div class="p-6">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-xl font-semibold">Venta #{selectedSale.saleNumber}</h2>
					<button onclick={closeDetailModal} class="text-2xl text-gray-400 hover:text-gray-600"
						>×</button
					>
				</div>

				<div class="mb-4 grid grid-cols-2 gap-4">
					<div>
						<div class="text-xs text-gray-500">Fecha</div>
						<div class="text-sm font-medium">
							{new Date(selectedSale.createdAt).toLocaleString('es-AR')}
						</div>
					</div>
					<div>
						<div class="text-xs text-gray-500">Total</div>
						<div class="text-lg font-bold">${selectedSale.total}</div>
					</div>
				</div>

				<h3 class="mb-3 font-medium">Items</h3>
				<div class="overflow-hidden rounded-lg border">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th class="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase"
									>Producto</th
								>
								<th class="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase"
									>Cantidad</th
								>
								<th class="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase"
									>Precio</th
								>
								<th class="px-4 py-2 text-right text-xs font-medium text-gray-700 uppercase"
									>Subtotal</th
								>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 bg-white">
							{#each selectedSale.items as item}
								<tr>
									<td class="px-4 py-2 text-sm text-gray-900">{item.productNameSnapshot}</td>
									<td class="px-4 py-2 text-right text-sm text-gray-900">{item.quantity}</td>
									<td class="px-4 py-2 text-right text-sm text-gray-900">${item.unitPrice}</td>
									<td class="px-4 py-2 text-right text-sm font-medium text-gray-900"
										>${item.subtotal}</td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="mt-6 flex justify-end">
					<button
						onclick={closeDetailModal}
						class="rounded-md border border-gray-300 px-4 py-2 text-gray-900 hover:bg-gray-50"
					>
						Cerrar
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
