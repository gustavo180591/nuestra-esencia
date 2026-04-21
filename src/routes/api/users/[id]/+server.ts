import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import bcrypt from 'bcryptjs';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, request, locals }) => {
	try {
		// Verificar que el usuario actual sea ADMIN
		const currentUser = locals.user;
		if (!currentUser || currentUser.role !== 'ADMIN') {
			return json(
				{
					success: false,
					message: 'No autorizado - Solo administradores pueden editar usuarios'
				},
				{ status: 403 }
			);
		}

		const { id } = params;
		const data = await request.json();
		const { name, email, password, role, active } = data;

		// Verificar que el usuario existe
		const existingUser = await db.user.findUnique({
			where: { id }
		});

		if (!existingUser) {
			return json(
				{
					success: false,
					message: 'Usuario no encontrado'
				},
				{ status: 404 }
			);
		}

		// Validaciones básicas
		if (name && name.trim() === '') {
			return json(
				{
					success: false,
					message: 'El nombre no puede estar vacío'
				},
				{ status: 400 }
			);
		}

		// Verificar si el nuevo email ya existe (si se está cambiando)
		if (email && email.trim() !== existingUser.email) {
			const emailExists = await db.user.findUnique({
				where: {
					email: email.trim()
				}
			});

			if (emailExists) {
				return json(
					{
						success: false,
						message: 'Ya existe un usuario con ese email'
					},
					{ status: 400 }
				);
			}
		}

		// Preparar datos de actualización
		const updateData: any = {};
		if (name) updateData.name = name.trim();
		if (email) updateData.email = email.trim().toLowerCase();
		if (role) updateData.role = role;
		if (typeof active === 'boolean') updateData.active = active;

		// Si se proporciona una nueva contraseña, hashearla
		if (password && password.length >= 6) {
			updateData.passwordHash = await bcrypt.hash(password, 10);
		}

		const user = await db.user.update({
			where: { id },
			data: updateData,
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
			message: 'Usuario actualizado exitosamente',
			data: user
		});
	} catch (error) {
		console.error('Error updating user:', error);
		return json(
			{
				success: false,
				message: 'Error al actualizar usuario',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		// Verificar que el usuario actual sea ADMIN
		const currentUser = locals.user;
		if (!currentUser || currentUser.role !== 'ADMIN') {
			return json(
				{
					success: false,
					message: 'No autorizado - Solo administradores pueden eliminar usuarios'
				},
				{ status: 403 }
			);
		}

		const { id } = params;

		// No permitir eliminar el propio usuario
		if (id === currentUser.id) {
			return json(
				{
					success: false,
					message: 'No puedes eliminar tu propio usuario'
				},
				{ status: 400 }
			);
		}

		// Verificar que el usuario existe
		const existingUser = await db.user.findUnique({
			where: { id }
		});

		if (!existingUser) {
			return json(
				{
					success: false,
					message: 'Usuario no encontrado'
				},
				{ status: 404 }
			);
		}

		// Verificar si el usuario tiene ventas o compras asociadas
		const userWithRelations = await db.user.findUnique({
			where: { id },
			include: {
				_count: {
					select: {
						sales: true,
						purchases: true
					}
				}
			}
		});

		if (userWithRelations && (userWithRelations._count.sales > 0 || userWithRelations._count.purchases > 0)) {
			// En lugar de eliminar, desactivar el usuario
			await db.user.update({
				where: { id },
				data: { active: false }
			});

			return json({
				success: true,
				message: 'Usuario desactivado (tiene ventas/compras asociadas)'
			});
		}

		// Eliminar el usuario si no tiene relaciones
		await db.user.delete({
			where: { id }
		});

		return json({
			success: true,
			message: 'Usuario eliminado exitosamente'
		});
	} catch (error) {
		console.error('Error deleting user:', error);
		return json(
			{
				success: false,
				message: 'Error al eliminar usuario',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
