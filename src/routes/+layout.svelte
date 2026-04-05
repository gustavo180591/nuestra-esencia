<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<script>
		// Aplicar tema inmediatamente para evitar parpadeo
		(function() {
			const theme = localStorage.getItem('theme');
			if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
				document.documentElement.classList.add('dark');
			}
		})();
	</script>
</svelte:head>

{@render children()}
