<script lang="ts">
	import { page } from '$app/stores';
	import { ChevronDown, ChevronUp, X } from '@lucide/svelte';
	import type { NavSection } from '$lib/navigation';
	import SidebarNavItem from './SidebarNavItem.svelte';

	interface Props {
		sections: NavSection[];
		currentPath: string;
		isOpen: boolean;
		onClose: () => void;
	}

	let { sections, currentPath, isOpen, onClose }: Props = $props();

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

<!-- Desktop Sidebar -->
<aside
	class="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-800 lg:bg-gray-900 lg:fixed lg:left-0 lg:top-14 lg:bottom-0 lg:overflow-y-auto"
>
	<div class="flex flex-col gap-6 p-4">
		{#each sections as section (section.title)}
			<div>
				<button
					onclick={() => toggleSection(section.title)}
					class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
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
					<div id={`section-${section.title}`} class="mt-2 space-y-1">
						{#each section.items as item (item.href)}
							<SidebarNavItem
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
</aside>

<!-- Mobile Drawer -->
{#if isOpen}
	<!-- Overlay -->
	<button
		type="button"
		class="bg-opacity-50 fixed inset-0 z-40 bg-black transition-opacity"
		onclick={onClose}
		onkeydown={(e) => e.key === 'Escape' && onClose()}
		aria-label="Cerrar menú"
	></button>

	<!-- Drawer Panel -->
	<div
		class="fixed inset-y-0 left-0 z-50 w-72 transform bg-gray-900 shadow-2xl transition-transform duration-300 ease-in-out {isOpen
			? 'translate-x-0'
			: '-translate-x-full'}"
		role="dialog"
		aria-modal="true"
		aria-labelledby="mobile-sidebar-title"
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-gray-800 px-4 py-4">
			<h2 id="mobile-sidebar-title" class="text-lg font-semibold text-white">Menú</h2>
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
						class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 transition-colors hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
						aria-expanded={isSectionExpanded(section.title)}
						aria-controls={`mobile-section-${section.title}`}
					>
						<span>{section.title}</span>
						{#if isSectionExpanded(section.title)}
							<ChevronUp class="h-4 w-4" aria-hidden="true" />
						{:else}
							<ChevronDown class="h-4 w-4" aria-hidden="true" />
						{/if}
					</button>

					{#if isSectionExpanded(section.title)}
						<div id={`mobile-section-${section.title}`} class="mt-2 space-y-1">
							{#each section.items as item (item.href)}
								<SidebarNavItem
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
	</div>
{/if}
