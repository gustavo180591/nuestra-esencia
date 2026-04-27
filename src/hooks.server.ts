import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = ['/login', '/api/auth/login', '/api/auth/logout'];

export const handle: Handle = async ({ event, resolve }) => {
	// Obtener sesión de la cookie
	const sessionCookie = event.cookies.get('session');

	if (sessionCookie) {
		try {
			const session = JSON.parse(sessionCookie);
			event.locals.user = session;
		} catch {
			event.locals.user = null;
		}
	} else {
		event.locals.user = null;
	}

	// Verificar si la ruta requiere autenticación
	const path = event.url.pathname;
	const isPublicRoute = PUBLIC_ROUTES.some(route => path === route || path.startsWith(route));

	// Si no hay sesión y la ruta no es pública, redirigir al login
	if (!event.locals.user && !isPublicRoute) {
		throw redirect(303, '/login');
	}

	// Resolver la solicitud
	const response = await resolve(event);

	return response;
};
