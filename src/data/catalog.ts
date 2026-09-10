import products from "./products.json";
import { czProducts, plProducts } from "./marketProducts";
import type { Product } from "./productTypes";

export const marketCatalog: Product[] = [...plProducts, ...czProducts];
export const catalog: Product[] = products as Product[];
