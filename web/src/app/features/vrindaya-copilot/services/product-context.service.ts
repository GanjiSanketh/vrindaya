import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ProductContext } from '../models/product-context.model';

@Injectable({ providedIn: 'root' })
export class ProductContextService {
  getSelectedProductContext(selectedProduct: Partial<ProductContext>): Observable<ProductContext> {
    return of({
      productId: selectedProduct.productId ?? '',
      name: selectedProduct.name ?? '',
      category: selectedProduct.category ?? '',
      subCategory: selectedProduct.subCategory ?? '',
      fabric: selectedProduct.fabric ?? '',
      pattern: selectedProduct.pattern ?? '',
      sleeves: selectedProduct.sleeves ?? '',
      neck: selectedProduct.neck ?? '',
      occasion: selectedProduct.occasion ?? '',
      season: selectedProduct.season ?? '',
      price: selectedProduct.price ?? 0,
      discount: selectedProduct.discount ?? 0,
      brand: selectedProduct.brand ?? '',
      description: selectedProduct.description ?? '',
      features: selectedProduct.features ?? [],
      keywords: selectedProduct.keywords ?? [],
      imageUrls: selectedProduct.imageUrls ?? [],
    });
  }

  getMockProductContext(): Observable<ProductContext> {
    return of({
      productId: 'P-1001',
      name: 'Silk Blend Anarkali',
      category: 'Ethnic Wear',
      subCategory: 'Anarkali',
      fabric: 'Silk Blend',
      pattern: 'Embellished',
      sleeves: 'Three-Quarter',
      neck: 'Round',
      occasion: 'Festive',
      season: 'All Season',
      price: 4599,
      discount: 15,
      brand: 'Vrindaya',
      description: 'An elegant silk blend anarkali with intricate embellishments, perfect for festive occasions.',
      features: ['Breathable fabric', 'Flattering silhouette', 'Easy care'],
      keywords: ['silk anarkali', 'festive wear', 'ethnic dress', 'embellished'],
      imageUrls: ['assets/products/anarkali-1.jpg', 'assets/products/anarkali-2.jpg'],
    });
  }
}