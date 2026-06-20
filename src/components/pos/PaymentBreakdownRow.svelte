<script lang="ts">
	interface Props {
		label: string;
		amount: string;
		color?: 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'gray';
		icon?: string;
	}

	let { label, amount, color = 'gray', icon }: Props = $props();

	const colorStyles = {
		green: 'text-green-600',
		blue: 'text-blue-600',
		purple: 'text-purple-600',
		orange: 'text-orange-600',
		red: 'text-red-600',
		gray: 'text-gray-900'
	};

	const bgStyles = {
		green: 'bg-green-50',
		blue: 'bg-blue-50',
		purple: 'bg-purple-50',
		orange: 'bg-orange-50',
		red: 'bg-red-50',
		gray: 'bg-gray-50'
	};
</script>

<div class="flex items-center justify-between rounded-lg {bgStyles[color]} px-4 py-3">
	<div class="flex items-center gap-3">
		{#if icon}
			<span class="text-xl">{icon}</span>
		{/if}
		<span class="text-sm font-medium text-gray-700">{label}</span>
	</div>
	<span class="text-sm font-bold {colorStyles[color]}">{amount}</span>
</div>
