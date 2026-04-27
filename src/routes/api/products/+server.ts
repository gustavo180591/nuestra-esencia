import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const includeInactive = url.searchParams.get('includeInactive') === 'true';
		const categoryId = url.searchParams.get('categoryId');

		const whereClause: any = {};
		if (!includeInactive) {
			whereClause.status = 'ACTIVO';
		}
		if (categoryId) {
			whereClause.categoryId = categoryId;
		}

		const products = await db.product.findMany({
			where: whereClause,
			include: {
				category: {
					select: {
						id: true,
						name: true
					}
				},
				saleFormats: {
					where: {
						active: true
					},
					select: {
						id: true,
						unitMeasure: true,
						label: true,
						price: true
					},
					orderBy: {
						price: 'asc'
					}
				},
				_count: {
					select: {
						saleItems: true,
						purchaseItems: true,
						stockMoves: true
					}
				},
				saleItems: {
					where: {
						sale: {
							status: 'COMPLETADA'
						}
					},
					select: {
						id: true
					},
					take: 1
				}
			},
			orderBy: [
				{
					category: {
						name: 'asc'
					}
				},
				{
					name: 'asc'
				}
			]
		});

		// Transform data to include deletable flag
		const productsWithDeletable = products.map((product) => ({
			...product,
			canDelete: product._count.saleItems === 0 || product.saleItems.length === 0
		}));

		return json({
			success: true,
			data: productsWithDeletable,
			count: products.length
		});
	} catch (error) {
		console.error('Error fetching products:', error);
		return json(
			{
				success: false,
				message: 'Error al obtener productos',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		const { name, description, categoryId, stock, stockMin, isPerishable, saleFormats } = data;

		// Validaciones básicas
		if (!name || name.trim() === '') {
			return json(
				{
					success: false,
					message: 'El nombre del producto es requerido'
				},
				{ status: 400 }
			);
		}

		if (!saleFormats || saleFormats.length === 0) {
			return json(
				{
					success: false,
					message: 'El producto debe tener al menos un formato de venta'
				},
				{ status: 400 }
			);
		}

		const product = await db.product.create({
			data: {
				name: name.trim(),
				description: description?.trim() || null,
				categoryId: categoryId || null,
				stock: stock || 0,
				stockMin: stockMin || 0,
				isPerishable: isPerishable || false,
				saleFormats: {
					create: saleFormats.map((format: any) => ({
						unitMeasure: format.unitMeasure,
						label: format.label,
						price: format.price,
						active: true
					}))
				}
			},
			include: {
				category: {
					select: {
						id: true,
						name: true
					}
				},
				saleFormats: {
					select: {
						id: true,
						unitMeasure: true,
						label: true,
						price: true
					}
				}
			}
		});

		return json({
			success: true,
			message: 'Producto creado exitosamente',
			data: product
		});
	} catch (error) {
		console.error('Error creating product:', error);
		return json(
			{
				success: false,
				message: 'Error al crear producto',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
