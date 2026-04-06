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
<nav class="sticky top-0 z-50 border-b border-gray-800 bg-gray-900 shadow-lg dark:bg-gray-950">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-16 items-center justify-between">
			<!-- Logo y nombre -->
			<div class="flex items-center space-x-3">
				<img
					src="/logo.svg"
					alt="Nuestra Esencia Logo"
					class="h-10 w-10 rounded-full object-contain shadow-lg"
				/>
				<div class="hidden sm:block">
					<h1 class="text-xl font-bold text-white">Nuestra Esencia</h1>
					<p class="text-xs text-amber-200">Sabores al Paso</p>
				</div>
			</div>

			<!-- Menú desktop -->
			<div class="hidden items-center space-x-1 md:flex">
				{#each navItems as item}
					<a
						href={item.href}
						class="rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 {currentPath ===
						item.href
							? 'bg-amber-600 text-white shadow-lg'
							: 'text-gray-300 hover:scale-105 hover:bg-gray-800 hover:text-amber-200'}"
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
					class="rounded-lg p-2 text-gray-300 transition-colors hover:bg-gray-800 hover:text-amber-200"
					title="Cambiar tema"
				>
					{#if $darkMode}
						<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
								clip-rule="evenodd"
							/>
						</svg>
					{:else}
						<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
							<path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
						</svg>
					{/if}
				</button>

				<!-- Menu usuario desktop -->
				<div class="hidden items-center space-x-3 md:flex">
					<div class="flex items-center space-x-2">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600">
							<span class="text-sm font-bold text-white">
								{currentUser.name.charAt(0).toUpperCase()}
							</span>
						</div>
						<span class="text-sm text-gray-300">{currentUser.name}</span>
					</div>
					<button
						onclick={handleLogout}
						class="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-red-700"
					>
						Cerrar sesión
					</button>
				</div>

				<!-- Botón hamburguesa mobile -->
				<button
					onclick={toggleMobileMenu}
					class="rounded-lg p-2 text-gray-300 transition-colors hover:bg-gray-800 hover:text-amber-200 md:hidden"
				>
					<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						{#if mobileMenuOpen}
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						{:else}
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 6h16M4 12h16M4 18h16"
							/>
						{/if}
					</svg>
				</button>
			</div>
		</div>

		<!-- Menú mobile -->
		{#if mobileMenuOpen}
			<div class="border-t border-gray-800 bg-gray-900 md:hidden">
				<div class="space-y-1 px-4 py-3">
					{#each navItems as item}
						<a
							href={item.href}
							class="flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 {currentPath ===
							item.href
								? 'bg-amber-600 text-white'
								: 'text-gray-300 hover:bg-gray-800 hover:text-amber-200'}"
							onclick={closeMobileMenu}
						>
							<span class="mr-3 text-lg">{item.icon}</span>
							{item.label}
						</a>
					{/each}

					<!-- Usuario mobile -->
					<div class="mt-3 border-t border-gray-800 pt-3">
						<div class="flex items-center justify-between px-4 py-3">
							<div class="flex items-center space-x-3">
								<div class="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600">
									<span class="text-sm font-bold text-white">
										{currentUser.name.charAt(0).toUpperCase()}
									</span>
								</div>
								<div>
									<div class="text-sm font-medium text-white">{currentUser.name}</div>
									<div class="text-xs text-gray-400">Administrador</div>
								</div>
							</div>
							<button
								onclick={handleLogout}
								class="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-red-700"
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
		class="bg-opacity-50 fixed inset-0 z-40 bg-black md:hidden"
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
