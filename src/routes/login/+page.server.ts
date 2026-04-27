import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	// Si ya hay sesión iniciada, redirigir al home
	if (locals.user) {
		throw redirect(302, '/');
	}

	return {};
};
