<script lang="ts">
	interface Props {
		value: number;
		onchange: (value: number) => void;
		placeholder?: string;
		id?: string;
		class?: string;
		min?: number;
		step?: number;
		disabled?: boolean;
	}

	let {
		value,
		onchange,
		placeholder = '0,00',
		id,
		class: className,
		min = 0,
		step = 0.01,
		disabled = false
	}: Props = $props();

	let inputElement: HTMLInputElement;
	let isFocused = $state(false);
	let userTypedValue = $state('');
	let displayValue = $derived(isFocused ? userTypedValue : formatNumber(value));

	function formatNumber(num: number): string {
		if (isNaN(num) || num === null || num === undefined || num === 0) return '';
		return num.toLocaleString('es-AR', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});
	}

	function formatWhileTyping(
		input: string,
		cursorPosition: number
	): { formatted: string; newCursor: number } {
		// Remove all non-numeric characters except comma
		let cleaned = input.replace(/[^\d,]/g, '');

		// Handle multiple commas - keep only the last one
		const commaCount = (cleaned.match(/,/g) || []).length;
		if (commaCount > 1) {
			const lastCommaIndex = cleaned.lastIndexOf(',');
			cleaned =
				cleaned.substring(0, lastCommaIndex).replace(/,/g, '') + cleaned.substring(lastCommaIndex);
		}

		// Split by comma to handle integer and decimal parts
		const parts = cleaned.split(',');
		let integerPart = parts[0] || '0';
		let decimalPart = parts[1] || '';

		// Limit decimal part to 2 digits
		if (decimalPart.length > 2) {
			decimalPart = decimalPart.substring(0, 2);
		}

		// Format integer part with thousand separators
		if (integerPart) {
			const num = parseInt(integerPart, 10) || 0;
			integerPart = num.toLocaleString('es-AR');
		}

		// Combine parts - don't pad with zeros while typing
		let formatted = integerPart;
		if (decimalPart !== '' || parts.length > 1) {
			formatted += ',' + decimalPart;
		}

		// Calculate new cursor position
		// This is a simplified approach - adjust cursor after formatting
		const newCursor = formatted.length;

		return { formatted, newCursor };
	}

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		const cursorPosition = target.selectionStart || 0;
		const { formatted } = formatWhileTyping(target.value, cursorPosition);

		userTypedValue = formatted;

		// Parse to number for the actual value
		const cleaned = formatted.replace(/\./g, '').replace(',', '.');
		const parsed = parseFloat(cleaned) || 0;
		onchange(parsed);
	}

	function handleFocus() {
		isFocused = true;
		userTypedValue = formatNumber(value);
	}

	function handleBlur(event: Event) {
		isFocused = false;
		userTypedValue = '';
	}
</script>

<div class="relative">
	<span class="absolute top-2 left-3 text-gray-500">$</span>
	<input
		bind:this={inputElement}
		{id}
		type="text"
		{disabled}
		{min}
		{step}
		value={displayValue}
		oninput={handleInput}
		onfocus={handleFocus}
		onblur={handleBlur}
		{placeholder}
		class="w-full rounded-md border border-gray-300 py-2 pr-3 pl-8 text-gray-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none {className}"
	/>
</div>
