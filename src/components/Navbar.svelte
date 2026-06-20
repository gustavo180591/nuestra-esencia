<script lang="ts">
	import { page } from '$app/stores';
	import { Menu } from '@lucide/svelte';
	import { getNavigationForRole } from '$lib/navigation';
	import NavItem from './navbar/NavItem.svelte';
	import UserMenu from './navbar/UserMenu.svelte';
	import MobileMenu from './navbar/MobileMenu.svelte';

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
					email: user.email,
					role: user.role as 'ADMIN' | 'CAJERO'
				}
			: null
	);

	let navigationSections = $derived(currentUser ? getNavigationForRole(currentUser.role) : []);

	let currentPath = $derived($page.url.pathname);

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	async function handleLogout() {
		try {
			await fetch('/api/auth/logout', {
				method: 'POST'
			});
		} catch {
			// Ignorar errores, igual redirigir
		} finally {
			window.location.href = '/login';
		}
	}
</script>

<nav class="sticky top-0 z-50 border-b border-gray-800 bg-gray-900 shadow-lg">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-14 items-center justify-between">
			<!-- Logo -->
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

			<!-- Desktop Navigation -->
			{#if currentUser}
				<div class="hidden lg:flex lg:items-center lg:gap-1">
					{#each navigationSections as section}
						{#each section.items as item}
							<NavItem {...item} isActive={currentPath === item.href} onclick={closeMobileMenu} />
						{/each}
					{/each}
				</div>
			{/if}

			<!-- Right side: User menu and mobile toggle -->
			<div class="flex items-center gap-3">
				{#if currentUser}
					<UserMenu
						name={currentUser.name}
						role={currentUser.role}
						email={currentUser.email}
						onLogout={handleLogout}
					/>
				{:else}
					<a
						href="/login"
						class="hidden rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 sm:block"
					>
						Iniciar sesión
					</a>
				{/if}

				<!-- Mobile menu button -->
				{#if currentUser}
					<button
						onclick={toggleMobileMenu}
						class="rounded-lg p-2 text-gray-300 transition-colors hover:bg-gray-800 hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none lg:hidden"
						aria-label="Abrir menú"
						aria-expanded={mobileMenuOpen}
					>
						<Menu class="h-5 w-5" aria-hidden="true" />
					</button>
				{/if}
			</div>
		</div>
	</div>
</nav>

<!-- Mobile Menu -->
{#if currentUser}
	<MobileMenu
		sections={navigationSections}
		{currentPath}
		isOpen={mobileMenuOpen}
		onClose={closeMobileMenu}
		onLogout={handleLogout}
		userName={currentUser.name}
		userRole={currentUser.role}
	/>
{/if}
