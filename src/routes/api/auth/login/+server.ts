import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const data = await request.json();
		const { email, password } = data;

		if (!email || !password) {
			return json(
				{
					success: false,
					message: 'Email y contraseña son requeridos'
				},
				{ status: 400 }
			);
		}

		// Buscar usuario por email
		const user = await db.user.findUnique({
			where: { email: email.toLowerCase() }
		});

		if (!user || !user.active) {
			return json(
				{
					success: false,
					message: 'Credenciales inválidas'
				},
				{ status: 401 }
			);
		}

		// Verificar contraseña
		const isValidPassword = await bcrypt.compare(password, user.passwordHash);

		if (!isValidPassword) {
			return json(
				{
					success: false,
					message: 'Credenciales inválidas'
				},
				{ status: 401 }
			);
		}

		// Crear sesión (cookie)
		const sessionData = JSON.stringify({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role
		});

		cookies.set('session', sessionData, {
			path: '/',
			httpOnly: true,
			secure: false, // Cambiar a true en producción con HTTPS
			maxAge: 60 * 60 * 24 * 7, // 7 días
			sameSite: 'lax'
		});

		return json({
			success: true,
			message: 'Login exitoso',
			data: {
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role
			}
		});
	} catch (error) {
		console.error('Error en login:', error);
		return json(
			{
				success: false,
				message: 'Error al iniciar sesión',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
