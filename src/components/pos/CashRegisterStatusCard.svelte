<script lang="ts">
	import { CheckCircle, XCircle, DollarSign, User } from '@lucide/svelte';

	interface Props {
		isOpen: boolean;
		initialAmount: number;
		openedBy?: string;
		onOpen: () => void;
		onClose: () => void;
	}

	let { isOpen, initialAmount, openedBy, onOpen, onClose }: Props = $props();

	function formatCurrency(value: number): string {
		return value.toLocaleString('es-AR', {
			style: 'currency',
			currency: 'ARS',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});
	}
</script>

<div class="rounded-lg bg-gray-900 p-4 shadow-md">
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			{#if isOpen}
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-green-600">
					<CheckCircle class="h-5 w-5 text-white" aria-hidden="true" />
				</div>
				<div>
					<div class="flex items-center gap-2">
						<span class="text-sm font-semibold text-green-400">Caja Abierta</span>
					</div>
					<div class="flex items-center gap-1 text-xs text-gray-400">
						<DollarSign class="h-3 w-3" aria-hidden="true" />
						<span>{formatCurrency(initialAmount)}</span>
					</div>
					{#if openedBy}
						<div class="flex items-center gap-1 text-xs text-gray-500">
							<User class="h-3 w-3" aria-hidden="true" />
							<span>{openedBy}</span>
						</div>
					{/if}
				</div>
			{:else}
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-600">
					<XCircle class="h-5 w-5 text-white" aria-hidden="true" />
				</div>
				<div>
					<span class="text-sm font-semibold text-red-400">Caja Cerrada</span>
				</div>
			{/if}
		</div>

		{#if isOpen}
			<button
				onclick={onClose}
				class="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
			>
				Cerrar
			</button>
		{:else}
			<button
				onclick={onOpen}
				class="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:outline-none"
			>
				Abrir
			</button>
		{/if}
	</div>
</div>
