<script lang="ts">
	import { page } from '$app/stores';
	import { Menu } from '@lucide/svelte';
	import UserMenu from './UserMenu.svelte';
	import NavigationDropdown from './NavigationDropdown.svelte';
	import { getNavigationForRole } from '$lib/navigation';

	interface User {
		id: string;
		name: string;
		email: string;
		role: string;
	}

	interface Props {
		user: User | null;
		onToggleSidebar: () => void;
		onLogout: () => void;
	}

	let { user, onToggleSidebar, onLogout }: Props = $props();

	let currentUser = $derived(
		user
			? {
					name: user.name,
					email: user.email,
					role: user.role as 'ADMIN' | 'CAJERO'
				}
			: null
	);

	let currentPath = $derived($page.url.pathname);

	let navigationSections = $derived(
		currentUser ? getNavigationForRole(currentUser.role) : []
	);

	let openDropdownSection = $state<string | null>(null);

	function getPageTitle(path: string): string {
		const titles: Record<string, string> = {
			'/pos': 'Caja',
			'/admin/sales': 'Ventas',
			'/admin': 'Productos',
			'/admin/stock': 'Stock',
			'/admin/combos': 'Combos',
			'/admin/clients': 'Clientes',
			'/admin/categories': 'Categorías',
			'/admin/purchases': 'Compras',
			'/admin/expenses': 'Gastos',
			'/admin/payment-methods': 'Métodos de Pago',
			'/admin/cajas': 'Cajas',
			'/admin/users': 'Usuarios',
			'/admin/suppliers': 'Proveedores',
			'/admin/movements': 'Movimientos',
			'/admin/reports': 'Reportes'
		};

		// Check for dynamic routes
		if (path.startsWith('/admin/clients/')) return 'Cuenta Corriente';
		if (path.startsWith('/admin/')) return titles[path] || 'Administración';

		return titles[path] || 'Nuestra Esencia';
	}

	let pageTitle = $derived(getPageTitle(currentPath));
</script>

<nav class="sticky top-0 z-50 border-b border-gray-800 bg-gray-900 shadow-lg">
	<div class="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
		<div class="flex h-14 items-center justify-between">
			<!-- Left: Logo, Menu button, Page title -->
			<div class="flex items-center gap-4">
				{#if currentUser}
					<button
						onclick={onToggleSidebar}
						class="rounded-lg p-2 text-gray-300 transition-colors hover:bg-gray-800 hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none lg:hidden"
						aria-label="Abrir menú"
					>
						<Menu class="h-5 w-5" aria-hidden="true" />
					</button>
				{/if}

				<a href="/" class="flex items-center gap-2.5">
					<img
						src="/logo.svg"
						alt="Nuestra Esencia Logo"
						class="h-8 w-8 rounded-full object-contain shadow-lg"
					/>
					<div class="hidden sm:block">
						<h1 class="text-base font-bold text-white">Nuestra Esencia</h1>
						<p class="text-[10px] text-amber-200">Sabores al Paso</p>
					</div>
				</a>

				<!-- Navigation Dropdowns -->
				{#if currentUser}
					<div class="hidden lg:flex items-center gap-1">
						{#each navigationSections as section (section.title)}
							<NavigationDropdown
								{section}
								{currentPath}
								isOpen={openDropdownSection === section.title}
								onToggle={() => {
									if (openDropdownSection === section.title) {
										openDropdownSection = null;
									} else {
										openDropdownSection = section.title;
									}
								}}
								onClose={() => {
									openDropdownSection = null;
								}}
							/>
						{/each}
					</div>
				{/if}

				{#if currentUser && pageTitle !== 'Nuestra Esencia'}
					<div class="hidden md:block">
						<span class="text-gray-400">/</span>
						<span class="ml-2 text-sm font-medium text-gray-300">{pageTitle}</span>
					</div>
				{/if}
			</div>

			<!-- Right: User menu -->
			<div class="flex items-center">
				{#if currentUser}
					<UserMenu
						name={currentUser.name}
						role={currentUser.role}
						email={currentUser.email}
						{onLogout}
					/>
				{:else}
					<a
						href="/login"
						class="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700"
					>
						Iniciar sesión
					</a>
				{/if}
			</div>
		</div>
	</div>
</nav>
