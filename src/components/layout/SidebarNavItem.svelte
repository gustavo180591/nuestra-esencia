<script lang="ts">
	import { page } from '$app/stores';

	interface Props {
		href: string;
		label: string;
		icon: any;
		badge?: number;
		isActive?: boolean;
		onclick?: () => void;
	}

	let { href, label, icon: Icon, badge, isActive = false, onclick }: Props = $props();
</script>

<a
	{href}
	{onclick}
	class="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 focus-visible:outline-none {isActive
		? 'bg-amber-600 text-white shadow-md'
		: 'text-gray-300 hover:bg-gray-800 hover:text-amber-200'}"
	aria-current={isActive ? 'page' : undefined}
>
	<Icon class="h-5 w-5 shrink-0" aria-hidden="true" />
	<span class="flex-1">{label}</span>
	{#if badge}
		<span
			class="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white"
		>
			{badge}
		</span>
	{/if}
</a>
