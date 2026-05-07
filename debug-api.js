// Script para debug de API
async function debugAPI() {
	try {
		console.log('=== DEBUG API ===');

		// Probar API de productos
		console.log('\n1. Probando /api/products');
		const productsResponse = await fetch('http://localhost:5173/api/products');
		if (productsResponse.ok) {
			const productsData = await productsResponse.json();
			console.log('Response structure:', JSON.stringify(productsData, null, 2));
		} else {
			console.error('Products API error:', productsResponse.status, productsResponse.statusText);
		}

		// Probar API de payment methods
		console.log('\n2. Probando /api/payment-methods');
		const paymentResponse = await fetch('http://localhost:5173/api/payment-methods');
		if (paymentResponse.ok) {
			const paymentData = await paymentResponse.json();
			console.log('Payment methods response:', JSON.stringify(paymentData, null, 2));
		} else {
			console.error(
				'Payment methods API error:',
				paymentResponse.status,
				paymentResponse.statusText
			);
		}

		// Probar API de ventas
		console.log('\n3. Probando GET /api/sales');
		const salesResponse = await fetch('http://localhost:5173/api/sales');
		if (salesResponse.ok) {
			const salesData = await salesResponse.json();
			console.log('Sales response:', JSON.stringify(salesData, null, 2));
		} else {
			console.error('Sales API error:', salesResponse.status, salesResponse.statusText);
		}
	} catch (error) {
		console.error('Debug error:', error);
	}
}

debugAPI();
