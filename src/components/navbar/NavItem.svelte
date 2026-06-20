<script lang="ts">
	import type { Component } from 'svelte';
	import { page } from '$app/stores';
	import { ChevronDown } from '@lucide/svelte';

	interface Props {
		href: string;
		label: string;
		icon: Component;
		badge?: number;
		isActive?: boolean;
		isDropdown?: boolean;
		onclick?: () => void;
	}

	let {
		href,
		label,
		icon: Icon,
		badge,
		isActive = false,
		isDropdown = false,
		onclick
	}: Props = $props();
</script>

<a
	{href}
	{onclick}
	class="group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 focus-visible:outline-none {isActive
		? 'bg-amber-600 text-white shadow-lg'
		: 'text-gray-300 hover:bg-gray-800 hover:text-amber-200'}"
	aria-current={isActive ? 'page' : undefined}
>
	<Icon class="h-4 w-4" aria-hidden="true" />
	<span>{label}</span>
	{#if badge}
		<span
			class="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white"
		>
			{badge}
		</span>
	{/if}
	{#if isDropdown}
		<ChevronDown class="h-3 w-3 opacity-70 group-hover:opacity-100" aria-hidden="true" />
	{/if}
	{#if isActive}
		<span class="absolute right-0 bottom-0 left-0 h-0.5 bg-amber-400" aria-hidden="true"></span>
	{/if}
</a>
