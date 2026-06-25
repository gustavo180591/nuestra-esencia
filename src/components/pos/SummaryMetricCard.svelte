<script lang="ts">
	import { TrendingUp, TrendingDown, Minus } from '@lucide/svelte';

	interface Props {
		label: string;
		value: string;
		variant?: 'default' | 'positive' | 'negative' | 'neutral';
		icon?: any;
	}

	let { label, value, variant = 'default', icon: Icon }: Props = $props();

	const variantStyles = {
		default: 'bg-white border-gray-200',
		positive: 'bg-green-50 border-green-200',
		negative: 'bg-red-50 border-red-200',
		neutral: 'bg-gray-50 border-gray-200'
	};

	const textStyles = {
		default: 'text-gray-900',
		positive: 'text-green-700',
		negative: 'text-red-700',
		neutral: 'text-gray-700'
	};
</script>

<div
	class="rounded-lg border p-4 shadow-sm transition-all hover:shadow-md {variantStyles[variant]}"
>
	<div class="mb-2 flex items-center gap-2">
		{#if Icon}
			<Icon class="h-4 w-4 {textStyles[variant]}" aria-hidden="true" />
		{/if}
		<span class="text-xs font-medium tracking-wider text-gray-500 uppercase">{label}</span>
	</div>
	<div class="text-2xl font-bold {textStyles[variant]}">{value}</div>
</div>
