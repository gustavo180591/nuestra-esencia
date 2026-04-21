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
			unitMeasure: 'UNIDAD' | 'KILOGRAMO' | 'DOCENA' | 'MEDIA_DOCENA' | 'PORCION';
			quantity: number;
			unitPrice: number;
			totalPrice: number;
		}>,
		profitMargin: 40, // Margen de ganancia por defecto 40%
		roundPrices: false // Redondear a enteros
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
			items: [],
			profitMargin: 40,
			roundPrices: false
		};
	}

	function openCreateModal() {
		resetForm();
		showCreateModal = true;
	}

	function addPurchaseItem() {
		formData.items.push({
			productId: '',
			unitMeasure: 'UNIDAD',
			quantity: 1,
			unitPrice: 0,
			totalPrice: 0
		});
	}

	function calculateUnitPrice(index: number) {
		const item = formData.items[index];
		if (item.quantity > 0 && item.totalPrice > 0) {
			item.unitPrice = Number((item.totalPrice / item.quantity).toFixed(4));
		}
	}

	function calculateSellingPrice(costPrice: number): number {
		const withMargin = costPrice * (1 + formData.profitMargin / 100);
		return formData.roundPrices ? Math.round(withMargin) : Number(withMargin.toFixed(2));
	}

	function onProductChange(index: number) {
		const item = formData.items[index];

		// Handle "Agregar producto nuevo" option
		if (item.productId === '__new_product__') {
			// Open new product modal
			openNewProductModal();
			// Reset selection
			item.productId = '';
			formData.items = [...formData.items];
			return;
		}
	}

	function openNewProductModal() {
		// Open product creation modal with parameters to trigger modal and redirect back
		window.open('/admin?newProduct=true&redirectTo=purchases', '_blank');
	}

	function formatNumber(value: number | string): string {
		const num = typeof value === 'string' ? parseFloat(value) : value;
		if (isNaN(num)) return '0';
		return new Intl.NumberFormat('es-AR', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(num);
	}

	function formatNumberInput(value: number | string): string {
		const num = typeof value === 'string' ? parseFloat(value) : value;
		if (isNaN(num)) return '';
		return new Intl.NumberFormat('es-AR', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 2,
			useGrouping: true
		}).format(num);
	}

	function parseFormattedNumber(formattedValue: string): number {
		// Remove all non-numeric characters except decimal separator and comma
		const cleanValue = formattedValue.replace(/[^\d,]/g, '');

		// Handle decimal comma properly - check if last character is comma
		const lastCharIsComma = cleanValue.endsWith(',');
		if (lastCharIsComma) {
			// If ends with comma, user is still typing decimal
			const withoutLastComma = cleanValue.slice(0, -1);
			const normalizedValue = withoutLastComma.replace(',', '.');
			return parseFloat(normalizedValue) || 0;
		} else {
			// Replace all commas with dots for thousands, but keep last comma if it's decimal
			const parts = cleanValue.split(',');
			if (parts.length > 1) {
				// Multiple commas - treat last as decimal
				const integerPart = parts.slice(0, -1).join('');
				const decimalPart = parts[parts.length - 1];
				const normalizedValue = integerPart.replace(',', '.') + '.' + decimalPart;
				return parseFloat(normalizedValue) || 0;
			} else {
				// Single comma or no commas - replace with dot
				const normalizedValue = cleanValue.replace(',', '.');
				return parseFloat(normalizedValue) || 0;
			}
		}
	}

	function handleNumberInput(
		event: Event,
		item: any,
		field: 'quantity' | 'totalPrice' | 'unitPrice'
	) {
		const input = event.target as HTMLInputElement;
		const cursorPosition = input.selectionStart || 0;
		const currentValue = input.value;

		// Parse the current value and update the model
		const numericValue = parseFormattedNumber(currentValue);
		item[field] = numericValue;

		// Format the display value
		const formattedValue = formatNumberInput(numericValue);

		// Use requestAnimationFrame to ensure cursor position is set after formatting
		requestAnimationFrame(() => {
			input.value = formattedValue;

			// Calculate new cursor position
			let newCursorPosition = cursorPosition;

			// Adjust cursor position based on formatting changes
			if (formattedValue.length > currentValue.length) {
				newCursorPosition = cursorPosition + (formattedValue.length - currentValue.length);
			} else if (formattedValue.length < currentValue.length) {
				newCursorPosition = Math.max(
					0,
					cursorPosition - (currentValue.length - formattedValue.length)
				);
			}

			// Set cursor position to the right side
			input.setSelectionRange(newCursorPosition, newCursorPosition);
		});

		// Trigger calculations if needed
		if (field === 'totalPrice') {
			const index = formData.items.indexOf(item);
			calculateUnitPrice(index);
		}
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

			// Preparar datos para enviar (solo lo necesario para la API)
			const dataToSend = {
				supplierId: formData.supplierId,
				notes: formData.notes,
				items: formData.items.map((item) => ({
					productId: item.productId,
					quantity: item.quantity,
					unitPrice: item.unitPrice
				}))
			};

			const response = await fetch('/api/purchases', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(dataToSend)
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
		<!-- Header con navegación de submenú -->
		<div class="mb-6">
			<div class="flex items-center justify-between">
				<h1 class="text-3xl font-bold text-gray-900">Gestión de Compras</h1>
				<button
					onclick={openCreateModal}
					class="rounded-lg bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
				>
					Nueva Compra
				</button>
			</div>
			<!-- Submenú de Compras -->
			<div class="mt-4 flex gap-2 border-b border-gray-200 pb-2">
				<span class="rounded-md bg-amber-100 px-4 py-2 text-sm font-medium text-amber-800">
					Compras
				</span>
				<a
					href="/admin/suppliers"
					class="rounded-md px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
				>
					Proveedores
				</a>
			</div>
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

					<!-- Configuración de Precios -->
					<div class="mb-4 rounded-lg bg-blue-50 p-4">
						<div class="mb-3 text-sm font-medium text-blue-900">
							Configuración de Precios de Venta
						</div>
						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<label for="profit-margin" class="mb-1 block text-sm font-medium text-gray-900">
									Margen de Ganancia (%)
								</label>
								<input
									id="profit-margin"
									type="number"
									bind:value={formData.profitMargin}
									min="0"
									max="1000"
									class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
								/>
							</div>
							<div class="flex items-center gap-3">
								<label class="flex items-center gap-2">
									<input type="checkbox" bind:checked={formData.roundPrices} class="h-4 w-4" />
									<span class="text-sm font-medium text-gray-900">Redondear a enteros</span>
								</label>
							</div>
						</div>
						<div class="mt-2 text-xs text-blue-700">
							Precio de venta = Costo + {formData.profitMargin}% margen
							{formData.roundPrices ? '(redondeado)' : ''}
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
								<div class="flex flex-col gap-2 rounded-lg border bg-gray-50 p-3">
									<div class="flex items-center gap-2">
										<select
											bind:value={item.productId}
											onchange={() => onProductChange(index)}
											class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900"
										>
											<option value="">Seleccionar producto</option>
											{#each products as product}
												<option value={product.id}>{product.name}</option>
											{/each}
											<option value="__new_product__" class="font-semibold text-amber-600"
												>+ Agregar producto nuevo</option
											>
										</select>

										<select
											bind:value={item.unitMeasure}
											class="w-36 rounded-md border border-gray-300 px-3 py-2 text-gray-900"
										>
											<option value="UNIDAD">Unidad</option>
											<option value="KILOGRAMO">Kilogramo</option>
											<option value="DOCENA">Docena</option>
											<option value="MEDIA_DOCENA">Media docena</option>
											<option value="PORCION">Porción</option>
										</select>
									</div>

									<!-- Fila de cantidad y cálculo de precios -->
									<div class="flex items-center gap-3">
										<div class="flex flex-col">
											<div class="mb-0.5 text-xs text-gray-500">Cantidad</div>
											<input
												type="text"
												step="0.001"
												value={formatNumberInput(item.quantity)}
												oninput={(e) => handleNumberInput(e, item, 'quantity')}
												placeholder="Ej: 20"
												class="w-24 rounded-md border border-gray-300 px-3 py-2 text-gray-900"
											/>
										</div>

										<div class="flex flex-col">
											<div class="mb-0.5 text-xs text-gray-500">Total Pagado $</div>
											<input
												type="text"
												step="0.01"
												value={formatNumberInput(item.totalPrice)}
												oninput={(e) => handleNumberInput(e, item, 'totalPrice')}
												placeholder="Ej: 15000"
												class="w-32 rounded-md border border-gray-300 px-3 py-2 text-gray-900"
											/>
										</div>

										<div class="pt-4">
											<div class="text-sm text-gray-400">→</div>
										</div>

										<div class="flex flex-col">
											<div class="mb-0.5 text-xs text-gray-500">Costo Unitario $</div>
											<input
												type="text"
												step="0.01"
												value={formatNumberInput(item.unitPrice)}
												oninput={(e) => handleNumberInput(e, item, 'unitPrice')}
												placeholder="Calculado"
												class="w-28 rounded-md border border-gray-300 bg-amber-50 px-3 py-2 text-gray-900"
												readonly
											/>
										</div>

										{#if formData.items.length > 1}
											<div class="pt-4">
												<button
													type="button"
													onclick={() => removePurchaseItem(index)}
													class="text-red-600 hover:text-red-700"
												>
													×
												</button>
											</div>
										{/if}
									</div>

									{#if item.unitPrice > 0}
										<div class="mt-1 flex items-center gap-2 text-sm">
											<span class="font-medium text-green-600">
												Venta sugerida: ${formatNumber(calculateSellingPrice(item.unitPrice))}
											</span>
											<span class="text-gray-400">|</span>
											<span class="text-gray-500">
												Ganancia: ${formatNumber(
													calculateSellingPrice(item.unitPrice) - item.unitPrice
												)}
											</span>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>

					<div class="border-t pt-4">
						<div class="mb-4 flex items-center justify-between">
							<span class="text-lg font-medium text-gray-900">Total de Compra:</span>
							<span class="text-xl font-bold text-gray-900">${formatNumber(calculateTotal())}</span>
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
