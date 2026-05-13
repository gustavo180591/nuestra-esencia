import { z } from 'zod';

// Esquema para apertura de caja
export const openCashRegisterSchema = z.object({
	initialAmount: z.number().min(0, 'El monto inicial debe ser mayor o igual a 0'),
	branch: z.string().optional(),
	shift: z.enum(['MAÑANA', 'TARDE', 'NOCHE']).optional(),
	openingBillCounts: z
		.record(z.string(), z.number().int().min(0))
		.optional()
		.default({}),
	openingNotes: z.string().optional()
});

// Esquema para cierre de caja
export const closeCashRegisterSchema = z.object({
	actualAmount: z.number().min(0, 'El monto real debe ser mayor o igual a 0'),
	notes: z.string().optional(),
	billCounts: z
		.record(z.string(), z.number().int().min(0))
		.optional()
		.default({})
}).refine(
	(data) => {
		// Si hay notas, validar que no estén vacías
		if (data.notes && data.notes.trim().length === 0) {
			return false;
		}
		return true;
	},
	{
		message: 'Las observaciones no pueden estar vacías si se proporcionan'
	}
);

// Esquema para movimientos de caja
export const cashMovementSchema = z.object({
	cashRegisterId: z.string().uuid('ID de caja inválido'),
	type: z.enum(['INGRESO', 'EGRESO']),
	category: z.enum(['VENTA', 'GASTO', 'RETIRO', 'PAGO', 'COBRO', 'AJUSTE', 'DELIVERY', 'TRANSFERENCIA']),
	amount: z.number().positive('El monto debe ser mayor a 0'),
	description: z.string().min(1, 'La descripción es requerida').max(500, 'La descripción no puede exceder 500 caracteres')
});

// Esquema para conteo de caja
export const cashCountSchema = z.object({
	cashRegisterId: z.string().uuid('ID de caja inválido'),
	type: z.enum(['APERTURA', 'CIERRE']).default('CIERRE'),
	items: z
		.array(
			z.object({
				denomination: z.number().int().positive('La denominación debe ser un número positivo'),
				quantity: z.number().int().min(0, 'La cantidad debe ser mayor o igual a 0')
			})
		)
		.min(1, 'Debe haber al menos un ítem de conteo'),
	notes: z.string().optional()
}).refine(
	(data) => {
		// Calcular total del conteo
		const total = data.items.reduce((sum, item) => sum + item.denomination * item.quantity, 0);
		return total >= 0;
	},
	{
		message: 'El total del conteo debe ser mayor o igual a 0'
	}
);

// Tipos TypeScript inferidos
export type OpenCashRegisterInput = z.infer<typeof openCashRegisterSchema>;
export type CloseCashRegisterInput = z.infer<typeof closeCashRegisterSchema>;
export type CashMovementInput = z.infer<typeof cashMovementSchema>;
export type CashCountInput = z.infer<typeof cashCountSchema>;
