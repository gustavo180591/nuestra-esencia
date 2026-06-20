<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';

	interface Client {
		id: string;
		name: string;
		accountDebt: number;
	}

	interface SaleItem {
		productNameSnapshot: string;
		quantity: number;
		unitPrice: number;
		subtotal: number;
		unitMeasure: string;
	}

	interface Sale {
		id: string;
		items: SaleItem[];
	}

	interface AccountMovement {
		id: string;
		type: 'VENTA' | 'PAGO' | 'AJUSTE';
		amount: number;
		description: string;
		balanceAfter: number;
		createdAt: string;
		user: { id: string; name: string };
		sale?: Sale | null;
	}

	let client = $state<Client | null>(null);
	let movements = $state<AccountMovement[]>([]);
	let loading = $state(false);
	let error = $state('');

	let showPaymentModal = $state(false);
	let paymentAmount = $state('');
	let paymentMethod = $state('EFECTIVO');
	let paymentDescription = $state('');
	let savingPayment = $state(false);

	let showAdjustmentModal = $state(false);
	let adjustmentAmount = $state('');
	let adjustmentDescription = $state('');
	let savingAdjustment = $state(false);

	const paymentMethods = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'QR'];

	const { id } = $derived($page.params);

	async function loadData() {
		try {
			loading = true;
			const [clientRes, movementsRes] = await Promise.all([
				fetch(`/api/clients/${id}`),
				fetch(`/api/clients/${id}/account`)
			]);

			if (clientRes.ok) {
				const clientData = await clientRes.json();
				client = clientData.data;
			}

			if (movementsRes.ok) {
				const movementsData = await movementsRes.json();
				movements = movementsData.data;
			}
		} catch {
			error = 'Error al cargar datos';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadData();
	});

	const getMovementTypeLabel = (type: string) => {
		switch (type) {
			case 'VENTA':
				return 'Venta';
			case 'PAGO':
				return 'Pago';
			case 'AJUSTE':
				return 'Ajuste';
			default:
				return type;
		}
	};

	const getMovementTypeClass = (type: string) => {
		switch (type) {
			case 'VENTA':
				return 'text-red-600';
			case 'PAGO':
				return 'text-green-600';
			case 'AJUSTE':
				return 'text-amber-600';
			default:
				return 'text-gray-600';
		}
	};

	const getProductsSummary = (movement: AccountMovement) => {
		if (movement.type !== 'VENTA' || !movement.sale || !movement.sale.items) {
			return '-';
		}

		const items = movement.sale.items;
		if (items.length === 0) return '-';

		if (items.length <= 2) {
			return items.map((item) => `${item.productNameSnapshot} (${item.quantity})`).join(', ');
		}

		return `${items[0].productNameSnapshot} (${items[0].quantity}), ${items[1].productNameSnapshot} (${items[1].quantity}) +${items.length - 2} más`;
	};

	async function registerPayment() {
		const amount = Number(paymentAmount);

		if (!amount || amount <= 0) {
			alert('Ingrese un monto válido');
			return;
		}

		if (client && amount > Number(client.accountDebt)) {
			if (!confirm('El pago supera la deuda actual. ¿Registrar igualmente?')) {
				return;
			}
		}

		savingPayment = true;

		try {
			const response = await fetch(`/api/clients/${id}/account`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'PAGO',
					amount,
					description: paymentDescription || `Pago registrado por ${paymentMethod}`,
					referenceType: paymentMethod
				})
			});

			const result = await response.json();

			if (!result.success) {
				alert(result.message || 'Error al registrar pago');
				return;
			}

			showPaymentModal = false;
			paymentAmount = '';
			paymentMethod = 'EFECTIVO';
			paymentDescription = '';

			await loadData();

			alert('Pago registrado correctamente');
		} catch (error) {
			console.error('Error registering payment:', error);
			alert('Error al registrar pago');
		} finally {
			savingPayment = false;
		}
	}

	async function adjustBalance() {
		const amount = Number(adjustmentAmount);

		if (Number.isNaN(amount) || amount < 0) {
			alert('Ingrese un saldo válido');
			return;
		}

		if (!adjustmentDescription.trim()) {
			alert('Debe ingresar un motivo para el ajuste');
			return;
		}

		const confirmed = confirm(
			`¿Confirmar ajuste de saldo?\n\nSaldo actual: $${client?.accountDebt ?? 0}\nNuevo saldo: $${amount.toFixed(2)}`
		);

		if (!confirmed) return;

		savingAdjustment = true;

		try {
			const response = await fetch(`/api/clients/${id}/account`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					type: 'AJUSTE',
					amount,
					description: adjustmentDescription,
					referenceType: 'AJUSTE_MANUAL'
				})
			});

			const result = await response.json();

			if (!result.success) {
				alert(result.message || 'Error al ajustar saldo');
				return;
			}

			showAdjustmentModal = false;
			adjustmentAmount = '';
			adjustmentDescription = '';

			await loadData();

			alert('Saldo ajustado correctamente');
		} catch (error) {
			console.error('Error adjusting balance:', error);
			alert('Error al ajustar saldo');
		} finally {
			savingAdjustment = false;
		}
	}
</script>

<main class="container mx-auto px-4 py-6">
	{#if loading}
		<div class="flex items-center justify-center py-8">
			<div class="text-gray-500">Cargando...</div>
		</div>
	{:else if error}
		<div class="rounded-md bg-red-50 p-4 text-red-800">{error}</div>
	{:else if client}
		<!-- Header -->
		<div class="mb-6">
			<a href="/admin/clients/{client.id}" class="text-sm text-amber-600 hover:text-amber-700">
				← Volver a cliente
			</a>
			<h1 class="mt-2 text-3xl font-bold text-gray-900">Cuenta Corriente - {client.name}</h1>
			<p class="text-gray-600">Extracto de movimientos</p>
		</div>

		<!-- Resumen -->
		<div class="mb-6 rounded-lg bg-white p-6 shadow-md">
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<div class="text-sm text-gray-500">Saldo Actual</div>
					<div
						class="mt-2 text-2xl font-bold {client.accountDebt > 0
							? 'text-red-600'
							: 'text-green-600'}"
					>
						${Number(client.accountDebt).toFixed(2)}
					</div>
				</div>
				<div>
					<div class="text-sm text-gray-500">Total Movimientos</div>
					<div class="mt-2 text-2xl font-bold text-gray-900">{movements.length}</div>
				</div>
			</div>
		</div>

		<!-- Acciones -->
		<div class="mb-6 flex flex-wrap gap-3">
			<button
				onclick={() => (showPaymentModal = true)}
				class="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
			>
				Registrar Pago
			</button>
			<button
				onclick={() => {
					adjustmentAmount = client?.accountDebt?.toString() ?? '0';
					showAdjustmentModal = true;
				}}
				class="rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
			>
				Ajustar Saldo
			</button>
			<button
				class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
				onclick={() => alert('Funcionalidad de exportar Excel próximamente')}
			>
				Exportar Excel
			</button>
			<button
				class="rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600"
				onclick={() => alert('Funcionalidad de enviar WhatsApp próximamente')}
			>
				Enviar WhatsApp
			</button>
		</div>

		<!-- Tabla de movimientos -->
		<div class="rounded-lg bg-white shadow-md">
			<div class="border-b px-6 py-4">
				<h2 class="text-xl font-semibold text-gray-900">Extracto</h2>
			</div>
			{#if movements.length === 0}
				<div class="p-8 text-center text-gray-500">No hay movimientos registrados</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Fecha
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Tipo
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Descripción
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Productos
								</th>
								<th
									class="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Debe
								</th>
								<th
									class="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Haber
								</th>
								<th
									class="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase"
								>
									Saldo
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-200 bg-white">
							{#each movements as movement}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-900">
										{new Date(movement.createdAt).toLocaleDateString('es-AR')}
									</td>
									<td
										class="px-6 py-4 text-sm font-medium whitespace-nowrap {getMovementTypeClass(
											movement.type
										)}"
									>
										{getMovementTypeLabel(movement.type)}
									</td>
									<td class="px-6 py-4 text-sm text-gray-900">{movement.description}</td>
									<td class="px-6 py-4 text-sm text-gray-900">{getProductsSummary(movement)}</td>
									<td
										class="px-6 py-4 text-right text-sm font-medium whitespace-nowrap text-gray-900"
									>
										{movement.type === 'VENTA' ? '$' + Number(movement.amount).toFixed(2) : '-'}
									</td>
									<td
										class="px-6 py-4 text-right text-sm font-medium whitespace-nowrap text-gray-900"
									>
										{movement.type === 'PAGO' ? '$' + Number(movement.amount).toFixed(2) : '-'}
									</td>
									<td
										class="px-6 py-4 text-right text-sm font-bold whitespace-nowrap text-gray-900"
									>
										${Number(movement.balanceAfter).toFixed(2)}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{/if}
</main>

{#if showPaymentModal}
	<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
		<div class="w-full max-w-md rounded-lg bg-white shadow-xl">
			<div class="border-b px-6 py-4">
				<h2 class="text-xl font-semibold text-gray-900">Registrar pago</h2>
				<p class="text-sm text-gray-500">Registrar un pago para descontar de la cuenta corriente</p>
			</div>

			<form onsubmit={registerPayment} class="p-6">
				<div class="space-y-4">
					<div>
						<label for="payment-amount" class="block text-sm font-medium text-gray-700">
							Monto *
						</label>
						<input
							id="payment-amount"
							type="number"
							bind:value={paymentAmount}
							min="0"
							step="0.01"
							required
							placeholder="0.00"
							class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
						/>
					</div>

					<div>
						<label for="payment-method" class="block text-sm font-medium text-gray-700">
							Método de pago *
						</label>
						<select
							id="payment-method"
							bind:value={paymentMethod}
							class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
						>
							{#each paymentMethods as method (method)}
								<option value={method}>{method}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="payment-description" class="block text-sm font-medium text-gray-700">
							Nota
						</label>
						<textarea
							id="payment-description"
							bind:value={paymentDescription}
							rows="3"
							placeholder="Ej: Pago parcial, transferencia recibida, pago en efectivo..."
							class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
						></textarea>
					</div>

					{#if client}
						<div class="rounded-lg bg-gray-50 p-3 text-sm">
							<div class="flex justify-between">
								<span class="text-gray-600">Deuda actual:</span>
								<span class="font-semibold text-gray-900"
									>${Number(client.accountDebt).toFixed(2)}</span
								>
							</div>
							{#if paymentAmount}
								<div class="mt-1 flex justify-between">
									<span class="text-gray-600">Saldo luego del pago:</span>
									<span class="font-semibold text-green-700">
										${Math.max(0, Number(client.accountDebt) - Number(paymentAmount)).toFixed(2)}
									</span>
								</div>
							{/if}
						</div>
					{/if}
				</div>

				<div class="mt-6 flex justify-end gap-3">
					<button
						type="button"
						onclick={() => (showPaymentModal = false)}
						class="rounded-md bg-gray-200 px-4 py-2 text-gray-900 hover:bg-gray-300"
					>
						Cancelar
					</button>

					<button
						type="submit"
						disabled={savingPayment}
						class="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-gray-400"
					>
						{savingPayment ? 'Registrando...' : 'Confirmar pago'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

{#if showAdjustmentModal}
	<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
		<div class="w-full max-w-md rounded-lg bg-white shadow-xl">
			<div class="border-b px-6 py-4">
				<h2 class="text-xl font-semibold text-gray-900">Ajustar saldo</h2>
				<p class="text-sm text-gray-500">
					Modifica manualmente el saldo de la cuenta corriente del cliente
				</p>
			</div>

			<form onsubmit={adjustBalance} class="p-6">
				<div class="space-y-4">
					{#if client}
						<div class="rounded-lg bg-gray-50 p-3 text-sm">
							<div class="flex justify-between">
								<span class="text-gray-600">Saldo actual:</span>
								<span class="font-semibold text-gray-900">${Number(client.accountDebt).toFixed(2)}</span>
							</div>
						</div>
					{/if}

					<div>
						<label for="adjustment-amount" class="block text-sm font-medium text-gray-700">
							Nuevo saldo *
						</label>
						<input
							id="adjustment-amount"
							type="number"
							bind:value={adjustmentAmount}
							min="0"
							step="0.01"
							required
							placeholder="0.00"
							class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
						/>
					</div>

					<div>
						<label for="adjustment-description" class="block text-sm font-medium text-gray-700">
							Motivo del ajuste *
						</label>
						<textarea
							id="adjustment-description"
							bind:value={adjustmentDescription}
							rows="3"
							required
							placeholder="Ej: Corrección de saldo, pago no registrado, error de carga..."
							class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
						></textarea>
					</div>

					{#if client && adjustmentAmount !== ''}
						<div class="rounded-lg bg-amber-50 p-3 text-sm">
							<div class="flex justify-between">
								<span class="text-gray-700">Diferencia:</span>
								<span
									class="font-semibold {Number(adjustmentAmount) - Number(client.accountDebt) >= 0
										? 'text-red-600'
										: 'text-green-600'}"
								>
									${(Number(adjustmentAmount) - Number(client.accountDebt)).toFixed(2)}
								</span>
							</div>
						</div>
					{/if}
				</div>

				<div class="mt-6 flex justify-end gap-3">
					<button
						type="button"
						onclick={() => (showAdjustmentModal = false)}
						class="rounded-md bg-gray-200 px-4 py-2 text-gray-900 hover:bg-gray-300"
					>
						Cancelar
					</button>

					<button
						type="submit"
						disabled={savingAdjustment}
						class="rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 disabled:bg-gray-400"
					>
						{savingAdjustment ? 'Ajustando...' : 'Confirmar ajuste'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
