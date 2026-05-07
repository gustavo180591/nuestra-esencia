<script lang="ts">
	import { onMount } from 'svelte';
	import type { Product, ProductSaleFormat } from '$lib/types';

	// Helper para formatear números con separadores de miles (formato argentino: $12.000,00)
	function formatCurrency(value: number | null | undefined): string {
		if (value === null || value === undefined || isNaN(value)) {
			return '$0,00';
		}
		return value.toLocaleString('es-AR', {
			style: 'currency',
			currency: 'ARS',
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});
	}

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
			formatQuantity: number;
			unitPrice: number;
			subtotal: number;
		}>
	>([]);

	let total = $state(0);
	let discount = $state(0);
	let paymentMethod = $state<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'QR'>('EFECTIVO');
	let paymentMethodId = $state<string>('');
	let cashReceived = $state(0);
	let changeGiven = $state(0);
	let paymentMethods = $state<Array<{ id: string; code: string; name: string; icon: string }>>([]);

	// Estado de caja
	let cashRegister = $state<any>(null);
	let showOpenModal = $state(false);
	let showCloseModal = $state(false);
	let openingAmount = $state(0);
	let closingAmount = $state(0);
	let closingNotes = $state('');
	let saving = $state(false);

	// Teclado numérico
	let showKeypad = $state(false);
	let activeInput = $state<'discount' | 'cash' | null>(null);
	let keypadValue = $state('');

	// Subtotal editable
	let editingSubtotalIndex = $state<number | null>(null);
	let subtotalEditValue = $state('');

	// Edición de cantidad en gramos (para productos por peso)
	let editingGramsIndex = $state<number | null>(null);
	let gramsEditValue = $state('');

	// Edición de precio (para calcular cantidad en productos por peso)
	let editingPriceIndex = $state<number | null>(null);
	let priceEditValue = $state('');

	// Cargar productos desde la API
	onMount(() => {
		loadProducts();
		// Agregar event listener para atajos de teclado
		window.addEventListener('keydown', handleKeyboardShortcuts);
		// Agregar event listener para cerrar ediciones al hacer click fuera
		window.addEventListener('click', handleClickOutside);

		// Limpiar event listener al desmontar
		return () => {
			window.removeEventListener('keydown', handleKeyboardShortcuts);
			window.removeEventListener('click', handleClickOutside);
		};
	});

	// Cerrar ediciones al hacer click fuera de los inputs
	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		const isEditingInput = target.closest('input[type="number"]') !== null;
		const isEditButton =
			target.closest('button[title="Click para editar gramos"]') !== null ||
			target.closest('button[title="Click para editar precio"]') !== null ||
			target.closest('button[title="Click para editar subtotal"]') !== null;

		// Si no se hizo click en un input de edición ni en botones de edición, cerrar las ediciones activas
		if (!isEditingInput && !isEditButton) {
			if (editingGramsIndex !== null) {
				applyGramsEdit(editingGramsIndex);
			}
			if (editingPriceIndex !== null) {
				applyPriceEdit(editingPriceIndex);
			}
			if (editingSubtotalIndex !== null) {
				applySubtotalEdit(editingSubtotalIndex);
			}
		}
	}

	async function loadProducts() {
		loading = true;
		try {
			console.log('📦 Cargando productos...');
			const response = await fetch('/api/products');
			console.log('Response status:', response.status);
			if (response.ok) {
				const data = await response.json();
				console.log('Response data:', data);
				products = data.data;
				console.log('Productos cargados:', products.length);
			} else {
				console.error('Error loading products:', response.statusText);
				const errorData = await response.json();
				console.error('Error data:', errorData);
			}
		} catch (error) {
			console.error('Error loading products:', error);
		} finally {
			loading = false;
		}
	}

	async function loadPaymentMethods() {
		try {
			console.log('💳 Cargando métodos de pago...');
			const response = await fetch('/api/payment-methods');
			if (response.ok) {
				const data = await response.json();
				console.log('Payment methods response:', data);
				paymentMethods = data.data;
				console.log('Payment methods cargados:', paymentMethods.length);
				// Establecer el ID del método por defecto (EFECTIVO)
				const efectivo = paymentMethods.find((pm) => pm.code === 'EFECTIVO');
				if (efectivo) {
					paymentMethodId = efectivo.id;
					console.log('PaymentMethodId por defecto:', paymentMethodId);
				}
			} else {
				console.error('Error loading payment methods:', response.statusText);
			}
		} catch (error) {
			console.error('Error loading payment methods:', error);
		}
	}

	// Teclado numérico
	function openKeypad(inputType: 'discount' | 'cash') {
		activeInput = inputType;
		keypadValue = '';
		showKeypad = true;
	}

	function startEditingSubtotal(index: number, currentSubtotal: number) {
		// Cerrar otras ediciones si están abiertas
		if (editingGramsIndex !== null) {
			applyGramsEdit(editingGramsIndex);
		}
		if (editingPriceIndex !== null) {
			applyPriceEdit(editingPriceIndex);
		}
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

	function startEditingGrams(index: number, currentGrams: number) {
		// Cerrar otras ediciones si están abiertas
		if (editingPriceIndex !== null) {
			applyPriceEdit(editingPriceIndex);
		}
		if (editingSubtotalIndex !== null) {
			applySubtotalEdit(editingSubtotalIndex);
		}
		editingGramsIndex = index;
		gramsEditValue = currentGrams.toFixed(0);
	}

	function applyGramsEdit(index: number) {
		const grams = parseFloat(gramsEditValue) || 0;
		const newQuantity = grams / 1000; // convertir a kg
		cart[index].quantity = newQuantity;
		cart[index].subtotal = newQuantity * cart[index].unitPrice;
		updateTotals();
		editingGramsIndex = null;
	}

	function startEditingPrice(index: number, currentSubtotal: number) {
		// Cerrar otras ediciones si están abiertas
		if (editingGramsIndex !== null) {
			applyGramsEdit(editingGramsIndex);
		}
		if (editingSubtotalIndex !== null) {
			applySubtotalEdit(editingSubtotalIndex);
		}
		editingPriceIndex = index;
		priceEditValue = currentSubtotal.toFixed(2);
	}

	function applyPriceEdit(index: number) {
		const desiredSubtotal = parseFloat(priceEditValue) || 0;
		const unitPrice = cart[index].unitPrice;
		const newQuantity = unitPrice > 0 ? desiredSubtotal / unitPrice : 0;
		cart[index].quantity = newQuantity;
		cart[index].subtotal = desiredSubtotal;
		updateTotals();
		editingPriceIndex = null;
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

		// F1-F4: Métodos de pago
		if (event.key === 'F1') {
			event.preventDefault();
			paymentMethod = 'EFECTIVO';
			const efectivo = paymentMethods.find((pm) => pm.code === 'EFECTIVO');
			if (efectivo) paymentMethodId = efectivo.id;
		}
		if (event.key === 'F2') {
			event.preventDefault();
			paymentMethod = 'TRANSFERENCIA';
			const transferencia = paymentMethods.find((pm) => pm.code === 'TRANSFERENCIA');
			if (transferencia) paymentMethodId = transferencia.id;
		}
		if (event.key === 'F3') {
			event.preventDefault();
			paymentMethod = 'TARJETA';
			const tarjeta = paymentMethods.find((pm) => pm.code === 'TARJETA');
			if (tarjeta) paymentMethodId = tarjeta.id;
		}
		if (event.key === 'F4') {
			event.preventDefault();
			paymentMethod = 'QR';
			const qr = paymentMethods.find((pm) => pm.code === 'QR');
			if (qr) paymentMethodId = qr.id;
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
				formatQuantity: format.quantity || 1,
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

		// Validar que la caja esté abierta
		if (!cashRegister) {
			alert('Debe abrir la caja antes de realizar ventas');
			showOpenModal = true;
			return;
		}

		// En efectivo, si no se ingresó monto, asumir que se recibe exacto
		if (paymentMethod === 'EFECTIVO') {
			if (cashReceived === 0) {
				cashReceived = Math.round(total * 100) / 100;
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
					quantity: item.quantity,
					formatQuantity: item.formatQuantity
				})),
				discount: discount > 0 ? discount : undefined,
				paymentMethodId,
				cashReceived: paymentMethod === 'EFECTIVO' ? cashReceived : undefined
			};

			const response = await fetch('/api/sales', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(saleData)
			});

			console.log('Sale data being sent:', saleData);
			console.log('Response status:', response.status);

			const result = await response.json();
			console.log('Response result:', result);

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

	// Funciones de caja
	async function loadCashRegister() {
		try {
			const response = await fetch('/api/cash-register?status=ABIERTA');
			const data = await response.json();
			if (data.success) {
				cashRegister = data.data;
			}
		} catch (error) {
			console.error('Error loading cash register:', error);
		}
	}

	async function openCashRegister() {
		saving = true;
		try {
			const response = await fetch('/api/cash-register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ initialAmount: openingAmount })
			});

			const result = await response.json();
			if (result.success) {
				showOpenModal = false;
				openingAmount = 0;
				await loadCashRegister();
			} else {
				alert(`Error: ${result.message}`);
			}
		} catch (error) {
			alert('Error al abrir caja');
		} finally {
			saving = false;
		}
	}

	async function closeCashRegister() {
		saving = true;
		try {
			const response = await fetch('/api/cash-register', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					actualAmount: closingAmount,
					notes: closingNotes
				})
			});

			const result = await response.json();
			if (result.success) {
				showCloseModal = false;
				closingAmount = 0;
				closingNotes = '';
				await loadCashRegister();
			} else {
				alert(`Error: ${result.message}`);
			}
		} catch (error) {
			alert('Error al cerrar caja');
		} finally {
			saving = false;
		}
	}

	onMount(async () => {
		await loadProducts();
		await loadPaymentMethods();
		await loadCashRegister();
	});

	$effect(() => {
		updateTotals();
	});

	$effect(() => {
		const method = paymentMethods.find((pm) => pm.code === paymentMethod);
		if (method) {
			paymentMethodId = method.id;
		}
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
				<div class="text-right text-sm">
					{#if cashRegister}
						<div class="text-amber-100">
							💵 Caja Abierta
							{formatCurrency(cashRegister.initialAmount)}
						</div>
						<div class="text-xs text-amber-200">
							Por: {cashRegister.openedBy?.name || 'Usuario'}
						</div>
						<div class="mt-2 flex justify-end space-x-2">
							<button
								onclick={() => (showCloseModal = true)}
								class="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
							>
								Cerrar Caja
							</button>
						</div>
					{:else}
						<div class="text-red-100">🔴 Caja Cerrada</div>
						<div class="mt-2 flex justify-end">
							<button
								onclick={() => (showOpenModal = true)}
								class="rounded-md bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
							>
								Abrir Caja
							</button>
						</div>
					{/if}
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
													{product.stockUnit === 'KILOGRAMO' ? 'kg' : 'unid.'}
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
								{@const isWeightBased = item.unitMeasure === 'KILOGRAMO'}
								<div class="flex items-center justify-between rounded bg-gray-50 p-3">
									<div class="flex-1">
										<div class="font-medium" style="color: #000">{item.productName}</div>
										{#if item.formatLabel}
											<div class="text-sm text-gray-600" style="color: #666">
												{item.formatLabel}
											</div>
										{/if}
										<div class="text-sm font-bold" style="color: #000">
											{#if isWeightBased}
												${item.unitPrice} / kg
											{:else}
												${item.unitPrice} c/u
											{/if}
										</div>
									</div>
									<div class="flex items-center space-x-2">
										<div class="flex flex-col items-end">
											{#if isWeightBased}
												<!-- Producto por peso: botones rápidos -->
												<div class="flex items-center gap-1">
													<button
														class="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200"
														onclick={() => updateQuantity(index, item.quantity + 0.1)}
													>
														100g
													</button>
													<button
														class="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200"
														onclick={() => updateQuantity(index, item.quantity + 0.2)}
													>
														200g
													</button>
													<button onclick={() => updateQuantity(index, item.quantity + 0.5)}>
														500g
													</button>
													<button
														class="h-7 w-7 rounded bg-red-100 text-red-600 hover:bg-red-200"
														onclick={() =>
															updateQuantity(index, Math.max(0.05, item.quantity - 0.05))}
														disabled={item.quantity <= 0.05}
													>
														-50g
													</button>
													<button
														class="h-7 w-7 rounded bg-green-100 text-green-600 hover:bg-green-200"
														onclick={() => updateQuantity(index, item.quantity + 0.05)}
													>
														+50g
													</button>
												</div>
												<div class="mt-1 text-right text-sm">
													{#if editingGramsIndex === index}
														<input
															type="number"
															class="w-20 rounded border px-1 py-1 text-center text-sm font-medium text-black"
															bind:value={gramsEditValue}
															min="0.1"
															step="0.1"
															onblur={() => applyGramsEdit(index)}
															onkeydown={(e) => {
																if (e.key === 'Enter') {
																	applyGramsEdit(index);
																}
															}}
														/>
													{:else}
														<button
															class="font-medium hover:text-amber-600"
															style="color: #000"
															onclick={() => startEditingGrams(index, item.quantity * 1000)}
															title="Click para editar gramos"
														>
															{(item.quantity * 1000).toFixed(1)}g
														</button>
													{/if}
													<span class="text-gray-500">= </span>
													{#if editingPriceIndex === index}
														<input
															type="number"
															class="w-24 rounded border px-1 py-1 text-right text-sm font-medium text-black"
															bind:value={priceEditValue}
															min="0"
															step="0.01"
															onblur={() => applyPriceEdit(index)}
															onkeydown={(e) => {
																if (e.key === 'Enter') {
																	applyPriceEdit(index);
																}
															}}
														/>
													{:else}
														<button
															class="text-gray-500 hover:text-amber-600"
															onclick={() => startEditingPrice(index, item.subtotal)}
															title="Click para editar precio"
														>
															{formatCurrency(item.subtotal)}
														</button>
													{/if}
												</div>
											{:else}
												<!-- Producto por unidad: input numérico -->
												<div class="flex items-center space-x-2">
													<button
														class="h-8 w-8 rounded bg-red-100 text-red-600 hover:bg-red-200"
														onclick={() => updateQuantity(index, item.quantity - 1)}
													>
														-
													</button>
													<input
														type="number"
														class="w-16 rounded border px-1 py-1 text-center text-sm text-black"
														value={item.quantity}
														min="1"
														step="1"
														onchange={(e) => {
															const val = parseInt(e.currentTarget.value) || 1;
															updateQuantity(index, val);
														}}
													/>
													<button
														class="h-8 w-8 rounded bg-green-100 text-green-600 hover:bg-green-200"
														onclick={() => updateQuantity(index, item.quantity + 1)}
													>
														+
													</button>
												</div>
												<div class="mt-1 text-right font-bold" style="color: #000">
													{#if editingSubtotalIndex === index}
														<input
															type="number"
															class="w-24 rounded border px-1 py-1 text-right text-sm font-medium text-black"
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
															class="hover:text-amber-600"
															style="color: #000"
															onclick={() => startEditingSubtotal(index, item.subtotal)}
															title="Click para editar subtotal"
														>
															{formatCurrency(item.subtotal)}
														</button>
													{/if}
												</div>
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
								>{formatCurrency(cart.reduce((sum, item) => sum + item.subtotal, 0))}</span
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
							<span class="text-amber-600" style="color: #000">{formatCurrency(total)}</span>
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
							{#each paymentMethods as pm}
								<option value={pm.code}>
									{pm.icon}
									{pm.name}
								</option>
							{/each}
						</select>
					</div>

					<!-- Campos para efectivo -->
					{#if paymentMethod === 'EFECTIVO'}
						<div class="rounded-lg bg-blue-50 p-3 text-center text-sm text-blue-700">
							F1: Efectivo | F2: Transferencia | F3: Tarjeta | F4: QR
						</div>
					{/if}
					{#if paymentMethod === 'QR'}
						<div class="rounded-lg bg-purple-50 p-4 text-center">
							<div class="mb-2 text-4xl">📱</div>
							<p class="text-sm font-medium text-purple-700">Escanea el QR del cliente</p>
							<p class="text-xs text-purple-600">O el cliente escanea tu código</p>
						</div>
					{/if}
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
								min="0"
								step="0.01"
							/>
							{#if cashReceived > 0}
								<div class="flex justify-between font-medium text-green-600">
									<span>Cambio:</span>
									<span>{formatCurrency(changeGiven)}</span>
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
							Cobrar {formatCurrency(total)}
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

<!-- Modal Apertura de Caja -->
{#if showOpenModal}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="bg-opacity-50 flex min-h-full items-center justify-center bg-black p-4">
			<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-lg font-semibold text-gray-900">Apertura de Caja</h3>
					<button onclick={() => (showOpenModal = false)} class="text-gray-400 hover:text-gray-600"
						>✕</button
					>
				</div>

				<form onsubmit={openCashRegister}>
					<div class="space-y-4">
						<div>
							<label for="openingAmount" class="block text-sm font-medium text-gray-700"
								>Monto Inicial</label
							>
							<div class="relative">
								<span class="absolute top-2 left-3 text-gray-500">$</span>
								<input
									id="openingAmount"
									type="number"
									bind:value={openingAmount}
									min="0"
									step="0.01"
									required
									class="w-full rounded-md border-gray-300 py-2 pr-3 pl-8 text-gray-900"
									placeholder="0.00"
								/>
							</div>
						</div>
					</div>

					<div class="mt-6 flex justify-end">
						<button
							type="button"
							onclick={() => (showOpenModal = false)}
							class="rounded-md border border-gray-300 px-4 py-2 text-gray-900 hover:bg-gray-50"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={saving}
							class="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-gray-400"
						>
							{saving ? 'Abriendo...' : 'Abrir Caja'}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Cierre de Caja -->
{#if showCloseModal && cashRegister}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="bg-opacity-50 flex min-h-full items-center justify-center bg-black p-4">
			<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-lg font-semibold text-gray-900">Cierre de Caja</h3>
					<button onclick={() => (showCloseModal = false)} class="text-gray-400 hover:text-gray-600"
						>✕</button
					>
				</div>

				<div class="mb-4 rounded bg-gray-50 p-4">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<div class="text-xs text-gray-500">Monto Inicial</div>
							<div class="text-sm font-medium">{formatCurrency(cashRegister.initialAmount)}</div>
						</div>
						<div>
							<div class="text-xs text-gray-500">Ventas Efectivo</div>
							<div class="text-sm font-medium">
								{formatCurrency(cashRegister.expectedAmount - cashRegister.initialAmount)}
							</div>
						</div>
					</div>
					<div class="mt-4 grid grid-cols-2 gap-4">
						<div>
							<div class="text-xs text-gray-500">Total Esperado</div>
							<div class="text-sm font-medium">{formatCurrency(cashRegister.expectedAmount)}</div>
						</div>
						<div>
							<div class="text-xs text-gray-500">Diferencia</div>
							<div class="text-sm font-medium text-red-600">
								{formatCurrency(cashRegister.difference || 0)}
							</div>
						</div>
					</div>
				</div>

				<form onsubmit={closeCashRegister}>
					<div class="space-y-4">
						<div>
							<label for="closingAmount" class="block text-sm font-medium text-gray-700"
								>Monto Real</label
							>
							<div class="relative">
								<span class="absolute top-2 left-3 text-gray-500">$</span>
								<input
									id="closingAmount"
									type="number"
									bind:value={closingAmount}
									min="0"
									step="0.01"
									required
									class="w-full rounded-md border-gray-300 py-2 pr-3 pl-8 text-gray-900"
									placeholder="0.00"
								/>
							</div>
						</div>

						<div>
							<label for="closingNotes" class="block text-sm font-medium text-gray-700">Notas</label
							>
							<textarea
								id="closingNotes"
								bind:value={closingNotes}
								rows="3"
								class="w-full rounded-md border-gray-300 px-3 py-2 text-gray-900"
								placeholder="Observaciones del cierre de caja..."
							></textarea>
						</div>
					</div>

					<div class="mt-6 flex justify-end">
						<button
							type="button"
							onclick={() => (showCloseModal = false)}
							class="rounded-md border border-gray-300 px-4 py-2 text-gray-900 hover:bg-gray-50"
						>
							Cancelar
						</button>
						<button
							type="submit"
							disabled={saving}
							class="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:bg-gray-400"
						>
							{saving ? 'Cerrando...' : 'Cerrar Caja'}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<style>
	.sticky {
		position: sticky;
	}
</style>
