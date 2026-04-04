export interface Product {
	id: string;
	name: string;
	description: string | null;
	status: string;
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
	unitMeasure: string;
	label: string | null;
	price: string;
	active: boolean;
}
