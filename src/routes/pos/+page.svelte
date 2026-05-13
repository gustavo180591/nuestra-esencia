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
			isCombo?: boolean;
			comboItems?: Array<{
				id: string;
				component: { id: string; name: string };
				quantity: number;
			}>;
		}>
	>([]);

	let total = $state(0);
	let discount = $state(0);
	let discountType = $state<'percentage' | 'amount'>('amount');
	let discountPercentage = $state(0);
	let paymentMethod = $state<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA' | 'QR'>('EFECTIVO');
	let paymentMethodId = $state<string>('');
	let cashReceived = $state(0);
	let changeGiven = $state(0);
	let paymentMethods = $state<Array<{ id: string; code: string; name: string; icon: string }>>([]);

	// Estado de caja
	let cashRegister = $state<{
		id: string;
		status: string;
		initialAmount: number;
		expectedAmount?: number;
		sales?: Array<{ paymentMethod?: { code: string }; cashReceived?: number; total: number }>;
		expenses?: Array<{ paymentMethod: string; amount: number }>;
		difference?: number;
		openedBy?: { name: string };
		openedAt?: string;
		branch?: string;
	} | null>(null);
	let showOpenModal = $state(false);
	let showMovementModal = $state(false);
	let showCloseModal = $state(false);
	let openingAmount = $state(0);
	let openingNotes = $state('');
	let closingAmount = $state(0);
	let closingNotes = $state('');
	let saving = $state(false);

	// Estado de movimientos de caja
	let movements = $state<
		Array<{
			id: string;
			type: string;
			category: string;
			amount: number;
			description: string;
			user?: { name: string };
		}>
	>([]);
	let movementType = $state<'INGRESO' | 'EGRESO'>('INGRESO');
	let movementCategory = $state('GASTO');
	let movementAmount = $state(0);
	let movementDescription = $state('');

	// Conteo de billetes para cierre de caja
	let billCounts = $state({
		'20000': 0,
		'10000': 0,
		'2000': 0,
		'1000': 0,
		'500': 0,
		'200': 0,
		'100': 0,
		'50': 0,
		'20': 0,
		'10': 0
	});

	// Dinero digital para cierre de caja
	let qrAmount = $state(0);
	let transferAmount = $state(0);

	// Dinero digital para apertura de caja
	let openingQrAmount = $state(0);
	let openingTransferAmount = $state(0);

	// Conteo de billetes para apertura de caja
	let openingBillCounts = $state({
		'20000': 0,
		'10000': 0,
		'2000': 0,
		'1000': 0,
		'500': 0,
		'200': 0,
		'100': 0,
		'50': 0,
		'20': 0,
		'10': 0
	});

	// Calcular total de billetes contados
	let totalBills = $derived(
		Object.entries(billCounts).reduce((sum, [denomination, count]) => {
			return sum + Number(denomination) * count;
		}, 0)
	);

	// Calcular total de billetes de apertura
	let totalOpeningBills = $derived(
		Object.entries(openingBillCounts).reduce((sum, [denomination, count]) => {
			return sum + Number(denomination) * count;
		}, 0)
	);

	// Calcular totales para apertura de caja
	let totalOpeningPhysicalMoney = $derived(
		Object.entries(openingBillCounts).reduce((sum, [denomination, count]) => {
			return sum + Number(denomination) * count;
		}, 0)
	);

	let totalOpeningDigitalMoney = $derived(openingQrAmount + openingTransferAmount);

	let openingGrandTotal = $derived(totalOpeningPhysicalMoney + totalOpeningDigitalMoney);

	// Calcular totales para cierre de caja
	let totalPhysicalMoney = $derived(
		Object.entries(billCounts).reduce((sum, [denomination, count]) => {
			return sum + Number(denomination) * count;
		}, 0)
	);

	let totalDigitalMoney = $derived(qrAmount + transferAmount);

	let grandTotal = $derived(totalPhysicalMoney + totalDigitalMoney);

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
			const response = await fetch('/api/products?includeCombos=true');
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
		// Forzar actualización del valor con el subtotal actual del carrito
		const actualSubtotal = cart[index].subtotal;
		subtotalEditValue = actualSubtotal.toFixed(2);
	}

	function applySubtotalEdit(index: number) {
		const desiredSubtotal = parseFloat(subtotalEditValue) || 0;
		const unitPrice = cart[index].unitPrice;
		const newQuantity = unitPrice > 0 ? desiredSubtotal / unitPrice : 0;
		cart[index].quantity = newQuantity;
		cart[index].subtotal = newQuantity * cart[index].unitPrice;
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
		// Forzar actualización del valor con los gramos actuales del carrito
		const actualGrams = cart[index].quantity * 1000;
		gramsEditValue = actualGrams.toFixed(0);
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
		// Forzar actualización del valor con el subtotal actual del carrito
		const actualSubtotal = cart[index].subtotal;
		priceEditValue = actualSubtotal.toFixed(2);
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
				subtotal: Number(format.price),
				isCombo: product.isCombo,
				comboItems: product.comboItems
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
				// Cargar movimientos si hay caja abierta
				if (cashRegister) {
					await loadMovements();
				}
			}
		} catch (error) {
			console.error('Error loading cash register:', error);
		}
	}

	async function loadMovements() {
		if (!cashRegister) return;
		try {
			const response = await fetch(`/api/cash-movements?cashRegisterId=${cashRegister.id}`);
			const data = await response.json();
			if (data.success) {
				movements = data.data;
			}
		} catch (error) {
			console.error('Error loading movements:', error);
		}
	}

	async function createMovement() {
		if (!cashRegister) return;
		saving = true;
		try {
			const response = await fetch('/api/cash-movements', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					cashRegisterId: cashRegister.id,
					type: movementType,
					category: movementCategory,
					amount: movementAmount,
					description: movementDescription
				})
			});

			const result = await response.json();
			if (result.success) {
				showMovementModal = false;
				movementType = 'INGRESO';
				movementCategory = 'GASTO';
				movementAmount = 0;
				movementDescription = '';
				await loadMovements();
				await loadCashRegister(); // Recargar para actualizar expectedAmount
			} else {
				alert(`Error: ${result.message}`);
			}
		} catch {
			alert('Error al registrar movimiento');
		} finally {
			saving = false;
		}
	}

	async function openCashRegister() {
		saving = true;
		try {
			const response = await fetch('/api/cash-register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					initialAmount: openingGrandTotal,
					branch: 'Principal',
					openingBillCounts: openingBillCounts,
					openingNotes: openingNotes || null
				})
			});

			const result = await response.json();
			if (result.success) {
				showOpenModal = false;
				openingAmount = 0;
				openingNotes = '';
				// Resetear conteo de billetes de apertura
				openingBillCounts = {
					'20000': 0,
					'10000': 0,
					'2000': 0,
					'1000': 0,
					'500': 0,
					'200': 0,
					'100': 0,
					'50': 0,
					'20': 0,
					'10': 0
				};
				await loadCashRegister();
			} else {
				alert(`Error: ${result.message}`);
			}
		} catch {
			alert('Error al abrir caja');
		} finally {
			saving = false;
		}
	}

	async function closeCashRegister() {
		saving = true;
		try {
			// Calcular diferencia esperada
			const expectedAmount = Number(cashRegister?.expectedAmount || 0);
			const difference = closingAmount - expectedAmount;

			// Validar que se agreguen notas solo si hay una diferencia significativa (no 0)
			if (difference !== 0 && !closingNotes.trim()) {
				alert('Debe agregar observaciones cuando existe una diferencia en el cierre de caja');
				saving = false;
				return;
			}

			const response = await fetch('/api/cash-register', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					totalAmount: grandTotal,
					notes: difference !== 0 ? closingNotes : '',
					billCounts
				})
			});

			const result = await response.json();
			if (result.success) {
				showCloseModal = false;
				closingAmount = 0;
				closingNotes = '';
				// Resetear conteo de billetes
				billCounts = {
					'20000': 0,
					'10000': 0,
					'2000': 0,
					'1000': 0,
					'500': 0,
					'200': 0,
					'100': 0,
					'50': 0,
					'20': 0,
					'10': 0
				};
				await loadCashRegister();
			} else {
				alert(`Error: ${result.message}`);
			}
		} catch {
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
				<div class="flex items-center space-x-3">
					<div class="text-right text-sm">
						{#if cashRegister}
							<div class="text-amber-100">
								💵 Caja Abierta
								{formatCurrency(cashRegister.initialAmount)}
							</div>
							<div class="text-xs text-amber-200">
								Por: {cashRegister.openedBy?.name || 'Usuario'}
							</div>
						{:else}
							<div class="text-red-100">🔴 Caja Cerrada</div>
						{/if}
					</div>
					{#if cashRegister}
						<button
							type="button"
							onclick={() => (showCloseModal = true)}
							class="rounded-md bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700"
						>
							Cerrar Caja
						</button>
					{:else}
						<button
							type="button"
							onclick={() => (showOpenModal = true)}
							class="rounded-md bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-700"
						>
							Abrir Caja
						</button>
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
						<!-- Sección de Combos -->
						{@const combos = products.filter((p) => p.isCombo && p.status === 'ACTIVO')}
						{#if combos.length > 0}
							<div class="mb-6">
								<h3 class="mb-3 border-b pb-2 text-lg font-medium text-purple-900">🎁 Combos</h3>
								<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
									{#each combos as combo (combo.id)}
										{@const availableCombos =
											combo.comboItems && combo.comboItems.length > 0
												? Math.floor(
														Math.min(
															...combo.comboItems.map((item) => {
																const component = products.find((p) => p.id === item.component.id);
																return component
																	? Number(component.stock) / Number(item.quantity)
																	: 0;
															})
														)
													)
												: 0}
										{@const hasInsufficientStock = availableCombos === 0}
										<div class="relative space-y-3">
											<button
												class="w-full transform rounded-xl border-2 {hasInsufficientStock
													? 'border-red-300 from-red-50 to-red-100'
													: 'border-purple-300 from-purple-50 to-purple-100'} bg-linear-to-br p-6 text-left transition-all duration-200 hover:scale-105 {hasInsufficientStock
													? 'hover:border-red-500 hover:from-red-100 hover:to-red-200'
													: 'hover:border-purple-500 hover:from-purple-100 hover:to-purple-200'} hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
												onclick={() =>
													!hasInsufficientStock && addToCart(combo, combo.saleFormats[0])}
												disabled={hasInsufficientStock}
											>
												<div
													class="mb-1 text-lg font-bold {hasInsufficientStock
														? 'text-red-900'
														: 'text-purple-900'}"
												>
													{combo.name}
												</div>
												{#if combo.description}
													<div class="mb-2 text-sm text-gray-600">{combo.description}</div>
												{/if}
												<div
													class="mb-2 flex items-center text-sm {hasInsufficientStock
														? 'text-red-700'
														: 'text-green-700'}"
												>
													<span
														class="mr-2 inline-block h-2 w-2 rounded-full {hasInsufficientStock
															? 'bg-red-500'
															: 'bg-green-500'}"
													></span>
													Disponibles: {availableCombos} combos
												</div>
												<div
													class="mb-1 text-2xl font-bold {hasInsufficientStock
														? 'text-red-600'
														: 'text-purple-600'}"
												>
													${combo.saleFormats[0]?.price}
												</div>
												<div
													class="inline-block rounded {hasInsufficientStock
														? 'bg-red-200 text-red-700'
														: 'bg-purple-200 text-purple-700'} px-2 py-1 text-sm font-medium"
												>
													{combo.saleFormats[0]?.label}
												</div>
												<div class="mt-2 text-xs text-gray-500">
													{#if combo.comboItems && combo.comboItems.length > 0}
														{#each combo.comboItems as item (item.id)}
															{@const component = products.find((p) => p.id === item.component.id)}
															{@const componentStock = component ? Number(component.stock) : 0}
															{@const neededStock = Number(item.quantity)}
															<span
																class={componentStock < neededStock
																	? 'font-semibold text-red-600'
																	: ''}
															>
																{item.component.name} x{item.quantity}
																{#if componentStock < neededStock}
																	<span class="ml-1 text-red-500">⚠️ Falta stock</span>
																{/if}
															</span>
															{#if item.id !== combo.comboItems[combo.comboItems.length - 1].id},
															{/if}
														{/each}
													{:else}
														Sin componentes
													{/if}
												</div>
											</button>
											{#if hasInsufficientStock}
												<div
													class="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-lg"
												>
													!
												</div>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Agrupar productos por categoría -->
						{@const normalProducts = products.filter((p) => !p.isCombo && p.status === 'ACTIVO')}
						{#each Array.from(new Set(normalProducts.map((p) => p.category?.name))) as categoryName (categoryName)}
							{@const categoryProducts = normalProducts.filter(
								(p) => p.category?.name === categoryName
							)}

							<div class="mb-6">
								<h3 class="mb-3 border-b pb-2 text-lg font-medium text-gray-900">
									{categoryName || 'Combos'}
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

					<!-- Botones de acción -->
					<div class="mb-4 space-y-2">
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

					<!-- Items del carrito -->
					<div class="mb-4 max-h-96 space-y-2 overflow-y-auto">
						{#if cart.length === 0}
							<div class="py-4 text-center text-gray-900">El carrito está vacío</div>
						{:else}
							{#each cart
								.slice()
								.reverse() as item, index (item.productId + '-' + item.productSaleFormatId + '-' + index)}
								{@const isWeightBased = item.unitMeasure === 'KILOGRAMO'}
								{@const realIndex = cart.length - 1 - index}
								<div
									class="flex items-center justify-between rounded bg-gray-50 p-3 {item.isCombo
										? 'border-l-4 border-purple-500 bg-purple-50'
										: ''}"
								>
									<div class="flex-1">
										<div class="font-medium" style="color: #000">
											{#if item.isCombo}
												<span class="mr-1 text-purple-600">🎁</span>
												<span class="text-purple-700">{item.productName}</span>
												<span
													class="ml-1 rounded bg-purple-200 px-1.5 py-0.5 text-xs text-purple-700"
													>COMBO</span
												>
											{:else}
												{item.productName}
											{/if}
										</div>
										{#if item.formatLabel && !item.isCombo}
											<div class="text-sm text-gray-600" style="color: #666">
												{item.formatLabel}
											</div>
										{/if}
										{#if item.isCombo && item.comboItems && item.comboItems.length > 0}
											<div class="mt-1 text-xs text-gray-500">
												{#each item.comboItems as comboItem, i (comboItem.id)}
													{comboItem.component.name} x{comboItem.quantity}{i <
													item.comboItems!.length - 1
														? ', '
														: ''}
												{/each}
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
														onclick={() => updateQuantity(realIndex, item.quantity + 0.1)}
													>
														100g
													</button>
													<button
														class="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-200"
														onclick={() => updateQuantity(realIndex, item.quantity + 0.2)}
													>
														200g
													</button>
													<button onclick={() => updateQuantity(realIndex, item.quantity + 0.5)}>
														500g
													</button>
													<button
														class="h-7 w-7 rounded bg-red-100 text-red-600 hover:bg-red-200"
														onclick={() =>
															updateQuantity(realIndex, Math.max(0.05, item.quantity - 0.05))}
														disabled={item.quantity <= 0.05}
													>
														-50g
													</button>
													<button
														class="h-7 w-7 rounded bg-green-100 text-green-600 hover:bg-green-200"
														onclick={() => updateQuantity(realIndex, item.quantity + 0.05)}
													>
														+50g
													</button>
												</div>
												<div class="mt-1 text-right text-sm">
													{#if editingGramsIndex === realIndex}
														<input
															type="number"
															class="w-20 rounded border px-1 py-1 text-center text-sm font-medium text-black"
															bind:value={gramsEditValue}
															min="0.1"
															step="0.1"
															onblur={() => applyGramsEdit(realIndex)}
															onkeydown={(e) => {
																if (e.key === 'Enter') {
																	applyGramsEdit(realIndex);
																}
															}}
														/>
													{:else}
														<button
															class="font-medium hover:text-amber-600"
															style="color: #000"
															onclick={() => startEditingGrams(realIndex, item.quantity * 1000)}
															title="Click para editar gramos"
														>
															{(item.quantity * 1000).toFixed(1)}g
														</button>
													{/if}
													<span class="text-gray-500">= </span>
													{#if editingPriceIndex === realIndex}
														<input
															type="number"
															class="w-24 rounded border px-1 py-1 text-right text-sm font-medium text-black"
															bind:value={priceEditValue}
															min="0"
															step="0.01"
															onblur={() => applyPriceEdit(realIndex)}
															onkeydown={(e) => {
																if (e.key === 'Enter') {
																	applyPriceEdit(realIndex);
																}
															}}
														/>
													{:else}
														<button
															class="text-gray-500 hover:text-amber-600"
															onclick={() => startEditingPrice(realIndex, item.subtotal)}
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
														onclick={() => updateQuantity(realIndex, item.quantity - 1)}
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
															updateQuantity(realIndex, val);
														}}
													/>
													<button
														class="h-8 w-8 rounded bg-green-100 text-green-600 hover:bg-green-200"
														onclick={() => updateQuantity(realIndex, item.quantity + 1)}
													>
														+
													</button>
												</div>
												<div class="mt-1 text-right font-bold" style="color: #000">
													{#if editingSubtotalIndex === realIndex}
														<input
															type="number"
															class="w-24 rounded border px-1 py-1 text-right text-sm font-medium text-black"
															bind:value={subtotalEditValue}
															min="0"
															step="0.01"
															onblur={() => applySubtotalEdit(realIndex)}
															onkeydown={(e) => {
																if (e.key === 'Enter') {
																	applySubtotalEdit(realIndex);
																}
															}}
														/>
													{:else}
														<button
															class="hover:text-amber-600"
															style="color: #000"
															onclick={() => startEditingSubtotal(realIndex, item.subtotal)}
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
						<div class="flex items-center justify-between">
							<span style="color: #000">Descuento:</span>
							<div class="flex items-center gap-2">
								<!-- Selector de tipo de descuento -->
								<div class="flex overflow-hidden rounded border">
									<button
										type="button"
										class="px-2 py-1 text-sm {discountType === 'amount'
											? 'bg-amber-600 text-white'
											: 'bg-gray-100 text-gray-700'}"
										onclick={() => {
											discountType = 'amount';
											discount = 0;
											discountPercentage = 0;
											updateTotals();
										}}
									>
										$
									</button>
									<button
										type="button"
										class="px-2 py-1 text-sm {discountType === 'percentage'
											? 'bg-amber-600 text-white'
											: 'bg-gray-100 text-gray-700'}"
										onclick={() => {
											discountType = 'percentage';
											discount = 0;
											discountPercentage = 0;
											updateTotals();
										}}
									>
										%
									</button>
								</div>
								<!-- Input de descuento según tipo seleccionado -->
								{#if discountType === 'amount'}
									<input
										type="number"
										bind:value={discount}
										class="w-20 rounded border px-2 py-1 text-right"
										placeholder="0"
										readonly
										onclick={() => openKeypad('discount')}
										style="color: #000"
									/>
								{:else}
									<input
										type="number"
										bind:value={discountPercentage}
										class="w-20 rounded border px-2 py-1 text-right"
										placeholder="0"
										min="0"
										max="100"
										onchange={(e) => {
											const pct = Math.min(
												100,
												Math.max(0, parseFloat(e.currentTarget.value) || 0)
											);
											discountPercentage = pct;
											const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
											discount = Math.round((subtotal * pct) / 100);
											updateTotals();
										}}
										style="color: #000"
									/>
									<span class="text-sm text-gray-600">%</span>
								{/if}
							</div>
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
							{#each paymentMethods as pm (pm.id)}
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

				<!-- Contenido del modal -->
				<div class="space-y-6">
					<div>
						<h4 class="text-lg font-semibold text-gray-900">Dinero Físico</h4>
						<div class="mt-4 grid grid-cols-2 gap-3">
							<div>
								<label for="opening-bill-20000" class="block text-xs text-gray-500">$ 20.000</label>
								<input
									type="number"
									id="opening-bill-20000"
									min="0"
									bind:value={openingBillCounts['20000']}
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
								/>
							</div>
							<div>
								<label for="opening-bill-10000" class="block text-xs text-gray-500">$ 10.000</label>
								<input
									type="number"
									id="opening-bill-10000"
									min="0"
									bind:value={openingBillCounts['10000']}
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
								/>
							</div>
							<div>
								<label for="opening-bill-2000" class="block text-xs text-gray-500">$ 2.000</label>
								<input
									type="number"
									id="opening-bill-2000"
									min="0"
									bind:value={openingBillCounts['2000']}
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
								/>
							</div>
							<div>
								<label for="opening-bill-1000" class="block text-xs text-gray-500">$ 1.000</label>
								<input
									type="number"
									id="opening-bill-1000"
									min="0"
									bind:value={openingBillCounts['1000']}
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
								/>
							</div>
							<div>
								<label for="opening-bill-500" class="block text-xs text-gray-500">$ 500</label>
								<input
									type="number"
									id="opening-bill-500"
									min="0"
									bind:value={openingBillCounts['500']}
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
								/>
							</div>
							<div>
								<label for="opening-bill-200" class="block text-xs text-gray-500">$ 200</label>
								<input
									type="number"
									id="opening-bill-200"
									min="0"
									bind:value={openingBillCounts['200']}
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
								/>
							</div>
							<div>
								<label for="opening-bill-100" class="block text-xs text-gray-500">$ 100</label>
								<input
									type="number"
									id="opening-bill-100"
									min="0"
									bind:value={openingBillCounts['100']}
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
								/>
							</div>
							<div>
								<label for="opening-bill-50" class="block text-xs text-gray-500">$ 50</label>
								<input
									type="number"
									id="opening-bill-50"
									min="0"
									bind:value={openingBillCounts['50']}
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
								/>
							</div>
							<div>
								<label for="opening-bill-20" class="block text-xs text-gray-500">$ 20</label>
								<input
									type="number"
									id="opening-bill-20"
									min="0"
									bind:value={openingBillCounts['20']}
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
								/>
							</div>
							<div>
								<label for="opening-bill-10" class="block text-xs text-gray-500">$ 10</label>
								<input
									type="number"
									id="opening-bill-10"
									min="0"
									bind:value={openingBillCounts['10']}
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
								/>
							</div>
						</div>
					</div>
					<div>
						<h4 class="text-lg font-semibold text-gray-900">Dinero Digital</h4>
						<div class="mt-4 space-y-4">
							<div>
								<label for="opening-qr-amount" class="block text-sm font-medium text-gray-700"
									>QR</label
								>
								<div class="relative">
									<span class="absolute top-2 left-3 text-gray-500">$</span>
									<input
										type="number"
										id="opening-qr-amount"
										min="0"
										step="0.01"
										bind:value={openingQrAmount}
										class="w-full rounded-md border-gray-300 py-2 pr-3 pl-8 text-gray-900"
										placeholder="0.00"
									/>
								</div>
							</div>
							<div>
								<label for="opening-transfer-amount" class="block text-sm font-medium text-gray-700"
									>Transferencias</label
								>
								<div class="relative">
									<span class="absolute top-2 left-3 text-gray-500">$</span>
									<input
										type="number"
										id="opening-transfer-amount"
										min="0"
										step="0.01"
										bind:value={openingTransferAmount}
										class="w-full rounded-md border-gray-300 py-2 pr-3 pl-8 text-gray-900"
										placeholder="0.00"
									/>
								</div>
							</div>
						</div>

						<!-- Totales -->
						<div class="mt-6 rounded bg-gray-50 p-4">
							<h5 class="mb-3 text-sm font-semibold text-gray-900">Totales</h5>
							<div class="space-y-2">
								<div class="flex justify-between text-sm">
									<span class="text-gray-600">Total Dinero Físico:</span>
									<span class="font-medium text-gray-900"
										>{formatCurrency(totalOpeningPhysicalMoney)}</span
									>
								</div>
								<div class="flex justify-between text-sm">
									<span class="text-gray-600">Total Dinero Digital:</span>
									<span class="font-medium text-gray-900"
										>{formatCurrency(totalOpeningDigitalMoney)}</span
									>
								</div>
								<div class="flex justify-between border-t pt-2">
									<span class="font-semibold text-gray-900">Total General:</span>
									<span class="text-lg font-bold text-gray-900"
										>{formatCurrency(openingGrandTotal)}</span
									>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Botones de acción -->
				<div class="mt-6 flex justify-end space-x-3">
					<button
						type="button"
						onclick={() => (showOpenModal = false)}
						class="rounded-md border border-gray-300 px-4 py-2 text-gray-900 hover:bg-gray-50"
					>
						Cancelar
					</button>
					<button
						type="button"
						onclick={openCashRegister}
						disabled={saving}
						class="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-gray-400"
					>
						{saving ? 'Abriendo...' : 'Abrir Caja'}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Movimientos de Caja -->
{#if showMovementModal && cashRegister}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="bg-opacity-50 flex min-h-full items-center justify-center bg-black p-4">
			<div class="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-lg font-semibold text-gray-900">Movimientos de Caja</h3>
					<button
						onclick={() => (showMovementModal = false)}
						class="text-gray-400 hover:text-gray-600">✕</button
					>
				</div>

				<!-- Lista de movimientos -->
				<div class="mb-4 max-h-64 overflow-y-auto rounded bg-gray-50 p-4">
					{#if movements.length === 0}
						<div class="py-4 text-center text-gray-500">No hay movimientos registrados</div>
					{:else}
						{#each movements as movement (movement.id)}
							<div class="mb-2 flex items-center justify-between rounded bg-white p-3">
								<div>
									<div class="font-medium text-gray-900">{movement.description}</div>
									<div class="text-xs text-gray-500">
										{movement.type} - {movement.category} - {movement.user?.name}
									</div>
								</div>
								<div
									class="font-bold {movement.type === 'INGRESO'
										? 'text-green-600'
										: 'text-red-600'}"
								>
									{movement.type === 'INGRESO' ? '+' : '-'}{formatCurrency(Number(movement.amount))}
								</div>
							</div>
						{/each}
					{/if}
				</div>

				<!-- Formulario nuevo movimiento -->
				<form onsubmit={createMovement}>
					<div class="space-y-4">
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label for="movementType" class="block text-sm font-medium text-gray-700"
									>Tipo</label
								>
								<select
									id="movementType"
									bind:value={movementType}
									class="w-full rounded-md border-gray-300 px-3 py-2 text-gray-900"
								>
									<option value="INGRESO">Ingreso</option>
									<option value="EGRESO">Egreso</option>
								</select>
							</div>
							<div>
								<label for="movementCategory" class="block text-sm font-medium text-gray-700"
									>Categoría</label
								>
								<select
									id="movementCategory"
									bind:value={movementCategory}
									class="w-full rounded-md border-gray-300 px-3 py-2 text-gray-900"
								>
									<option value="GASTO">Gasto</option>
									<option value="RETIRO">Retiro</option>
									<option value="PAGO">Pago</option>
									<option value="COBRO">Cobro</option>
									<option value="AJUSTE">Ajuste</option>
									<option value="DELIVERY">Delivery</option>
									<option value="TRANSFERENCIA">Transferencia</option>
								</select>
							</div>
						</div>

						<div>
							<label for="movementAmount" class="block text-sm font-medium text-gray-700"
								>Monto</label
							>
							<div class="relative">
								<span class="absolute top-2 left-3 text-gray-500">$</span>
								<input
									id="movementAmount"
									type="number"
									bind:value={movementAmount}
									min="0"
									step="0.01"
									required
									class="w-full rounded-md border-gray-300 py-2 pr-3 pl-8 text-gray-900"
									placeholder="0.00"
								/>
							</div>
						</div>

						<div>
							<label for="movementDescription" class="block text-sm font-medium text-gray-700"
								>Descripción</label
							>
							<input
								id="movementDescription"
								type="text"
								bind:value={movementDescription}
								required
								class="w-full rounded-md border-gray-300 px-3 py-2 text-gray-900"
								placeholder="Descripción del movimiento..."
							/>
						</div>
					</div>

					<div class="mt-6 flex justify-end">
						<button
							type="button"
							onclick={() => (showMovementModal = false)}
							class="rounded-md border border-gray-300 px-4 py-2 text-gray-900 hover:bg-gray-50"
						>
							Cerrar
						</button>
						<button
							type="submit"
							disabled={saving}
							class="ml-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400"
						>
							{saving ? 'Registrando...' : 'Registrar Movimiento'}
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- Modal Cierre de Caja (en blanco) -->
{#if showCloseModal}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div class="bg-opacity-50 flex min-h-full items-center justify-center bg-black p-4">
			<div class="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
				<div class="mb-4 flex items-center justify-between">
					<h3 class="text-lg font-semibold text-gray-900">Cierre de Caja</h3>
					<button onclick={() => (showCloseModal = false)} class="text-gray-400 hover:text-gray-600"
						>✕</button
					>
				</div>

				<!-- Contenido del modal -->
				<div class="space-y-6">
					<div>
						<h4 class="text-lg font-semibold text-gray-900">Dinero Físico</h4>
						<div class="mt-4 grid grid-cols-2 gap-3">
							<div>
								<label for="bill-20000" class="block text-xs text-gray-500">$ 20.000</label>
								<input
									type="number"
									id="bill-20000"
									min="0"
									bind:value={billCounts['20000']}
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
								/>
							</div>
							<div>
								<label for="bill-10000" class="block text-xs text-gray-500">$ 10.000</label>
								<input
									type="number"
									id="bill-10000"
									min="0"
									bind:value={billCounts['10000']}
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
								/>
							</div>
							<div>
								<label for="bill-2000" class="block text-xs text-gray-500">$ 2.000</label>
								<input
									type="number"
									id="bill-2000"
									min="0"
									bind:value={billCounts['2000']}
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
								/>
							</div>
							<div>
								<label for="bill-1000" class="block text-xs text-gray-500">$ 1.000</label>
								<input
									type="number"
									id="bill-1000"
									min="0"
									bind:value={billCounts['1000']}
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
								/>
							</div>
							<div>
								<label for="bill-500" class="block text-xs text-gray-500">$ 500</label>
								<input
									type="number"
									id="bill-500"
									min="0"
									bind:value={billCounts['500']}
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
								/>
							</div>
							<div>
								<label for="bill-200" class="block text-xs text-gray-500">$ 200</label>
								<input
									type="number"
									id="bill-200"
									min="0"
									bind:value={billCounts['200']}
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
								/>
							</div>
							<div>
								<label for="bill-100" class="block text-xs text-gray-500">$ 100</label>
								<input
									type="number"
									id="bill-100"
									min="0"
									bind:value={billCounts['100']}
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
								/>
							</div>
							<div>
								<label for="bill-50" class="block text-xs text-gray-500">$ 50</label>
								<input
									type="number"
									id="bill-50"
									min="0"
									bind:value={billCounts['50']}
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
								/>
							</div>
							<div>
								<label for="bill-20" class="block text-xs text-gray-500">$ 20</label>
								<input
									type="number"
									id="bill-20"
									min="0"
									bind:value={billCounts['20']}
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
								/>
							</div>
							<div>
								<label for="bill-10" class="block text-xs text-gray-500">$ 10</label>
								<input
									type="number"
									id="bill-10"
									min="0"
									bind:value={billCounts['10']}
									class="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
								/>
							</div>
						</div>
					</div>
					<div>
						<h4 class="text-lg font-semibold text-gray-900">Dinero Digital</h4>
						<div class="mt-4 space-y-4">
							<div>
								<label for="qr-amount" class="block text-sm font-medium text-gray-700">QR</label>
								<div class="relative">
									<span class="absolute top-2 left-3 text-gray-500">$</span>
									<input
										type="number"
										id="qr-amount"
										min="0"
										step="0.01"
										bind:value={qrAmount}
										class="w-full rounded-md border-gray-300 py-2 pr-3 pl-8 text-gray-900"
										placeholder="0.00"
									/>
								</div>
							</div>
							<div>
								<label for="transfer-amount" class="block text-sm font-medium text-gray-700"
									>Transferencias</label
								>
								<div class="relative">
									<span class="absolute top-2 left-3 text-gray-500">$</span>
									<input
										type="number"
										id="transfer-amount"
										min="0"
										step="0.01"
										bind:value={transferAmount}
										class="w-full rounded-md border-gray-300 py-2 pr-3 pl-8 text-gray-900"
										placeholder="0.00"
									/>
								</div>
							</div>
						</div>

						<!-- Totales -->
						<div class="mt-6 rounded bg-gray-50 p-4">
							<h5 class="mb-3 text-sm font-semibold text-gray-900">Totales</h5>
							<div class="space-y-2">
								<div class="flex justify-between text-sm">
									<span class="text-gray-600">Total Dinero Físico:</span>
									<span class="font-medium text-gray-900">{formatCurrency(totalPhysicalMoney)}</span
									>
								</div>
								<div class="flex justify-between text-sm">
									<span class="text-gray-600">Total Dinero Digital:</span>
									<span class="font-medium text-gray-900">{formatCurrency(totalDigitalMoney)}</span>
								</div>
								<div class="flex justify-between border-t pt-2">
									<span class="font-semibold text-gray-900">Total General:</span>
									<span class="text-lg font-bold text-gray-900">{formatCurrency(grandTotal)}</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Botones de acción -->
					<div class="mt-6 flex justify-end space-x-3">
						<button
							type="button"
							onclick={() => (showCloseModal = false)}
							class="rounded-md border border-gray-300 px-4 py-2 text-gray-900 hover:bg-gray-50"
						>
							Cancelar
						</button>
						{#if cashRegister}
							<button
								type="button"
								onclick={closeCashRegister}
								disabled={saving}
								class="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:bg-gray-400"
							>
								{saving ? 'Cerrando...' : 'Cerrar Caja'}
							</button>
						{:else}
							<button
								type="button"
								onclick={openCashRegister}
								disabled={saving}
								class="rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:bg-gray-400"
							>
								{saving ? 'Abriendo...' : 'Abrir Caja'}
							</button>
						{/if}
					</div>
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
