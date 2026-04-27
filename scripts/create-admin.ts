import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminUser() {
	try {
		// Verificar si ya existe el usuario admin
		const existingUser = await prisma.user.findUnique({
			where: { email: 'admin@nuestraesencia.com' }
		});

		if (existingUser) {
			console.log('El usuario admin@nuestraesencia.com ya existe');
			// Actualizar contraseña
			const passwordHash = await bcrypt.hash('$Nuestra2026', 10);
			await prisma.user.update({
				where: { email: 'admin@nuestraesencia.com' },
				data: { passwordHash, active: true, role: 'ADMIN' }
			});
			console.log('Contraseña actualizada exitosamente');
			return;
		}

		// Crear el usuario admin
		const passwordHash = await bcrypt.hash('$Nuestra2026', 10);

		const adminUser = await prisma.user.create({
			data: {
				name: 'Administrador',
				email: 'admin@nuestraesencia.com',
				passwordHash,
				role: 'ADMIN',
				active: true
			}
		});

		console.log('Usuario admin creado exitosamente:');
		console.log(`- ID: ${adminUser.id}`);
		console.log(`- Email: ${adminUser.email}`);
		console.log(`- Nombre: ${adminUser.name}`);
		console.log(`- Rol: ${adminUser.role}`);
	} catch (error) {
		console.error('Error al crear usuario admin:', error);
	} finally {
		await prisma.$disconnect();
	}
}

createAdminUser();
