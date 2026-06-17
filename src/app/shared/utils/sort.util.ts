import { Product } from '../../core/models/product.model';
import { SortOrder } from '../../core/services/product.service';

export function sortProducts(products: Product[], order: SortOrder): Product[] {
  const list = [...products];
  switch (order) {
    case 'price-asc':  return list.sort((a, b) => a.price - b.price);
    case 'price-desc': return list.sort((a, b) => b.price - a.price);
    case 'rating':     return list.sort((a, b) => b.rating - a.rating);
    default:           return list;
  }
}
