import { db } from '$lib/server/db';
import { json } from '@sveltejs/kit';

export async function GET() {
	try {
		await db.$queryRaw`SELECT 1`;
		return json({
			status: 'ok',
			message: 'Database connection successful',
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		return json(
			{
				status: 'error',
				message: 'Database connection failed',
				error: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
}
