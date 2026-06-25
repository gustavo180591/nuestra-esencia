<script lang="ts">
	import { page } from '$app/stores';
	import { ChevronDown } from '@lucide/svelte';
	import type { NavSection } from '$lib/navigation';

	interface Props {
		section: NavSection;
		currentPath: string;
		isOpen: boolean;
		onToggle: () => void;
		onClose: () => void;
	}

	let { section, currentPath, isOpen, onToggle, onClose }: Props = $props();

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.nav-dropdown-container')) {
			onClose();
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

<div class="nav-dropdown-container relative">
	<button
		onclick={onToggle}
		class="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800 hover:text-amber-200 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
		aria-expanded={isOpen}
		aria-haspopup="true"
	>
		<span>{section.title}</span>
		<ChevronDown
			class="h-4 w-4 opacity-70 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
			aria-hidden="true"
		/>
	</button>

	{#if isOpen}
		<div
			class="ring-opacity-5 absolute left-0 z-50 mt-2 w-48 rounded-lg bg-white shadow-xl ring-1 ring-black"
			role="menu"
			aria-orientation="vertical"
		>
			<div class="py-1">
				{#each section.items as item (item.href)}
					{@const Icon = item.icon}
					<a
						href={item.href}
						onclick={close}
						class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none {currentPath ===
						item.href
							? 'bg-amber-50 text-amber-700'
							: ''}"
						role="menuitem"
					>
						<Icon class="h-4 w-4 text-gray-400" aria-hidden="true" />
						{item.label}
					</a>
				{/each}
			</div>
		</div>
	{/if}
</div>
