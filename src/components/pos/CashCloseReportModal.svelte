<script lang="ts">
	import { X, Printer, Calendar, Clock, User as UserIcon } from '@lucide/svelte';
	import SummaryMetricCard from './SummaryMetricCard.svelte';
	import PaymentBreakdownRow from './PaymentBreakdownRow.svelte';

	interface Props {
		isOpen: boolean;
		data: any;
		onClose: () => void;
		onPrint: () => void;
	}

	let { isOpen, data, onClose, onPrint }: Props = $props();

	function formatCurrency(value: number): string {
		return value.toLocaleString('es-AR', {
			style: 'currency',
			currency: 'ARS',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});
	}

	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function formatTime(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleTimeString('es-AR', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getDifferenceLabel(difference: number): string {
		if (difference > 0) return 'Sobrante';
		if (difference < 0) return 'Faltante';
		return 'Caja exacta';
	}

	function getDifferenceVariant(difference: number): 'positive' | 'negative' | 'neutral' {
		if (difference > 0) return 'positive';
		if (difference < 0) return 'negative';
		return 'neutral';
	}

	let differenceVariant = $derived(getDifferenceVariant(data?.difference || 0));
	let differenceLabel = $derived(getDifferenceLabel(data?.difference || 0));
</script>

{#if isOpen && data}
	<!-- Overlay -->
	<div
		class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4"
		onclick={onClose}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="-1"
	>
		<!-- Modal -->
		<div class="w-full max-w-3xl rounded-xl bg-white shadow-2xl">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
				<div class="flex items-center gap-3">
					<div>
						<h2 class="text-xl font-bold text-gray-900">Cierre de Caja</h2>
						<p class="text-sm text-gray-500">Resumen del turno</p>
					</div>
					<span class="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
						Caja cerrada
					</span>
				</div>
				<button
					onclick={onClose}
					class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
					aria-label="Cerrar modal"
				>
					<X class="h-5 w-5" aria-hidden="true" />
				</button>
			</div>

			<!-- Content -->
			<div class="p-6">
				<!-- Context Info -->
				<div class="mb-6 flex flex-wrap items-center gap-6 text-sm text-gray-600">
					<div class="flex items-center gap-2">
						<Calendar class="h-4 w-4" aria-hidden="true" />
						<span>{formatDate(data.closedAt)}</span>
					</div>
					<div class="flex items-center gap-2">
						<Clock class="h-4 w-4" aria-hidden="true" />
						<span>{formatTime(data.closedAt)}</span>
					</div>
					<div class="flex items-center gap-2">
						<UserIcon class="h-4 w-4" aria-hidden="true" />
						<span>{data.closedBy?.name || 'Usuario'}</span>
					</div>
				</div>

				<!-- Summary Cards -->
				<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
					<SummaryMetricCard
						label="Monto esperado"
						value={formatCurrency(data.expectedAmount || 0)}
						variant="default"
					/>
					<SummaryMetricCard
						label="Monto contado"
						value={formatCurrency(data.totalAmount || 0)}
						variant="default"
					/>
					<SummaryMetricCard
						label={differenceLabel}
						value={formatCurrency(Math.abs(data.difference || 0))}
						variant={differenceVariant}
					/>
				</div>

				<!-- Initial Amount -->
				<div class="mb-6 rounded-lg bg-gray-50 p-4">
					<div class="flex items-center justify-between">
						<span class="text-sm font-medium text-gray-700">Monto inicial</span>
						<span class="text-lg font-bold text-gray-900"
							>{formatCurrency(data.initialAmount || 0)}</span
						>
					</div>
				</div>

				<!-- Payment Breakdown -->
				<div class="mb-6">
					<h3 class="mb-4 text-base font-semibold text-gray-900">Desglose por método de pago</h3>
					<div class="space-y-2">
						<PaymentBreakdownRow
							label="Ventas en efectivo"
							amount={formatCurrency(data.totalCashSales || 0)}
							color="green"
							icon="💵"
						/>
						<PaymentBreakdownRow
							label="Transferencias"
							amount={formatCurrency(data.totalTransferSales || 0)}
							color="blue"
							icon="🏦"
						/>
						<PaymentBreakdownRow
							label="QR"
							amount={formatCurrency(data.totalQrSales || 0)}
							color="purple"
							icon="📱"
						/>
						<PaymentBreakdownRow
							label="Tarjeta"
							amount={formatCurrency(data.totalCardSales || 0)}
							color="orange"
							icon="💳"
						/>
						<PaymentBreakdownRow
							label="Gastos en efectivo"
							amount={formatCurrency(data.totalCashExpenses || 0)}
							color="red"
							icon="📤"
						/>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
				<button
					onclick={onClose}
					class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
				>
					Cerrar
				</button>
				<button
					onclick={onPrint}
					class="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
				>
					<Printer class="h-4 w-4" aria-hidden="true" />
					Imprimir reporte
				</button>
			</div>
		</div>
	</div>

	<!-- Print Styles -->
	<style>
		@media print {
			@page {
				margin: 1cm;
			}
			body {
				print-color-adjust: exact;
				-webkit-print-color-adjust: exact;
			}
		}
	</style>
{/if}
