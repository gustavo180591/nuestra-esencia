<script lang="ts">
	let username = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');
	let showPassword = $state(false);

	async function handleLogin(event: Event) {
		event.preventDefault();

		if (!username || !password) {
			error = 'Por favor complete todos los campos';
			return;
		}

		loading = true;
		error = '';

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email: username, password })
			});

			const result = await response.json();

			if (result.success) {
				// Login exitoso - redirigir al dashboard
				window.location.href = '/';
			} else {
				error = result.message || 'Error al iniciar sesión';
			}
		} catch {
			error = 'Error al iniciar sesión';
		} finally {
			loading = false;
		}
	}
</script>

<div
	class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-gray-900"
>
	<div class="w-full max-w-md space-y-8">
		<div>
			<!-- Logo -->
			<div class="mx-auto flex h-40 w-40 items-center justify-center">
				<img src="/logo.svg" alt="Nuestra Esencia Logo" class="h-full w-full object-contain" />
			</div>
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
						<div class="relative">
							<input
								id="password"
								name="password"
								type={showPassword ? 'text' : 'password'}
								bind:value={password}
								required
								class="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-gray-900 placeholder-gray-500 focus:border-amber-500 focus:ring-amber-500 focus:outline-none"
								placeholder="Ingrese su contraseña"
							/>
							<button
								type="button"
								onclick={() => showPassword = !showPassword}
								class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
							>
								{#if showPassword}
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 00-3-3 3 3 0 003 3m0-6a3 3 0 00-3 3 3 3 0 003 3m-6 0a3 3 0 00-3 3 3 3 0 003 3" />
									</svg>
								{:else}
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0012 19a10.05 10.05 0 0010.05-10.05 10.05 0 001.875 8.175M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									</svg>
								{/if}
							</button>
						</div>
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
			</form>
		</div>

		<div class="mt-4 text-center">
			<p class="text-xs text-gray-500 dark:text-gray-400">
				© 2026 Nuestra Esencia - Sistema de Gestión
			</p>
		</div>
	</div>
</div>
