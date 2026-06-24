import {
	Store,
	ShoppingCart,
	Users,
	Box,
	Archive,
	Package,
	Wallet,
	Receipt,
	CreditCard,
	Tags
} from '@lucide/svelte';

export interface NavItem {
	href: string;
	label: string;
	icon: any;
	badge?: number;
	roles?: ('ADMIN' | 'CAJERO')[];
}

export interface NavSection {
	title: string;
	items: NavItem[];
	roles?: ('ADMIN' | 'CAJERO')[];
}

export const navigationSections: NavSection[] = [
	{
		title: 'Operación',
		items: [
			{ href: '/pos', label: 'Caja', icon: Store },
			{ href: '/admin/sales', label: 'Ventas', icon: ShoppingCart },
			{ href: '/admin/cajas', label: 'Cajas', icon: Wallet }
		]
	},
	{
		title: 'Gestión',
		items: [
			{ href: '/admin', label: 'Productos', icon: Box },
			{ href: '/admin/categories', label: 'Categorías', icon: Tags },
			{ href: '/admin/combos', label: 'Combos', icon: Package },
			{ href: '/admin/stock', label: 'Stock', icon: Archive },
			{ href: '/admin/clients', label: 'Clientes', icon: Users }
		]
	},
	{
		title: 'Finanzas',
		items: [
			{ href: '/admin/purchases', label: 'Compras', icon: ShoppingCart },
			{ href: '/admin/expenses', label: 'Gastos', icon: Receipt },
			{ href: '/admin/payment-methods', label: 'Métodos de Pago', icon: CreditCard }
		]
	}
];

export function getNavigationForRole(role: 'ADMIN' | 'CAJERO'): NavSection[] {
	return navigationSections
		.map((section) => ({
			...section,
			items: section.items.filter((item) => !item.roles || item.roles.includes(role))
		}))
		.filter((section) => section.items.length > 0);
}
