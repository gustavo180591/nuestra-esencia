<script lang="ts">
	import { page } from '$app/stores';
	import { getNavigationForRole } from '$lib/navigation';
	import Navbar from './Navbar.svelte';
	import Sidebar from './Sidebar.svelte';

	interface User {
		id: string;
		name: string;
		email: string;
		role: string;
	}

	interface Props {
		user: User | null;
		children: any;
	}

	let { user, children }: Props = $props();

	let sidebarOpen = $state(false);

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

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}

	function closeSidebar() {
		sidebarOpen = false;
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

	// Close sidebar on route change
	$effect(() => {
		closeSidebar();
	});
</script>

<div class="min-h-screen bg-gray-50">
	<Navbar {user} onToggleSidebar={toggleSidebar} onLogout={handleLogout} />

	{#if currentUser}
		<Sidebar
			sections={navigationSections}
			{currentPath}
			isOpen={sidebarOpen}
			onClose={closeSidebar}
		/>
	{/if}

	<!-- Main content area -->
	<main class="pt-14 {currentUser ? 'lg:pl-64' : ''}">
		{@render children()}
	</main>
</div>
