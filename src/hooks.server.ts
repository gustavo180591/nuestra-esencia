import type { Handle } from '@sveltejs/kit';

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

	// Resolver la solicitud
	const response = await resolve(event);

	return response;
};
