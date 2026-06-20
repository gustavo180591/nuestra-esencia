<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	function formatCurrency(value: number | string | null | undefined) {
		const num = Number(value ?? 0);

		return new Intl.NumberFormat('es-AR', {
			style: 'currency',
			currency: 'ARS'
		}).format(Number.isNaN(num) ? 0 : num);
	}

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
		sales: Sale[];
	}

	interface SaleItem {
		id: string;
		productNameSnapshot: string;
		quantity: number;
		unitPrice: number;
		subtotal: number;
		unitMeasure: string;
	}

	interface PaymentMethod {
		id: string;
		code: string;
		name: string;
		icon: string | null;
	}

	interface Sale {
		id: string;
		saleNumber: number;
		total: number;
		createdAt: string;
		paymentDueDate: string | null;
		items: SaleItem[];
		paymentMethod: PaymentMethod;
		user: { id: string; name: string };
	}

	let client = $state<Client | null>(null);
	let loading = $state(false);
	let error = $state('');

	const { id } = $derived($page.params);

	async function loadClient() {
		try {
			loading = true;
			const response = await fetch(`/api/clients/${id}`);
			if (response.ok) {
				const data = await response.json();
				client = data.data;
			} else {
				const data = await response.json();
				error = data.message || 'Error al cargar cliente';
			}
		} catch {
			error = 'Error al cargar cliente';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadClient();
	});

	const recentSales = $derived(client?.sales.slice(0, 10) || []);

	const totalSales = $derived(
		client?.sales.reduce((sum, sale) => sum + Number(sale.total), 0) || 0
	);
</script>

<main class="container mx-auto px-4 py-6">
	{#if loading}
		<div class="flex items-center justify-center py-8">
			<div class="text-gray-500">Cargando cliente...</div>
		</div>
	{:else if error}
		<div class="rounded-md bg-red-50 p-4 text-red-800">
			{error}
		</div>
	{:else if client}
		<!-- Header -->
		<div class="mb-6">
			<a href="/admin/clients" class="text-sm text-amber-600 hover:text-amber-700">
				← Volver a clientes
			</a>
			<h1 class="mt-2 text-3xl font-bold text-gray-900">{client.name}</h1>
			<p class="text-gray-600">Detalle de cliente y cuenta corriente</p>
		</div>

		<!-- Datos del cliente -->
		<div class="mb-6 rounded-lg bg-white p-6 shadow-md">
			<h2 class="mb-4 text-xl font-semibold text-gray-900">Datos del Cliente</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
				<div>
					<div class="text-sm text-gray-500">Teléfono</div>
					<div class="text-sm font-medium text-gray-900">{client.phone || '-'}</div>
				</div>
				<div>
					<div class="text-sm text-gray-500">Email</div>
					<div class="text-sm font-medium text-gray-900">{client.email || '-'}</div>
				</div>
				<div>
					<div class="text-sm text-gray-500">Dirección</div>
					<div class="text-sm font-medium text-gray-900">{client.address || '-'}</div>
				</div>
				<div>
					<div class="text-sm text-gray-500">Estado</div>
					<div class="text-sm font-medium">
						{#if client.active}
							<span class="text-green-600">Activo</span>
						{:else}
							<span class="text-red-600">Inactivo</span>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Resumen de cuenta -->
		<div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
			<div class="rounded-lg bg-white p-6 shadow-md">
				<div class="text-sm text-gray-500">Deuda Actual</div>
				<div
					class="mt-2 text-2xl font-bold {client.accountDebt > 0
						? 'text-red-600'
						: 'text-green-600'}"
				>
					{formatCurrency(client.accountDebt)}
				</div>
			</div>
			<div class="rounded-lg bg-white p-6 shadow-md">
				<div class="text-sm text-gray-500">Total Ventas Cuenta Corriente</div>
				<div class="mt-2 text-2xl font-bold text-gray-900">
					{formatCurrency(totalSales)}
				</div>
			</div>
			<div class="rounded-lg bg-white p-6 shadow-md">
				<div class="text-sm text-gray-500">Cantidad de Ventas</div>
				<div class="mt-2 text-2xl font-bold text-gray-900">{client.sales.length}</div>
			</div>
		</div>

		<!-- Acciones -->
		<div class="mb-6 flex gap-3">
			<a
				href="/admin/clients/{client.id}/account"
				class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
			>
				Ver Cuenta Corriente
			</a>
			<a
				href="/admin/clients"
				class="rounded-md bg-gray-200 px-4 py-2 text-gray-900 hover:bg-gray-300"
			>
				Volver
			</a>
		</div>

		<!-- Qué llevó en cuenta corriente -->
		<div class="rounded-lg bg-white shadow-md">
			<div class="border-b px-6 py-4">
				<h2 class="text-xl font-semibold text-gray-900">Qué llevó en cuenta corriente</h2>
				<p class="text-sm text-gray-500">Detalle de lo que llevó el cliente cada día</p>
			</div>
			<div class="divide-y divide-gray-200">
				{#if recentSales.length === 0}
					<div class="p-6 text-sm text-gray-500">
						Este cliente todavía no tiene compras en cuenta corriente.
					</div>
				{:else}
					{#each recentSales as sale (sale.id)}
						<div class="p-6">
							<div class="mb-4 flex items-start justify-between">
								<div>
									<h3 class="font-semibold text-gray-900">
										Venta #{sale.saleNumber}
									</h3>
									<p class="text-sm text-gray-500">
										{new Date(sale.createdAt).toLocaleDateString('es-AR')}
										-
										{new Date(sale.createdAt).toLocaleTimeString('es-AR', {
											hour: '2-digit',
											minute: '2-digit'
										})}
									</p>
								</div>

								<div class="text-right">
									<div class="text-lg font-bold text-gray-900">
										{formatCurrency(sale.total)}
									</div>
									<div class="text-xs font-medium text-purple-600">Cuenta corriente</div>
								</div>
							</div>

							<div class="overflow-hidden rounded-lg border border-gray-200">
								<table class="w-full text-sm">
									<thead class="bg-gray-50">
										<tr>
											<th class="px-4 py-2 text-left font-medium text-gray-700">Producto</th>
											<th class="px-4 py-2 text-right font-medium text-gray-700">Cantidad</th>
											<th class="px-4 py-2 text-right font-medium text-gray-700">Precio</th>
											<th class="px-4 py-2 text-right font-medium text-gray-700">Subtotal</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-100 bg-white">
										{#each sale.items as item (item.id)}
											<tr>
												<td class="px-4 py-2 text-gray-900">
													{item.productNameSnapshot}
												</td>
												<td class="px-4 py-2 text-right text-gray-700">
													{item.quantity}
												</td>
												<td class="px-4 py-2 text-right text-gray-700">
													{formatCurrency(item.unitPrice)}
												</td>
												<td class="px-4 py-2 text-right font-medium text-gray-900">
													{formatCurrency(item.subtotal)}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</main>
