<script lang="ts">
	import { X, ChevronDown, ChevronUp } from '@lucide/svelte';
	import type { NavSection } from '$lib/navigation';
	import NavItem from './NavItem.svelte';

	interface Props {
		sections: NavSection[];
		currentPath: string;
		isOpen: boolean;
		onClose: () => void;
		onLogout: () => void;
		userName: string;
		userRole: 'ADMIN' | 'CAJERO';
	}

	let { sections, currentPath, isOpen, onClose, onLogout, userName, userRole }: Props = $props();

	let expandedSections = $state<Set<string>>(new Set());

	function toggleSection(title: string) {
		const newSet = new Set(expandedSections);
		if (newSet.has(title)) {
			newSet.delete(title);
		} else {
			newSet.add(title);
		}
		expandedSections = newSet;
	}

	function isSectionExpanded(title: string) {
		return expandedSections.has(title);
	}

	function handleItemClick() {
		onClose();
	}
</script>

{#if isOpen}
	<!-- Overlay -->
	<button
		type="button"
		class="bg-opacity-50 fixed inset-0 z-40 bg-black transition-opacity md:hidden"
		onclick={onClose}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		aria-label="Cerrar menú"
	></button>

	<!-- Mobile Menu Panel -->
	<div
		class="fixed inset-y-0 left-0 z-50 w-80 transform bg-gray-900 shadow-2xl transition-transform duration-300 ease-in-out md:hidden {isOpen
			? 'translate-x-0'
			: '-translate-x-full'}"
		role="dialog"
		aria-modal="true"
		aria-labelledby="mobile-menu-title"
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-gray-800 px-4 py-4">
			<h2 id="mobile-menu-title" class="text-lg font-semibold text-white">Menú</h2>
			<button
				onclick={onClose}
				class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
				aria-label="Cerrar menú"
			>
				<X class="h-5 w-5" aria-hidden="true" />
			</button>
		</div>

		<!-- Navigation -->
		<div class="flex-1 overflow-y-auto px-4 py-4">
			{#each sections as section (section.title)}
				<div class="mb-4">
					<button
						onclick={() => toggleSection(section.title)}
						class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
						aria-expanded={isSectionExpanded(section.title)}
						aria-controls={`section-${section.title}`}
					>
						<span>{section.title}</span>
						{#if isSectionExpanded(section.title)}
							<ChevronUp class="h-4 w-4" aria-hidden="true" />
						{:else}
							<ChevronDown class="h-4 w-4" aria-hidden="true" />
						{/if}
					</button>

					{#if isSectionExpanded(section.title)}
						<div id={`section-${section.title}`} class="mt-2 space-y-1 pl-2">
							{#each section.items as item (item.href)}
								<NavItem
									{...item}
									isActive={currentPath === item.href}
									onclick={handleItemClick}
								/>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- User Info -->
		<div class="border-t border-gray-800 px-4 py-4">
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-full bg-amber-600">
					<span class="text-sm font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
				</div>
				<div class="flex-1">
					<p class="text-sm font-medium text-white">{userName}</p>
					<p class="text-xs text-gray-400">
						{userRole === 'ADMIN' ? 'Administrador' : 'Cajero'}
					</p>
				</div>
			</div>
			<button
				onclick={() => {
					onLogout();
					onClose();
				}}
				class="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
			>
				<X class="h-4 w-4" aria-hidden="true" />
				Cerrar sesión
			</button>
		</div>
	</div>
{/if}
