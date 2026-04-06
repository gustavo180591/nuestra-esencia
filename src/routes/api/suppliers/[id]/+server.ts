import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const supplier = await db.supplier.findUnique({
			where: {
				id: params.id
			},
			include: {
				_count: {
					select: {
						purchases: {
							where: {
								status: 'REGISTRADA'
							}
						}
					}
				},
				purchases: {
					where: {
						status: 'REGISTRADA'
					},
					include: {
						_count: {
							select: {
								items: true
							}
						}
					},
					orderBy: {
						createdAt: 'desc'
					},
					take: 10 // Últimas 10 compras
				}
			}
		});

		if (!supplier) {
			return json(
				{
					success: false,
					message: 'Proveedor no encontrado'
				},
				{ status: 404 }
			);
		}

		return json({
			success: true,
			data: supplier
		});
	} catch (error) {
		console.error('Error fetching supplier:', error);
		return json(
			{
				success: false,
				message: 'Error al obtener proveedor',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const data = await request.json();

		const { name, phone, address, email, active } = data;

		// Validaciones básicas
		if (!name || name.trim() === '') {
			return json(
				{
					success: false,
					message: 'El nombre del proveedor es requerido'
				},
				{ status: 400 }
			);
		}

		// Verificar que el proveedor existe
		const existingSupplier = await db.supplier.findUnique({
			where: { id: params.id }
		});

		if (!existingSupplier) {
			return json(
				{
					success: false,
					message: 'Proveedor no encontrado'
				},
				{ status: 404 }
			);
		}

		// Verificar si ya existe otro proveedor con el mismo nombre
		const duplicateSupplier = await db.supplier.findFirst({
			where: {
				name: name.trim(),
				active: true,
				NOT: {
					id: params.id
				}
			}
		});

		if (duplicateSupplier) {
			return json(
				{
					success: false,
					message: 'Ya existe otro proveedor con ese nombre'
				},
				{ status: 400 }
			);
		}

		const supplier = await db.supplier.update({
			where: {
				id: params.id
			},
			data: {
				name: name.trim(),
				phone: phone?.trim() || null,
				address: address?.trim() || null,
				email: email?.trim() || null,
				active: active !== undefined ? active : true
			},
			include: {
				_count: {
					select: {
						purchases: {
							where: {
								status: 'REGISTRADA'
							}
						}
					}
				}
			}
		});

		return json({
			success: true,
			message: 'Proveedor actualizado exitosamente',
			data: supplier
		});
	} catch (error) {
		console.error('Error updating supplier:', error);
		return json(
			{
				success: false,
				message: 'Error al actualizar proveedor',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		// Verificar que el proveedor existe
		const existingSupplier = await db.supplier.findUnique({
			where: { id: params.id },
			include: {
				_count: {
					select: {
						purchases: {
							where: {
								status: 'REGISTRADA'
							}
						}
					}
				}
			}
		});

		if (!existingSupplier) {
			return json(
				{
					success: false,
					message: 'Proveedor no encontrado'
				},
				{ status: 404 }
			);
		}

		// Verificar si hay compras registradas con este proveedor
		if (existingSupplier._count.purchases > 0) {
			return json(
				{
					success: false,
					message:
						'No se puede eliminar un proveedor que tiene compras registradas. Primero elimine o cancele las compras.'
				},
				{ status: 400 }
			);
		}

		// Soft delete - cambiar active a false
		await db.supplier.update({
			where: {
				id: params.id
			},
			data: {
				active: false
			}
		});

		return json({
			success: true,
			message: 'Proveedor eliminado exitosamente'
		});
	} catch (error) {
		console.error('Error deleting supplier:', error);
		return json(
			{
				success: false,
				message: 'Error al eliminar proveedor',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
