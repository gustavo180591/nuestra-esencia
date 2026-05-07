import type { Handle } from '@sveltejs/kit';
import { redirect, error } from '@sveltejs/kit';

// Rutas públicas que no requieren autenticación
const PUBLIC_ROUTES = ['/login', '/api/auth/login', '/api/auth/logout'];

// Rutas solo para ADMIN
const ADMIN_ONLY_ROUTES = [
	'/admin',
	'/admin/purchases',
	'/admin/products',
	'/admin/suppliers',
	'/admin/users',
	'/admin/reports'
];

// Rutas permitidas para CAJERO
const CAJERO_ROUTES = ['/pos', '/api/sales', '/logout'];

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
	const isPublicRoute = PUBLIC_ROUTES.some((route) => path === route || path.startsWith(route));

	// Si no hay sesión y la ruta no es pública, redirir al login
	if (!event.locals.user && !isPublicRoute) {
		throw redirect(303, '/login');
	}

	// 🔐 Verificar autorización por rol
	if (event.locals.user && !isPublicRoute) {
		const userRole = event.locals.user.role;
		const isAdminRoute = ADMIN_ONLY_ROUTES.some((route) => path === route || path.startsWith(route));

		// Cajero intentando acceder a ruta de admin
		if (isAdminRoute && userRole !== 'ADMIN') {
			// Si es cajero, redirigir a POS
			if (userRole === 'CAJERO') {
				throw redirect(303, '/pos');
			}
			throw error(403, 'Acceso denegado');
		}

		// Admin intentando acceder a POS (permitido, pero no necesario)
		// Cajero en ruta permitida (OK)
	}

	// Resolver la solicitud
	const response = await resolve(event);

	return response;
};
