<script lang="ts">
	import { goto } from '$app/navigation';

	let username = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');

	async function handleLogin(event: Event) {
		event.preventDefault();

		if (!username || !password) {
			error = 'Por favor complete todos los campos';
			return;
		}

		loading = true;
		error = '';

		try {
			// Simulación de login (en producción sería una API real)
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Login exitoso - redirigir al dashboard
			goto('/');
		} catch {
			error = 'Error al iniciar sesión';
		} finally {
			loading = false;
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleLogin(event);
		}
	}
</script>

<div
	class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-gray-900"
>
	<div class="w-full max-w-md space-y-8">
		<div>
			<!-- Logo -->
			<div class="mx-auto flex h-12 w-12 items-center justify-center">
				<div
					class="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-amber-500 to-orange-600 shadow-lg"
				>
					<span class="text-lg font-bold text-white">NE</span>
				</div>
			</div>
			<h2 class="mt-6 text-center text-3xl font-bold text-gray-900 dark:text-gray-100">
				Nuestra Esencia
			</h2>
			<p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
				Sistema de Gestión - Sabores al Paso
			</p>
		</div>

		<div class="rounded-lg bg-white p-8 shadow dark:bg-gray-800">
			<form onsubmit={handleLogin}>
				<div class="space-y-6">
					<div>
						<label
							for="username"
							class="mb-2 block text-sm font-medium text-gray-900 dark:text-gray-100"
						>
							Usuario
						</label>
						<input
							id="username"
							name="username"
							type="text"
							bind:value={username}
							required
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:ring-amber-500 focus:outline-none"
							placeholder="Ingrese su usuario"
						/>
					</div>

					<div>
						<label
							for="password"
							class="mb-2 block text-sm font-medium text-gray-900 dark:text-gray-100"
						>
							Contraseña
						</label>
						<input
							id="password"
							name="password"
							type="password"
							bind:value={password}
							required
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:ring-amber-500 focus:outline-none"
							placeholder="Ingrese su contraseña"
						/>
					</div>
				</div>

				{#if error}
					<div class="mt-4 rounded bg-red-50 p-3 text-center text-sm text-red-600">
						{error}
					</div>
				{/if}

				<div class="mt-6">
					<button
						type="submit"
						disabled={loading}
						class="flex w-full justify-center rounded-md border border-transparent bg-amber-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-amber-700 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if loading}
							<div class="flex items-center">
								<svg
									class="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V8C6.477 8 4.638 9.163 3.464 10.393l5.907 5.907a8 8 0 0011.314 0z"
									></path>
								</svg>
								Iniciando sesión...
							</div>
						{:else}
							Iniciar Sesión
						{/if}
					</button>
				</div>

				<div class="mt-6 text-center">
					<p class="text-sm text-gray-600 dark:text-gray-400">
						Usuario demo: <span class="rounded bg-gray-100 px-2 py-1 font-mono">admin</span>
					</p>
					<p class="text-sm text-gray-600 dark:text-gray-400">
						Contraseña demo: <span class="rounded bg-gray-100 px-2 py-1 font-mono">123456</span>
					</p>
				</div>
			</form>
		</div>

		<div class="mt-4 text-center">
			<p class="text-xs text-gray-500 dark:text-gray-400">
				© 2026 Nuestra Esencia - Sistema de Gestión
			</p>
		</div>
	</div>
</div>
