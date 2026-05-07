import { db } from './src/lib/server/db';

async function checkProducts() {
    try {
        const products = await db.product.findMany({
            include: {
                saleFormats: true,
                category: true
            },
            take: 5
        });
        console.log('Productos encontrados:', products.length);
        console.log('Estructura:', JSON.stringify(products[0], null, 2));
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await db.$disconnect();
    }
}

checkProducts();
