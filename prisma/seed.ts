import { PrismaClient, UnitMeasure } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Iniciando seed de datos...');

	// Limpieza de datos existentes
	await prisma.stockMovement.deleteMany();
	await prisma.saleItem.deleteMany();
	await prisma.sale.deleteMany();
	await prisma.purchaseItem.deleteMany();
	await prisma.purchase.deleteMany();
	await prisma.productSaleFormat.deleteMany();
	await prisma.product.deleteMany();
	await prisma.category.deleteMany();
	await prisma.supplier.deleteMany();
	await prisma.user.deleteMany();

	console.log('🧹 Datos limpiados');

	// 1. Crear payment methods (si no existen)
	const existingPaymentMethods = await prisma.paymentMethodConfig.findMany();
	if (existingPaymentMethods.length === 0) {
		await prisma.paymentMethodConfig.createMany({
			data: [
				{ code: 'EFECTIVO', name: 'Efectivo', icon: '💵', sortOrder: 0 },
				{ code: 'TRANSFERENCIA', name: 'Transferencia', icon: '🏦', sortOrder: 1 },
				{ code: 'TARJETA', name: 'Tarjeta', icon: '💳', sortOrder: 2 },
				{ code: 'QR', name: 'QR', icon: '📱', sortOrder: 3 }
			]
		});
		console.log('💳 Métodos de pago creados');
	}

	// 2. Crear usuarios
	const adminPassword = await bcrypt.hash('admin123', 10);
	const cajeroPassword = await bcrypt.hash('cajero123', 10);

	await prisma.user.create({
		data: {
			name: 'Administrador',
			email: 'admin@nuestra-esencia.com',
			passwordHash: adminPassword,
			role: 'ADMIN'
		}
	});

	const cajero1 = await prisma.user.create({
		data: {
			name: 'Juan Cajero',
			email: 'juan@nuestra-esencia.com',
			passwordHash: cajeroPassword,
			role: 'CAJERO'
		}
	});

	const cajero2 = await prisma.user.create({
		data: {
			name: 'María Cajera',
			email: 'maria@nuestra-esencia.com',
			passwordHash: cajeroPassword,
			role: 'CAJERO'
		}
	});

	await prisma.user.create({
		data: {
			name: 'Carlos Admin',
			email: 'carlos@nuestra-esencia.com',
			passwordHash: adminPassword,
			role: 'ADMIN'
		}
	});

	console.log('👥 Usuarios creados');

	// 2. Crear categorías
	const panificados = await prisma.category.create({
		data: {
			name: 'Panificados',
			description: 'Chipá, panes, facturas'
		}
	});

	const fritos = await prisma.category.create({
		data: {
			name: 'Fritos',
			description: 'Empanadas, tartas, pasteles'
		}
	});

	const pizzas = await prisma.category.create({
		data: {
			name: 'Pizzas',
			description: 'Pizzas por porción'
		}
	});

	const bebidas = await prisma.category.create({
		data: {
			name: 'Bebidas',
			description: 'Gaseosas, aguas, jugos'
		}
	});

	console.log('📂 Categorías creadas');

	// 3. Crear proveedores
	const proveedorPan = await prisma.supplier.create({
		data: {
			name: 'Panadería Central',
			phone: '+54 9 341 123-4567',
			address: 'Av. Corrientes 1234',
			email: 'contacto@panaderiacentral.com'
		}
	});

	const proveedorFritos = await prisma.supplier.create({
		data: {
			name: 'Fritos del Sur',
			phone: '+54 9 341 234-5678',
			address: 'Calle 25 de Mayo 567',
			email: 'ventas@fritossur.com'
		}
	});

	await prisma.supplier.create({
		data: {
			name: 'Distribuidora Bebidas',
			phone: '+54 9 341 345-6789',
			address: 'Av. Pellegrini 890',
			email: 'pedidos@bebidas.com'
		}
	});

	console.log('🚚 Proveedores creados');

	// 4. Crear productos con sus formatos de venta
	const productos = [
		{
			name: 'Chipá Clásico',
			description: 'Chipá tradicional con queso',
			categoryId: panificados.id,
			isPerishable: true,
			stock: 50,
			stockMin: 10,
			formatos: [
				{ unitMeasure: UnitMeasure.UNIDAD, label: 'Unidad', price: 800 },
				{ unitMeasure: UnitMeasure.MEDIA_DOCENA, label: 'Media docena', price: 4500 },
				{ unitMeasure: UnitMeasure.DOCENA, label: 'Docena', price: 8500 },
				{ unitMeasure: UnitMeasure.KILOGRAMO, label: 'Kilo', price: 12000 }
			]
		},
		{
			name: 'Empanada Carne',
			description: 'Empanada de carne cortada a cuchillo',
			categoryId: fritos.id,
			isPerishable: true,
			stock: 30,
			stockMin: 8,
			formatos: [
				{ unitMeasure: UnitMeasure.UNIDAD, label: 'Unidad', price: 1200 },
				{ unitMeasure: UnitMeasure.MEDIA_DOCENA, label: 'Media docena', price: 6500 },
				{ unitMeasure: UnitMeasure.DOCENA, label: 'Docena', price: 12000 }
			]
		},
		{
			name: 'Empanada Pollo',
			description: 'Empanada de pollo con verduras',
			categoryId: fritos.id,
			isPerishable: true,
			stock: 25,
			stockMin: 8,
			formatos: [
				{ unitMeasure: UnitMeasure.UNIDAD, label: 'Unidad', price: 1100 },
				{ unitMeasure: UnitMeasure.MEDIA_DOCENA, label: 'Media docena', price: 6000 },
				{ unitMeasure: UnitMeasure.DOCENA, label: 'Docena', price: 11000 }
			]
		},
		{
			name: 'Pizza Muzzarella',
			description: 'Pizza porción con muzzarella y tomate',
			categoryId: pizzas.id,
			isPerishable: true,
			stock: 20,
			stockMin: 5,
			formatos: [
				{ unitMeasure: UnitMeasure.PORCION, label: 'Porción', price: 3500 },
				{ unitMeasure: UnitMeasure.UNIDAD, label: 'Porción individual', price: 3500 }
			]
		},
		{
			name: 'Pizza Napolitana',
			description: 'Pizza porción con tomate, ajo y albahaca',
			categoryId: pizzas.id,
			isPerishable: true,
			stock: 15,
			stockMin: 5,
			formatos: [
				{ unitMeasure: UnitMeasure.PORCION, label: 'Porción', price: 3800 },
				{ unitMeasure: UnitMeasure.UNIDAD, label: 'Porción individual', price: 3800 }
			]
		},
		{
			name: 'Factura Crema',
			description: 'Factura con dulce de leche y crema',
			categoryId: panificados.id,
			isPerishable: true,
			stock: 40,
			stockMin: 10,
			formatos: [
				{ unitMeasure: UnitMeasure.UNIDAD, label: 'Unidad', price: 900 },
				{ unitMeasure: UnitMeasure.MEDIA_DOCENA, label: 'Media docena', price: 5000 },
				{ unitMeasure: UnitMeasure.DOCENA, label: 'Docena', price: 9500 }
			]
		},
		{
			name: 'Pan Francés',
			description: 'Pan francés casero',
			categoryId: panificados.id,
			isPerishable: true,
			stock: 25,
			stockMin: 8,
			formatos: [
				{ unitMeasure: UnitMeasure.UNIDAD, label: 'Unidad', price: 600 },
				{ unitMeasure: UnitMeasure.KILOGRAMO, label: 'Kilo', price: 4000 }
			]
		},
		{
			name: 'Coca-Cola 500ml',
			description: 'Gaseosa Coca-Cola 500ml',
			categoryId: bebidas.id,
			isPerishable: false,
			stock: 60,
			stockMin: 15,
			formatos: [{ unitMeasure: UnitMeasure.UNIDAD, label: 'Unidad', price: 1500 }]
		},
		{
			name: 'Agua Mineral 500ml',
			description: 'Agua mineral sin gas 500ml',
			categoryId: bebidas.id,
			isPerishable: false,
			stock: 80,
			stockMin: 20,
			formatos: [{ unitMeasure: UnitMeasure.UNIDAD, label: 'Unidad', price: 800 }]
		}
	];

	// Crear productos y sus formatos
	for (const productoData of productos) {
		const { formatos, ...producto } = productoData;

		const nuevoProducto = await prisma.product.create({
			data: producto
		});

		// Crear formatos de venta
		for (const formato of formatos) {
			await prisma.productSaleFormat.create({
				data: {
					productId: nuevoProducto.id,
					...formato
				}
			});
		}
	}

	console.log('🛍️  Productos y formatos creados');

	// 5. Crear algunas compras de ejemplo
	const chipa = await prisma.product.findFirst({ where: { name: 'Chipá Clásico' } });
	const empanadaCarne = await prisma.product.findFirst({ where: { name: 'Empanada Carne' } });
	const coca = await prisma.product.findFirst({ where: { name: 'Coca-Cola 500ml' } });

	if (chipa && empanadaCarne && coca) {
		// Compra 1: Chipá
		await prisma.purchase.create({
			data: {
				purchaseNumber: 1,
				supplierId: proveedorPan.id,
				userId: cajero1.id,
				subtotal: 240000,
				total: 240000,
				notes: 'Compra semanal de chipá',
				items: {
					create: [
						{
							productId: chipa.id,
							productNameSnapshot: chipa.name,
							unitMeasure: UnitMeasure.DOCENA,
							quantity: 20,
							unitCost: 12000,
							subtotal: 240000
						}
					]
				}
			}
		});

		// Compra 2: Empanadas y bebidas
		await prisma.purchase.create({
			data: {
				purchaseNumber: 2,
				supplierId: proveedorFritos.id,
				userId: cajero1.id,
				subtotal: 156000,
				total: 156000,
				notes: 'Empanadas variadas',
				items: {
					create: [
						{
							productId: empanadaCarne.id,
							productNameSnapshot: empanadaCarne.name,
							unitMeasure: UnitMeasure.UNIDAD,
							quantity: 30,
							unitCost: 8000,
							subtotal: 240000
						}
					]
				}
			}
		});
	}

	console.log('💰 Compras de ejemplo creadas');

	console.log('✅ Seed completado exitosamente!');
	console.log('');
	console.log('👤 Usuarios de prueba:');
	console.log('   Admin: admin@nuestra-esencia.com / admin123');
	console.log('   Cajero 1: juan@nuestra-esencia.com / cajero123');
	console.log('   Cajero 2: maria@nuestra-esencia.com / cajero123');
	console.log('   Admin 2: carlos@nuestra-esencia.com / admin123');
}

main()
	.catch((e) => {
		console.error('❌ Error en el seed:', e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
