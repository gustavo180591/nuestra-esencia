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
	createdAt: string;
	updatedAt: string;
}

export interface ProductSaleFormat {
	id: string;
	unitMeasure: 'UNIDAD' | 'DOCENA' | 'MEDIA_DOCENA' | 'KILOGRAMO' | 'PORCION';
	label: string | null;
	price: string;
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
