import { Component } from '@angular/core';

@Component({
  selector: 'app-product-card-skeleton',
  standalone: true,
  template: `
    <div class="skel-card">
      <div class="skel-img shimmer"></div>
      <div class="skel-body">
        <div class="skel-line skel-line--name shimmer"></div>
        <div class="skel-line skel-line--sub shimmer"></div>
        <div class="skel-price-row">
          <div class="skel-line skel-line--price shimmer"></div>
          <div class="skel-line skel-line--badge shimmer"></div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './product-card-skeleton.component.css',
})
export class ProductCardSkeletonComponent {}
