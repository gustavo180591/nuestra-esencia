<script lang="ts">
	import { User, LogOut, Settings, ChevronDown } from '@lucide/svelte';

	interface Props {
		name: string;
		role: 'ADMIN' | 'CAJERO';
		email?: string;
		onLogout: () => void;
	}

	let { name, role, email, onLogout }: Props = $props();

	let isOpen = $state(false);

	function toggle() {
		isOpen = !isOpen;
	}

	function close() {
		isOpen = false;
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.user-menu-container')) {
			close();
		}
	}

	$effect(() => {
		if (isOpen) {
			document.addEventListener('click', handleClickOutside);
			return () => {
				document.removeEventListener('click', handleClickOutside);
			};
		}
	});
</script>

<div class="user-menu-container relative">
	<button
		onclick={toggle}
		class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition-all duration-200 hover:bg-gray-800 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
		aria-expanded={isOpen}
		aria-haspopup="true"
	>
		<div class="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600">
			<User class="h-4 w-4 text-white" aria-hidden="true" />
		</div>
		<span class="hidden sm:block">{name}</span>
		<ChevronDown class="h-4 w-4 opacity-70 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}" aria-hidden="true" />
	</button>

	{#if isOpen}
		<div
			class="ring-opacity-5 absolute right-0 z-50 mt-2 w-56 rounded-lg bg-white shadow-xl ring-1 ring-black"
			role="menu"
			aria-orientation="vertical"
			aria-labelledby="user-menu-button"
		>
			<div class="border-b border-gray-100 px-4 py-3">
				<p class="text-sm font-medium text-gray-900">{name}</p>
				<p class="text-xs text-gray-500">{email || 'Sin email'}</p>
				<span
					class="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
				>
					{role === 'ADMIN' ? 'Administrador' : 'Cajero'}
				</span>
			</div>

			<div class="py-1">
				{#if role === 'ADMIN'}
					<a
						href="/admin/users"
						onclick={close}
						class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
						role="menuitem"
					>
						<User class="h-4 w-4 text-gray-400" aria-hidden="true" />
						Gestión de Usuarios
					</a>
					<a
						href="/admin/suppliers"
						onclick={close}
						class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
						role="menuitem"
					>
						<Settings class="h-4 w-4 text-gray-400" aria-hidden="true" />
						Proveedores
					</a>
				{/if}
				<a
					href="/admin/payment-methods"
					onclick={close}
					class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
					role="menuitem"
				>
					<Settings class="h-4 w-4 text-gray-400" aria-hidden="true" />
					Medios de Pago
				</a>
			</div>

			<div class="border-t border-gray-100 py-1">
				<button
					onclick={() => {
						onLogout();
						close();
					}}
					class="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none"
					role="menuitem"
				>
					<LogOut class="h-4 w-4" aria-hidden="true" />
					Cerrar sesión
				</button>
			</div>
		</div>
	{/if}
</div>
