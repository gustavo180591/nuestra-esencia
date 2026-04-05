import { writable } from 'svelte/store';

export const darkMode = writable(false);

// Cargar preferencia desde localStorage
if (typeof window !== 'undefined') {
	const savedTheme = localStorage.getItem('theme');
	if (savedTheme === 'dark') {
		darkMode.set(true);
		document.documentElement.classList.add('dark');
	}
}

// Escuchar cambios y guardar en localStorage
darkMode.subscribe((value) => {
	if (typeof window !== 'undefined') {
		localStorage.setItem('theme', value ? 'dark' : 'light');
		if (value) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}
});
