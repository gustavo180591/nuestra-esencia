import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

// GET /api/movements - Obtener todos los movimientos del sistema
export const GET: RequestHandler = async ({ url }) => {
	try {
		const page = Number(url.searchParams.get('page')) || 1;
		const limit = Number(url.searchParams.get('limit')) || 50;
		const type = url.searchParams.get('type'); // 'OPENING' | 'CLOSING' | null para todos
		const startDate = url.searchParams.get('startDate');
		const endDate = url.searchParams.get('endDate');
		
		const skip = (page - 1) * limit;

		// Construir filtros para cash registers
		const where: any = {};
		
		if (startDate || endDate) {
			where.createdAt = {};
			if (startDate) {
				where.createdAt.gte = new Date(startDate);
			}
			if (endDate) {
				where.createdAt.lte = new Date(endDate);
			}
		}

		// Obtener cash registers (sin filtrar por tipo ya que no existe ese campo)
		const [registers, total] = await Promise.all([
			db.cashRegister.findMany({
				where,
				include: {
					openedBy: {
						select: { id: true, name: true, email: true }
					},
					closedBy: {
						select: { id: true, name: true, email: true }
					}
				},
				orderBy: { createdAt: 'desc' },
				skip,
				take: limit
			}),
			db.cashRegister.count({ where })
		]);

		// Formatear movimientos para la respuesta
		let formattedMovements = registers.map((register: any) => {
			const result = [];
			
			// Movimiento de apertura
			if (register.openedAt) {
				result.push({
					id: `${register.id}-opening`,
					type: 'OPENING',
					cashRegisterId: register.id,
					amount: register.initialAmount,
					user: register.openedBy,
					timestamp: register.openedAt,
					notes: register.openingNotes,
					billCounts: register.openingBillCounts,
					description: 'Apertura de Caja'
				});
			}
			
			// Movimiento de cierre
			if (register.status === 'CERRADA' && register.closedAt) {
				result.push({
					id: `${register.id}-closing`,
					type: 'CLOSING',
					cashRegisterId: register.id,
					amount: register.actualAmount,
					user: register.closedBy,
					timestamp: register.closedAt,
					notes: register.notes,
					billCounts: register.billCounts,
					expectedAmount: register.expectedAmount,
					difference: register.difference,
					description: 'Cierre de Caja'
				});
			}
			
			return result;
		}).flat();

		// Aplicar filtro por tipo si se especificó
		if (type) {
			formattedMovements = formattedMovements.filter((movement: any) => movement.type === type);
		}

		// Ordenar por timestamp descendente
		formattedMovements.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

		return json({
			success: true,
			data: {
				movements: formattedMovements,
				pagination: {
					page,
					limit,
					total,
					pages: Math.ceil(total / limit)
				}
			}
		});
	} catch (error) {
		console.error('Error fetching movements:', error);
		return json(
			{
				success: false,
				message: 'Error al obtener movimientos',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
