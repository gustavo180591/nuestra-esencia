<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { darkMode } from '$lib/stores';

	let mobileMenuOpen = $state(false);
	let currentUser = $state({
		name: 'Admin User',
		avatar: null
	});

	const navItems = [
		{ href: '/pos', label: 'Caja', icon: '🏪' },
		{ href: '/admin', label: 'Productos', icon: '📦' },
		{ href: '/admin/stock', label: 'Stock', icon: '📊' },
		{ href: '/admin/purchases', label: 'Compras', icon: '🛒' },
		{ href: '/admin/reports', label: 'Reportes', icon: '📈' }
	];

	onMount(() => {
		// Simular usuario logueado (en producción vendría de auth)
		currentUser = {
			name: 'Administrador',
			avatar: null
		};
	});

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	function handleLogout() {
		// Lógica de logout
		window.location.href = '/login';
	}

	const currentPath = $derived($page.url.pathname);
</script>

<!-- Navbar principal -->
<nav class="sticky top-0 z-50 bg-gray-900 dark:bg-gray-950 border-b border-gray-800 shadow-lg">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
		<div class="flex justify-between items-center h-16">
			<!-- Logo y nombre -->
			<div class="flex items-center space-x-3">
				<div class="w-10 h-10 bg-linear-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
					<span class="text-white font-bold text-lg">NE</span>
				</div>
				<div class="hidden sm:block">
					<h1 class="text-xl font-bold text-white">Nuestra Esencia</h1>
					<p class="text-xs text-amber-200">Sabores al Paso</p>
				</div>
			</div>

			<!-- Menú desktop -->
			<div class="hidden md:flex items-center space-x-1">
				{#each navItems as item}
					<a
						href={item.href}
						class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 {currentPath === item.href
							? 'bg-amber-600 text-white shadow-lg'
							: 'text-gray-300 hover:bg-gray-800 hover:text-amber-200 hover:scale-105'
						}"
						onclick={closeMobileMenu}
					>
						<span class="mr-2">{item.icon}</span>
						{item.label}
					</a>
				{/each}
			</div>

			<!-- Usuario y acciones -->
			<div class="flex items-center space-x-4">
				<!-- Toggle tema -->
				<button
					onclick={() => darkMode.set(!$darkMode)}
					class="p-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-amber-200 transition-colors"
					title="Cambiar tema"
				>
					{#if $darkMode}
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
						</svg>
					{:else}
						<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
							<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
						</svg>
					{/if}
				</button>

				<!-- Menu usuario desktop -->
				<div class="hidden md:flex items-center space-x-3">
					<div class="flex items-center space-x-2">
						<div class="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center">
							<span class="text-white text-sm font-bold">
								{currentUser.name.charAt(0).toUpperCase()}
							</span>
						</div>
						<span class="text-sm text-gray-300">{currentUser.name}</span>
					</div>
					<button
						onclick={handleLogout}
						class="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
					>
						Cerrar sesión
					</button>
				</div>

				<!-- Botón hamburguesa mobile -->
				<button
					onclick={toggleMobileMenu}
					class="md:hidden p-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-amber-200 transition-colors"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						{#if mobileMenuOpen}
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						{:else}
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
						{/if}
					</svg>
				</button>
			</div>
		</div>

		<!-- Menú mobile -->
		{#if mobileMenuOpen}
			<div class="md:hidden bg-gray-900 border-t border-gray-800">
				<div class="px-4 py-3 space-y-1">
					{#each navItems as item}
						<a
							href={item.href}
							class="flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 {currentPath === item.href
								? 'bg-amber-600 text-white'
								: 'text-gray-300 hover:bg-gray-800 hover:text-amber-200'
							}"
							onclick={closeMobileMenu}
						>
							<span class="mr-3 text-lg">{item.icon}</span>
							{item.label}
						</a>
					{/each}

					<!-- Usuario mobile -->
					<div class="border-t border-gray-800 mt-3 pt-3">
						<div class="flex items-center justify-between px-4 py-3">
							<div class="flex items-center space-x-3">
								<div class="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center">
									<span class="text-white text-sm font-bold">
										{currentUser.name.charAt(0).toUpperCase()}
									</span>
								</div>
								<div>
									<div class="text-sm text-white font-medium">{currentUser.name}</div>
									<div class="text-xs text-gray-400">Administrador</div>
								</div>
							</div>
							<button
								onclick={handleLogout}
								class="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
							>
								Cerrar sesión
							</button>
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</nav>

<!-- Overlay para mobile menu -->
{#if mobileMenuOpen}
	<button
		type="button"
		class="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
		onclick={closeMobileMenu}
		onkeydown={(e) => e.key === 'Escape' && closeMobileMenu()}
		aria-label="Cerrar menú"
	></button>
{/if}

<style>
	/* Animaciones suaves */
	@media (max-width: 767px) {
		nav {
			transition: all 0.3s ease;
		}
	}
</style>
