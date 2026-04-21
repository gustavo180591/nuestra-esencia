import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		// Verificar que el usuario actual sea ADMIN
		const currentUser = locals.user;
		if (!currentUser || currentUser.role !== 'ADMIN') {
			return json(
				{
					success: false,
					message: 'No autorizado - Solo administradores pueden ver usuarios'
				},
				{ status: 403 }
			);
		}

		const includeInactive = url.searchParams.get('includeInactive') === 'true';

		const whereClause: any = {};
		if (!includeInactive) {
			whereClause.active = true;
		}

		const users = await db.user.findMany({
			where: whereClause,
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				active: true,
				createdAt: true,
				updatedAt: true
			},
			orderBy: {
				createdAt: 'desc'
			}
		});

		return json({
			success: true,
			data: users,
			count: users.length
		});
	} catch (error) {
		console.error('Error fetching users:', error);
		return json(
			{
				success: false,
				message: 'Error al obtener usuarios',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Verificar que el usuario actual sea ADMIN
		const currentUser = locals.user;
		if (!currentUser || currentUser.role !== 'ADMIN') {
			return json(
				{
					success: false,
					message: 'No autorizado - Solo administradores pueden crear usuarios'
				},
				{ status: 403 }
			);
		}

		const data = await request.json();
		const { name, email, password, role } = data;

		// Validaciones básicas
		if (!name || name.trim() === '') {
			return json(
				{
					success: false,
					message: 'El nombre es requerido'
				},
				{ status: 400 }
			);
		}

		if (!email || email.trim() === '') {
			return json(
				{
					success: false,
					message: 'El email es requerido'
				},
				{ status: 400 }
			);
		}

		if (!password || password.length < 6) {
			return json(
				{
					success: false,
					message: 'La contraseña debe tener al menos 6 caracteres'
				},
				{ status: 400 }
			);
		}

		// Verificar si ya existe un usuario con el mismo email
		const existingUser = await db.user.findUnique({
			where: {
				email: email.trim()
			}
		});

		if (existingUser) {
			return json(
				{
					success: false,
					message: 'Ya existe un usuario con ese email'
				},
				{ status: 400 }
			);
		}

		// Hash de la contraseña
		const passwordHash = await bcrypt.hash(password, 10);

		const user = await db.user.create({
			data: {
				name: name.trim(),
				email: email.trim().toLowerCase(),
				passwordHash,
				role: role || 'CAJERO',
				active: true
			},
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				active: true,
				createdAt: true,
				updatedAt: true
			}
		});

		return json({
			success: true,
			message: 'Usuario creado exitosamente',
			data: user
		});
	} catch (error) {
		console.error('Error creating user:', error);
		return json(
			{
				success: false,
				message: 'Error al crear usuario',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
