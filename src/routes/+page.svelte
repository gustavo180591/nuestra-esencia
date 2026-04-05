<script lang="ts">
	import { onMount } from 'svelte';
	import type { Product } from '$lib/types';
	import ToggleTheme from '../components/ToggleTheme.svelte';

	let stats = $state({
		totalProducts: 0,
		activeProducts: 0,
		totalStock: 0,
		lowStockProducts: 0
	});

	let loading = $state(true);

	async function loadStats() {
		try {
			const response = await fetch('/api/products?includeInactive=true');
			const data = await response.json();

			if (data.success) {
				const products = data.data;
				stats.totalProducts = products.length;
				stats.activeProducts = products.filter((p: Product) => p.status === 'ACTIVO').length;
				stats.totalStock = products.reduce((sum: number, p: Product) => sum + Number(p.stock), 0);
				stats.lowStockProducts = products.filter(
					(p: Product) => Number(p.stock) <= Number(p.stockMin)
				).length;
			}
		} catch {
			console.error('Error loading stats');
		} finally {
			loading = false;
		}
	}

	onMount(loadStats);
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
	<div class="mx-auto max-w-7xl">
		<div class="mb-8 flex justify-between items-start">
			<div>
				<h1 class="mb-2 text-4xl font-bold text-gray-900 dark:text-gray-100">Nuestra Esencia</h1>
				<p class="text-lg text-gray-600 dark:text-gray-400">Sistema de Gestión de Tienda</p>
			</div>
			<ToggleTheme />
		</div>

		{#if loading}
			<div class="py-8 text-center">
				<div class="text-gray-500">Cargando...</div>
			</div>
		{:else}
			<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
				<div class="rounded-lg bg-white p-6 shadow">
					<div class="text-2xl font-bold text-gray-900">{stats.totalProducts}</div>
					<div class="text-gray-600">Total Productos</div>
				</div>
				<div class="rounded-lg bg-white p-6 shadow">
					<div class="text-2xl font-bold text-green-600">{stats.activeProducts}</div>
					<div class="text-gray-600">Productos Activos</div>
				</div>
				<div class="rounded-lg bg-white p-6 shadow">
					<div class="text-2xl font-bold text-blue-600">{stats.totalStock}</div>
					<div class="text-gray-600">Total Stock</div>
				</div>
				<div class="rounded-lg bg-white p-6 shadow">
					<div class="text-2xl font-bold text-red-600">{stats.lowStockProducts}</div>
					<div class="text-gray-600">Stock Bajo</div>
				</div>
			</div>
		{/if}

		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			<a
				href="/pos"
				class="rounded-lg bg-amber-600 p-8 text-white shadow-lg transition-colors hover:bg-amber-700"
			>
				<div class="mb-2 text-2xl font-bold">🏪 Punto de Venta</div>
				<div class="text-amber-100">Abrir caja para ventas</div>
			</a>

			<a
				href="/admin"
				class="rounded-lg bg-blue-600 p-8 text-white shadow-lg transition-colors hover:bg-blue-700"
			>
				<div class="mb-2 text-2xl font-bold">📦 Gestión de Productos</div>
				<div class="text-blue-100">Administrar productos y categorías</div>
			</a>

			<div class="rounded-lg bg-gray-300 p-8 text-gray-600 shadow-lg">
				<div class="mb-2 text-2xl font-bold">📊 Reportes</div>
				<div class="text-gray-500">Próximamente...</div>
			</div>
		</div>

		<div class="mt-12 text-center text-gray-500">
			<p>© 2026 Nuestra Esencia - Sistema de Gestión</p>
		</div>
	</div>
</div>
