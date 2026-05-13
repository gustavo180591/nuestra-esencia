<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const denominations = [
		{ value: 10, label: '$10' },
		{ value: 20, label: '$20' },
		{ value: 50, label: '$50' },
		{ value: 100, label: '$100' },
		{ value: 200, label: '$200' },
		{ value: 500, label: '$500' },
		{ value: 1000, label: '$1000' },
		{ value: 2000, label: '$2000' },
		{ value: 10000, label: '$10.000' },
		{ value: 20000, label: '$20.000' }
	];

	let { counts = {}, disabled = false } = $props<{
		counts: Record<number, number>;
		disabled: boolean;
	}>();

	const dispatch = createEventDispatcher<{
		counts: Record<number, number>;
		total: number;
	}>();

	const total = $derived(() => {
		return Object.entries(counts).reduce((sum, [denomination, count]) => {
			return sum + (Number(denomination) * (Number(count) || 0));
		}, 0);
	});

	function updateCount(denomination: number, event: Event) {
		const target = event.target as HTMLInputElement;
		const count = parseInt(target.value) || 0;
		if (count < 0) return;
		
		counts = { ...counts, [denomination]: count };
	}

	function useBillTotal() {
		dispatch('counts', counts);
		dispatch('total', total.value);
	}
</script>

<div class="space-y-4">
	<h4 class="text-sm font-medium text-gray-900 mb-3">Conteo de Billetes</h4>
	
	<div class="grid grid-cols-2 gap-3">
		{#each denominations as denom (denom.value)}
			<div>
				<label for="bill-{denom.value}" class="block text-xs text-gray-500 mb-1">
					{denom.label}
				</label>
				<input
					id="bill-{denom.value}"
					type="number"
					min="0"
					bind:value={counts[denom.value]}
					oninput={(e) => updateCount(denom.value, e)}
					disabled={disabled}
					class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 disabled:bg-gray-100"
				/>
			</div>
		{/each}
	</div>

	<div class="mt-4 flex justify-between items-center border-t pt-3">
		<span class="text-sm font-medium text-gray-700">Total:</span>
		<span class="text-lg font-bold text-gray-900">${total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</span>
	</div>

	{#if !disabled}
		<button
			type="button"
			onclick={useBillTotal}
			class="mt-3 w-full rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
		>
			Usar Total de Billetes
		</button>
	{/if}
</div>
