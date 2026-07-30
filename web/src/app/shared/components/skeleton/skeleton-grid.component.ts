import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule }    from '@angular/common';
import { ProductCardSkeletonComponent } from './product-card-skeleton.component';

@Component({
  selector: 'app-skeleton-grid',
  standalone: true,
  imports: [CommonModule, ProductCardSkeletonComponent],
  template: `
    <div class="sg-grid">
      @for (_ of items(); track $index) {
        <app-product-card-skeleton />
      }
    </div>
  `,
  styleUrl: './skeleton-grid.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonGridComponent {
  readonly count = input<number>(8);
  readonly items = computed(() => Array.from({ length: this.count() }));
}
