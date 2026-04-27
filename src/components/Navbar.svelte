<script lang="ts">
	import { page } from '$app/stores';
	import { darkMode } from '$lib/stores';

	interface User {
		id: string;
		name: string;
		email: string;
		role: string;
	}

	let { user }: { user: User | null } = $props();

	let mobileMenuOpen = $state(false);
	let currentUser = $derived(
		user
			? {
					name: user.name,
					avatar: null,
					role: user.role as 'ADMIN' | 'CAJERO'
				}
			: null
	);

	const navItems = [
		{ href: '/pos', label: 'Caja', icon: '🏪' },
		{ href: '/admin', label: 'Productos', icon: '📦' },
		{ href: '/admin/stock', label: 'Stock', icon: '📊' },
		{ href: '/admin/purchases', label: 'Compras', icon: '🛒' },
		{ href: '/admin/reports', label: 'Reportes', icon: '📈' }
	];

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	async function handleLogout() {
		try {
			// Llamar a la API para cerrar sesión
			await fetch('/api/auth/logout', {
				method: 'POST'
			});
		} catch {
			// Ignorar errores, igual redirigir
		} finally {
			// Redirigir al login
			window.location.href = '/login';
		}
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
			{#if currentUser}
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
			{/if}

			<!-- Usuario y acciones -->
			<div class="flex items-center space-x-4">
				<!-- Menu usuario desktop -->
				<div class="hidden items-center space-x-3 md:flex">
					{#if currentUser}
						<div class="flex items-center space-x-2">
							<div class="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600">
								<span class="text-sm font-bold text-white">
									{currentUser.name.charAt(0).toUpperCase()}
								</span>
							</div>
							{#if currentUser.role === 'ADMIN'}
								<a
									href="/admin/users"
									class="text-sm text-gray-300 hover:text-amber-200 hover:underline"
									title="Gestionar usuarios"
								>
									{currentUser.name}
								</a>
							{:else}
								<span class="text-sm text-gray-300">{currentUser.name}</span>
							{/if}
						</div>
						<button
							onclick={handleLogout}
							class="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-red-700"
						>
							Cerrar sesión
						</button>
					{:else}
						<a
							href="/login"
							class="rounded-lg bg-amber-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-amber-700"
						>
							Iniciar sesión
						</a>
					{/if}
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
					{#if currentUser}
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
					{/if}

					<!-- Usuario mobile -->
					<div class="mt-3 border-t border-gray-800 pt-3">
						{#if currentUser}
							<div class="flex items-center justify-between px-4 py-3">
								<div class="flex items-center space-x-3">
									<div class="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600">
										<span class="text-sm font-bold text-white">
											{currentUser?.name?.charAt(0).toUpperCase()}
										</span>
									</div>
									<div>
										{#if currentUser?.role === 'ADMIN'}
											<a
												href="/admin/users"
												class="text-sm font-medium text-white hover:text-amber-200"
												title="Gestionar usuarios"
												onclick={closeMobileMenu}
											>
												{currentUser?.name}
											</a>
										{:else}
											<div class="text-sm font-medium text-white">{currentUser?.name}</div>
										{/if}
										<div class="text-xs text-gray-400">
											{currentUser?.role === 'ADMIN' ? 'Administrador' : 'Cajero'}
										</div>
									</div>
								</div>
								<button
									onclick={handleLogout}
									class="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-red-700"
								>
									Cerrar sesión
								</button>
							</div>
						{:else}
							<div class="flex items-center justify-between px-4 py-3">
								<span class="text-sm text-gray-400">No hay sesión iniciada</span>
								<a
									href="/login"
									class="rounded-lg bg-amber-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-amber-700"
									onclick={closeMobileMenu}
								>
									Iniciar sesión
								</a>
							</div>
						{/if}
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
