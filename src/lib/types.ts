export interface Product {
	id: string;
	name: string;
	description: string | null;
	status: 'ACTIVO' | 'INACTIVO';
	categoryId: string | null;
	category: {
		id: string;
		name: string;
	} | null;
	stock: string;
	stockMin: string;
	isPerishable: boolean;
	saleFormats: ProductSaleFormat[];
	canDelete?: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface ProductSaleFormat {
	id: string;
	unitMeasure: 'UNIDAD' | 'DOCENA' | 'MEDIA_DOCENA' | 'KILOGRAMO' | 'PORCION';
	label: string | null;
	price: string;
	quantity: number;
	active: boolean;
}

export interface Category {
	id: string;
	name: string;
	description: string | null;
	active: boolean;
	_count?: {
		products: number;
	};
	createdAt: string;
	updatedAt: string;
}

export interface Supplier {
	id: string;
	name: string;
	phone: string | null;
	address: string | null;
	email: string | null;
	active: boolean;
	_count?: {
		purchases: number;
	};
	purchases?: Purchase[];
	createdAt: string;
	updatedAt: string;
}

export interface Purchase {
	id: string;
	purchaseNumber: number;
	status: 'REGISTRADA' | 'CANCELADA';
	supplierId: string;
	supplier?: {
		id: string;
		name: string;
	};
	total: string;
	_count?: {
		items: number;
	};
	items?: PurchaseItem[];
	createdAt: string;
	updatedAt: string;
}

export interface PurchaseItem {
	id: string;
	purchaseId: string;
	productId: string;
	product?: {
		id: string;
		name: string;
	};
	productNameSnapshot: string;
	unitMeasure: 'UNIDAD' | 'KILOGRAMO' | 'DOCENA' | 'MEDIA_DOCENA' | 'PORCION';
	quantity: string;
	unitCost: string;
	subtotal: string;
	createdAt: string;
}

export interface User {
	id: string;
	name: string;
	email: string;
	role: 'ADMIN' | 'CAJERO';
	active: boolean;
	createdAt: string;
	updatedAt: string;
}
