import { Product } from '../../core/models/product.model';
import { SortOrder } from '../../core/services/product.service';

export function sortProducts(products: Product[], order: SortOrder): Product[] {
  const list = [...products];
  switch (order) {
    case 'rating': return list.sort((a, b) => b.rating - a.rating);
    default:       return list;
  }
}
