<script lang="ts">
	import { onMount } from 'svelte';
	import type { Product, ProductSaleFormat } from '$lib/types';

	let products = $state<Product[]>([]);
	let loading = $state(true);
	let error = $state('');

	// Carrito de compras
	let cart = $state<
		Array<{
			productId: string;
			productSaleFormatId: string;
			productName: string;
			formatLabel: string | null;
			unitMeasure: string;
			quantity: number;
			unitPrice: number;
			subtotal: number;
		}>
	>([]);

	let total = $state(0);
	let discount = $state(0);
	let paymentMethod = $state<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA'>('EFECTIVO');
	let cashReceived = $state(0);
	let changeGiven = $state(0);

	// Teclado numérico
	let showKeypad = $state(false);
	let activeInput = $state<'discount' | 'cash' | null>(null);
	let keypadValue = $state('');

	// Subtotal editable
	let editingSubtotalIndex = $state<number | null>(null);
	let subtotalEditValue = $state('');

	// Cargar productos desde la API
	onMount(() => {
		loadProducts();
		// Agregar event listener para atajos de teclado
		window.addEventListener('keydown', handleKeyboardShortcuts);

		// Limpiar event listener al desmontar
		return () => {
			window.removeEventListener('keydown', handleKeyboardShortcuts);
		};
	});

	async function loadProducts() {
		try {
			const response = await fetch('/api/products');
			const data = await response.json();

			if (data.success) {
				products = data.data;
			} else {
				error = data.message;
			}
		} catch {
			error = 'Error al cargar productos';
		} finally {
			loading = false;
		}
	}

	// Teclado numérico
	function openKeypad(inputType: 'discount' | 'cash') {
		activeInput = inputType;
		keypadValue = '';
		showKeypad = true;
	}

	function startEditingSubtotal(index: number, currentSubtotal: number) {
		editingSubtotalIndex = index;
		subtotalEditValue = currentSubtotal.toFixed(2);
	}

	function applySubtotalEdit(index: number) {
		const desiredSubtotal = parseFloat(subtotalEditValue) || 0;
		const unitPrice = cart[index].unitPrice;
		const newQuantity = unitPrice > 0 ? desiredSubtotal / unitPrice : 0;
		cart[index].quantity = newQuantity;
		cart[index].subtotal = newQuantity * unitPrice;
		updateTotals();
		editingSubtotalIndex = null;
	}

	function closeKeypad() {
		showKeypad = false;
		activeInput = null;
		keypadValue = '';
	}

	function appendToKeypad(value: string) {
		if (value === 'C') {
			keypadValue = '';
		} else if (value === '⌫') {
			keypadValue = keypadValue.slice(0, -1);
		} else {
			// Permitir solo un punto decimal
			if (value === '.' && keypadValue.includes('.')) return;
			keypadValue += value;
		}
	}

	function applyKeypadValue() {
		const numValue = parseFloat(keypadValue) || 0;

		if (activeInput === 'discount') {
			discount = numValue;
		} else if (activeInput === 'cash') {
			cashReceived = numValue;
		}

		closeKeypad();
	}

	// Atajos de teclado
	function handleKeyboardShortcuts(event: KeyboardEvent) {
		// Ctrl/Cmd + N: Nuevo carrito
		if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
			event.preventDefault();
			clearCart();
		}

		// Ctrl/Cmd + Enter: Procesar venta
		if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
			event.preventDefault();
			processSale();
		}

		// Escape: Cerrar modal o limpiar selección
		if (event.key === 'Escape') {
			if (showKeypad) {
				closeKeypad();
			}
		}

		// F1-F3: Métodos de pago
		if (event.key === 'F1') {
			event.preventDefault();
			paymentMethod = 'EFECTIVO';
		}
		if (event.key === 'F2') {
			event.preventDefault();
			paymentMethod = 'TRANSFERENCIA';
		}
		if (event.key === 'F3') {
			event.preventDefault();
			paymentMethod = 'TARJETA';
		}

		// Ctrl/Cmd + D: Foco en descuento
		if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
			event.preventDefault();
			openKeypad('discount');
		}

		// Ctrl/Cmd + E: Foco en efectivo
		if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
			event.preventDefault();
			if (paymentMethod === 'EFECTIVO') {
				openKeypad('cash');
			}
		}
	}

	// Agregar producto al carrito
	function addToCart(product: Product, format: ProductSaleFormat) {
		const existingItem = cart.find(
			(item) => item.productId === product.id && item.productSaleFormatId === format.id
		);

		if (existingItem) {
			existingItem.quantity += 1;
			existingItem.subtotal = existingItem.quantity * existingItem.unitPrice;
		} else {
			cart.push({
				productId: product.id,
				productSaleFormatId: format.id,
				productName: product.name,
				formatLabel: format.label,
				unitMeasure: format.unitMeasure,
				quantity: 1,
				unitPrice: Number(format.price),
				subtotal: Number(format.price)
			});
		}

		updateTotals();
	}

	// Actualizar cantidad de un item en el carrito
	function updateQuantity(index: number, quantity: number) {
		if (quantity <= 0) {
			cart.splice(index, 1);
		} else {
			cart[index].quantity = quantity;
			cart[index].subtotal = quantity * cart[index].unitPrice;
		}
		updateTotals();
	}

	// Calcular totales
	function updateTotals() {
		const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
		total = Math.max(0, subtotal - discount);

		if (paymentMethod === 'EFECTIVO' && cashReceived > 0) {
			changeGiven = Math.max(0, cashReceived - total);
		} else {
			changeGiven = 0;
		}
	}

	// Vaciar carrito
	function clearCart() {
		cart = [];
		discount = 0;
		cashReceived = 0;
		changeGiven = 0;
		updateTotals();
	}

	// Procesar venta
	async function processSale() {
		if (cart.length === 0) {
			alert('El carrito está vacío');
			return;
		}

		// En efectivo, si no se ingresó monto, asumir que se recibe exacto
		if (paymentMethod === 'EFECTIVO') {
			if (cashReceived === 0) {
				cashReceived = total;
			}
			if (cashReceived < total) {
				alert('El efectivo recibido es insuficiente');
				return;
			}
		}

		try {
			const saleData = {
				items: cart.map((item) => ({
					productId: item.productId,
					productSaleFormatId: item.productSaleFormatId,
					quantity: item.quantity
				})),
				discount: discount > 0 ? discount : undefined,
				paymentMethod,
				cashReceived: paymentMethod === 'EFECTIVO' ? cashReceived : undefined
			};

			const response = await fetch('/api/sales', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(saleData)
			});

			const result = await response.json();

			if (result.success) {
				alert(
					`Venta #${result.data.saleNumber} procesada exitosamente\nTotal: $${result.data.total}`
				);
				clearCart();
				await loadProducts(); // Recargar productos para actualizar stock
			} else {
				alert(`Error: ${result.message}`);
			}
		} catch {
			alert('Error al procesar la venta');
		}
	}

	onMount(() => {
		loadProducts();
	});

	$effect(() => {
		updateTotals();
	});
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="bg-amber-600 text-white shadow-lg">
		<div class="container mx-auto px-4 py-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<h1 class="text-2xl font-bold">Nuestra Esencia</h1>
					<span class="text-amber-100">Sistema de Caja</span>
				</div>
				<div class="text-sm">
					<div class="text-amber-100">Caja Abierta</div>
					<div>{new Date().toLocaleDateString('es-AR')}</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="container mx-auto px-4 py-6">
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
			<!-- Panel de Productos (2/3 del ancho) -->
			<div class="lg:col-span-2">
				<div class="rounded-lg bg-white p-6 shadow-md">
					<h2 class="mb-4 text-xl font-semibold text-gray-900">Productos</h2>

					{#if loading}
						<div class="py-8 text-center">
							<div class="text-gray-900">Cargando productos...</div>
						</div>
					{:else if error}
						<div class="py-8 text-center">
							<div class="text-red-500">{error}</div>
							<button
								onclick={loadProducts}
								class="mt-4 rounded bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
							>
								Reintentar
							</button>
						</div>
					{:else}
						<!-- Agrupar productos por categoría -->
						{#each Array.from(new Set(products.map((p) => p.category?.name))) as categoryName (categoryName)}
							{@const categoryProducts = products.filter((p) => p.category?.name === categoryName)}

							<div class="mb-6">
								<h3 class="mb-3 border-b pb-2 text-lg font-medium text-gray-900">
									{categoryName || 'Sin categoría'}
								</h3>

								<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
									{#each categoryProducts as product (product.id)}
										<div class="space-y-3">
											<!-- Botón principal del producto - MÁS GRANDE -->
											<button
												class="w-full transform rounded-xl border-2 border-amber-300 bg-linear-to-br from-amber-50 to-amber-100 p-6 text-left transition-all duration-200 hover:scale-105 hover:border-amber-500 hover:from-amber-100 hover:to-amber-200 hover:shadow-lg active:scale-95"
												onclick={() => addToCart(product, product.saleFormats[0])}
											>
												<div class="mb-1 text-lg font-bold text-gray-900">{product.name}</div>
												<div class="mb-2 flex items-center text-sm text-gray-900">
													<span class="mr-2 inline-block h-2 w-2 rounded-full bg-green-500"></span>
													Stock: {product.stock}
												</div>
												<div class="mb-1 text-2xl font-bold text-amber-600">
													${product.saleFormats[0]?.price}
												</div>
												<div
													class="inline-block rounded bg-amber-200 px-2 py-1 text-sm font-medium text-amber-700"
												>
													{product.saleFormats[0]?.label}
												</div>
											</button>

											<!-- Botones de formatos adicionales - MÁS GRANDES -->
											{#if product.saleFormats.length > 1}
												<div class="grid grid-cols-2 gap-2">
													{#each product.saleFormats.slice(1) as format (format.id)}
														<button
															class="transform rounded-lg border-2 border-amber-300 bg-amber-100 px-3 py-3 text-sm font-medium transition-all duration-200 hover:scale-105 hover:border-amber-400 hover:bg-amber-200 hover:shadow-md active:scale-95"
															onclick={() => addToCart(product, format)}
															title="{format.label} - ${format.price}"
														>
															<div class="font-bold text-amber-800">{format.label}</div>
															<div class="text-xs text-gray-900">${format.price}</div>
														</button>
													{/each}
												</div>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/each}
					{/if}
				</div>
			</div>

			<!-- Panel del Carrito (1/3 del ancho) -->
			<div class="lg:col-span-1">
				<div class="sticky top-6 rounded-lg bg-white p-6 shadow-md">
					<h2 class="mb-4 text-xl font-semibold text-gray-900">Carrito</h2>

					<!-- Items del carrito -->
					<div class="mb-4 max-h-96 space-y-2 overflow-y-auto">
						{#if cart.length === 0}
							<div class="py-4 text-center text-gray-900">El carrito está vacío</div>
						{:else}
							{#each cart as item, index (item.productId + '-' + item.productSaleFormatId)}
								<div class="flex items-center justify-between rounded bg-gray-50 p-3">
									<div class="flex-1">
										<div class="font-medium" style="color: #000">{item.productName}</div>
										<div class="text-sm" style="color: #000">
											{item.formatLabel}
											{item.unitMeasure === 'KILOGRAMO' ? '(kg)' : ''}
										</div>
										<div class="text-sm font-bold" style="color: #000">${item.unitPrice} c/u</div>
									</div>
									<div class="flex items-center space-x-2">
										<div class="flex flex-col items-center">
											<div class="flex items-center space-x-2">
												<button
													class="h-8 w-8 rounded bg-red-100 text-red-600 hover:bg-red-200"
													onclick={() =>
														updateQuantity(
															index,
															item.quantity - (item.unitMeasure === 'KILOGRAMO' ? 0.1 : 1)
														)}
												>
													-
												</button>
												<input
													type="number"
													class="w-20 rounded border px-1 py-1 text-center text-sm text-black"
													value={item.unitMeasure === 'KILOGRAMO'
														? Math.round(item.quantity * 1000)
														: item.quantity}
													min="0.001"
													step={item.unitMeasure === 'KILOGRAMO' ? '100' : '1'}
													onchange={(e) => {
														const val = parseFloat(e.currentTarget.value);
														updateQuantity(
															index,
															item.unitMeasure === 'KILOGRAMO' ? val / 1000 : val
														);
													}}
												/>
												<button
													class="h-8 w-8 rounded bg-green-100 text-green-600 hover:bg-green-200"
													onclick={() =>
														updateQuantity(
															index,
															item.quantity + (item.unitMeasure === 'KILOGRAMO' ? 0.1 : 1)
														)}
												>
													+
												</button>
											</div>
											{#if editingSubtotalIndex === index}
												<input
													type="number"
													class="mt-1 w-20 rounded border px-1 py-1 text-right text-sm font-bold text-black"
													bind:value={subtotalEditValue}
													min="0"
													step="0.01"
													onblur={() => applySubtotalEdit(index)}
													onkeydown={(e) => {
														if (e.key === 'Enter') {
															applySubtotalEdit(index);
														}
													}}
												/>
											{:else}
												<button
													class="mt-1 w-20 text-right font-bold hover:text-amber-600"
													style="color: #000"
													onclick={() => startEditingSubtotal(index, item.subtotal)}
													title="Click para editar monto"
												>
													${item.subtotal.toFixed(2)}
												</button>
											{/if}
										</div>
									</div>
								</div>
							{/each}
						{/if}
					</div>

					<!-- Resumen de totales -->
					<div class="space-y-2 border-t pt-4">
						<div class="flex justify-between">
							<span style="color: #000">Subtotal:</span>
							<span style="color: #000"
								>${cart.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}</span
							>
						</div>
						<div class="flex justify-between">
							<span style="color: #000">Descuento:</span>
							<input
								type="number"
								bind:value={discount}
								class="w-20 rounded border px-2 py-1 text-right"
								placeholder="0"
								readonly
								onclick={() => openKeypad('discount')}
								style="color: #000"
							/>
						</div>
						<div class="flex justify-between text-lg font-bold">
							<span style="color: #000">Total:</span>
							<span class="text-amber-600" style="color: #000">${total.toFixed(2)}</span>
						</div>
					</div>

					<!-- Método de pago -->
					<div class="mt-4 space-y-2">
						<label for="payment-method" class="block text-sm font-medium text-gray-900"
							>Método de pago:</label
						>
						<select
							id="payment-method"
							bind:value={paymentMethod}
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
						>
							<option value="EFECTIVO">Efectivo</option>
							<option value="TRANSFERENCIA">Transferencia</option>
							<option value="TARJETA">Tarjeta</option>
						</select>
					</div>

					<!-- Campos para efectivo -->
					{#if paymentMethod === 'EFECTIVO'}
						<div class="space-y-2">
							<label for="cash-received" class="block text-sm font-medium text-gray-900"
								>Efectivo recibido:</label
							>
							<input
								id="cash-received"
								type="number"
								bind:value={cashReceived}
								class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
								placeholder="0.00"
								onclick={() => openKeypad('cash')}
							/>
							{#if cashReceived > 0}
								<div class="flex justify-between font-medium text-green-600">
									<span>Cambio:</span>
									<span>${changeGiven}</span>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Botones de acción -->
					<div class="mt-6 space-y-2">
						<button
							class="w-full rounded-lg bg-amber-600 py-3 font-medium text-white hover:bg-amber-700 disabled:bg-gray-400"
							onclick={processSale}
							disabled={cart.length === 0}
						>
							Cobrar ${total.toFixed(2)}
						</button>
						<button
							class="w-full rounded-lg bg-gray-200 py-2 text-gray-900 hover:bg-gray-300"
							onclick={clearCart}
							disabled={cart.length === 0}
						>
							Vaciar Carrito
						</button>
					</div>
				</div>
			</div>
		</div>
	</main>
</div>

<!-- Teclado Numérico Modal -->
{#if showKeypad}
	<div class="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
		<div class="w-full max-w-sm rounded-lg bg-white shadow-xl">
			<div class="border-b p-4">
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-semibold text-black">
						{activeInput === 'discount' ? 'Descuento' : 'Efectivo Recibido'}
					</h3>
					<button onclick={closeKeypad} class="text-gray-900 hover:text-gray-900"> ✕ </button>
				</div>
				<div class="mt-2 text-2xl font-bold text-black">
					${keypadValue || '0'}
				</div>
			</div>

			<div class="p-4">
				<div class="grid grid-cols-3 gap-2">
					<!-- Números 7-9 -->
					<button
						onclick={() => appendToKeypad('7')}
						class="rounded bg-gray-100 p-4 text-lg font-semibold text-black hover:bg-gray-200 active:bg-gray-300"
					>
						7
					</button>
					<button
						onclick={() => appendToKeypad('8')}
						class="rounded bg-gray-100 p-4 text-lg font-semibold text-black hover:bg-gray-200 active:bg-gray-300"
					>
						8
					</button>
					<button
						onclick={() => appendToKeypad('9')}
						class="rounded bg-gray-100 p-4 text-lg font-semibold text-black hover:bg-gray-200 active:bg-gray-300"
					>
						9
					</button>

					<!-- Números 4-6 -->
					<button
						onclick={() => appendToKeypad('4')}
						class="rounded bg-gray-100 p-4 text-lg font-semibold text-black hover:bg-gray-200 active:bg-gray-300"
					>
						4
					</button>
					<button
						onclick={() => appendToKeypad('5')}
						class="rounded bg-gray-100 p-4 text-lg font-semibold text-black hover:bg-gray-200 active:bg-gray-300"
					>
						5
					</button>
					<button
						onclick={() => appendToKeypad('6')}
						class="rounded bg-gray-100 p-4 text-lg font-semibold text-black hover:bg-gray-200 active:bg-gray-300"
					>
						6
					</button>

					<!-- Números 1-3 -->
					<button
						onclick={() => appendToKeypad('1')}
						class="rounded bg-gray-100 p-4 text-lg font-semibold text-black hover:bg-gray-200 active:bg-gray-300"
					>
						1
					</button>
					<button
						onclick={() => appendToKeypad('2')}
						class="rounded bg-gray-100 p-4 text-lg font-semibold text-black hover:bg-gray-200 active:bg-gray-300"
					>
						2
					</button>
					<button
						onclick={() => appendToKeypad('3')}
						class="rounded bg-gray-100 p-4 text-lg font-semibold text-black hover:bg-gray-200 active:bg-gray-300"
					>
						3
					</button>

					<!-- 0, punto, borrar -->
					<button
						onclick={() => appendToKeypad('0')}
						class="rounded bg-gray-100 p-4 text-lg font-semibold text-black hover:bg-gray-200 active:bg-gray-300"
					>
						0
					</button>
					<button
						onclick={() => appendToKeypad('.')}
						class="rounded bg-gray-100 p-4 text-lg font-semibold text-black hover:bg-gray-200 active:bg-gray-300"
					>
						.
					</button>
					<button
						onclick={() => appendToKeypad('⌫')}
						class="rounded bg-red-100 p-4 text-lg font-semibold hover:bg-red-200 active:bg-red-300"
					>
						⌫
					</button>
				</div>

				<!-- Botones de acción -->
				<div class="mt-4 grid grid-cols-2 gap-2">
					<button
						onclick={() => appendToKeypad('C')}
						class="rounded bg-red-500 p-3 font-semibold text-white hover:bg-red-600 active:bg-red-700"
					>
						Limpiar
					</button>
					<button
						onclick={applyKeypadValue}
						class="rounded bg-amber-600 p-3 font-semibold text-white hover:bg-amber-700 active:bg-amber-800"
					>
						Aceptar
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.sticky {
		position: sticky;
	}
</style>
