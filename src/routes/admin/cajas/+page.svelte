<script lang="ts">
	import { onMount } from 'svelte';
	import { db } from '$lib/server/db';

	let cashRegisters = $state<any[]>([]);
	let selectedRegister = $state<any>(null);
	let showDetails = $state(false);
	let loading = $state(true);

	onMount(async () => {
		await loadCashRegisters();
	});

	async function loadCashRegisters() {
		try {
			const response = await fetch('/api/cash-register?status=CERRADA');
			const data = await response.json();
			if (data.success) {
				cashRegisters = data.data;
			}
		} catch (error) {
			console.error('Error loading cash registers:', error);
		} finally {
			loading = false;
		}
	}

	function formatCurrency(amount: number) {
		return new Intl.NumberFormat('es-AR', {
			style: 'currency',
			currency: 'ARS'
		}).format(amount);
	}

	function formatDate(date: string) {
		return new Date(date).toLocaleString('es-AR');
	}

	function selectRegister(register: any) {
		selectedRegister = register;
		showDetails = true;
	}
</script>

<div class="min-h-screen bg-gray-50 p-8">
	<div class="mx-auto max-w-7xl">
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900">Historial de Cajas</h1>
			<p class="mt-2 text-gray-600">Consulta el historial de aperturas y cierres de caja</p>
		</div>

		{#if loading}
			<div class="flex items-center justify-center py-12">
				<div class="text-gray-500">Cargando...</div>
			</div>
		{:else if cashRegisters.length === 0}
			<div class="rounded-lg bg-white p-12 text-center shadow">
				<div class="text-gray-500">No hay cajas cerradas registradas</div>
			</div>
		{:else}
			<div class="overflow-hidden rounded-lg bg-white shadow">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Fecha Apertura
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Fecha Cierre
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Sucursal
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Turno
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Responsable
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Monto Inicial
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							>
								Diferencia
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
						{#each cashRegisters as register (register.id)}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
									{formatDate(register.openedAt)}
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
									{register.closedAt ? formatDate(register.closedAt) : '-'}
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
									{register.branch || '-'}
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
									{register.shift || '-'}
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
									{register.openedBy?.name || '-'}
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
									{formatCurrency(Number(register.initialAmount))}
								</td>
								<td class="px-6 py-4 text-sm font-medium whitespace-nowrap">
									{#if register.difference === 0}
										<span class="text-green-600">{formatCurrency(0)}</span>
									{:else if register.difference && register.difference > 0}
										<span class="text-yellow-600">{formatCurrency(register.difference)}</span>
									{:else}
										<span class="text-red-600">{formatCurrency(register.difference || 0)}</span>
									{/if}
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap">
									{#if register.difference === 0}
										<span
											class="inline-flex rounded-full bg-green-100 px-2 text-xs leading-5 font-semibold text-green-800"
										>
											Cuadrado
										</span>
									{:else if register.difference && register.difference > 0}
										<span
											class="inline-flex rounded-full bg-yellow-100 px-2 text-xs leading-5 font-semibold text-yellow-800"
										>
											Sobrante
										</span>
									{:else}
										<span
											class="inline-flex rounded-full bg-red-100 px-2 text-xs leading-5 font-semibold text-red-800"
										>
											Faltante
										</span>
									{/if}
								</td>
								<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
									<button
										onclick={() => selectRegister(register)}
										class="text-blue-600 hover:text-blue-900"
									>
										Ver Detalles
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Modal de Detalles -->
	{#if showDetails && selectedRegister}
		<div class="fixed inset-0 z-50 overflow-y-auto">
			<div class="bg-opacity-50 flex min-h-full items-center justify-center bg-black p-4">
				<div class="w-full max-w-4xl rounded-lg bg-white p-6 shadow-xl">
					<div class="mb-4 flex items-center justify-between">
						<h3 class="text-lg font-semibold text-gray-900">Detalle de Caja</h3>
						<button onclick={() => (showDetails = false)} class="text-gray-400 hover:text-gray-600"
							>✕</button
						>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div class="rounded bg-gray-50 p-4">
							<h4 class="mb-3 text-sm font-medium text-gray-900">Información General</h4>
							<div class="space-y-2 text-sm">
								<div class="flex justify-between">
									<span class="text-gray-600">Fecha Apertura:</span>
									<span class="font-medium">{formatDate(selectedRegister.openedAt)}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-600">Fecha Cierre:</span>
									<span class="font-medium">{formatDate(selectedRegister.closedAt)}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-600">Sucursal:</span>
									<span class="font-medium">{selectedRegister.branch || '-'}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-600">Turno:</span>
									<span class="font-medium">{selectedRegister.shift || '-'}</span>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-600">Responsable:</span>
									<span class="font-medium">{selectedRegister.openedBy?.name || '-'}</span>
								</div>
							</div>
						</div>

						<div class="rounded bg-gray-50 p-4">
							<h4 class="mb-3 text-sm font-medium text-gray-900">Resumen</h4>
							<div class="space-y-2 text-sm">
								<div class="flex justify-between">
									<span class="text-gray-600">Monto Inicial:</span>
									<span class="font-medium"
										>{formatCurrency(Number(selectedRegister.initialAmount))}</span
									>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-600">Monto Esperado:</span>
									<span class="font-medium"
										>{formatCurrency(Number(selectedRegister.expectedAmount))}</span
									>
								</div>
								<div class="flex justify-between">
									<span class="text-gray-600">Monto Real:</span>
									<span class="font-medium"
										>{formatCurrency(Number(selectedRegister.actualAmount))}</span
									>
								</div>
								<div class="flex justify-between border-t pt-2">
									<span class="font-medium text-gray-900">Diferencia:</span>
									<span
										class="font-bold {selectedRegister.difference === 0
											? 'text-green-600'
											: selectedRegister.difference && selectedRegister.difference > 0
												? 'text-yellow-600'
												: 'text-red-600'}"
									>
										{formatCurrency(selectedRegister.difference || 0)}
									</span>
								</div>
							</div>
						</div>
					</div>

					{#if selectedRegister.openingNotes}
						<div class="mt-4 rounded bg-gray-50 p-4">
							<h4 class="mb-2 text-sm font-medium text-gray-900">Observaciones de Apertura</h4>
							<p class="text-sm text-gray-600">{selectedRegister.openingNotes}</p>
						</div>
					{/if}

					{#if selectedRegister.notes}
						<div class="mt-4 rounded bg-gray-50 p-4">
							<h4 class="mb-2 text-sm font-medium text-gray-900">Observaciones de Cierre</h4>
							<p class="text-sm text-gray-600">{selectedRegister.notes}</p>
						</div>
					{/if}

					<div class="mt-6 flex justify-end">
						<button
							onclick={() => (showDetails = false)}
							class="rounded-md border border-gray-300 px-4 py-2 text-gray-900 hover:bg-gray-50"
						>
							Cerrar
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
