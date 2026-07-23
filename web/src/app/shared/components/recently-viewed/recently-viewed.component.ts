import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule }             from '@angular/common';
import { RecentlyViewedService }    from '../../../core/services/recently-viewed.service';
import { ProductCard }              from '../product-card/product-card';
import { ScrollRevealDirective }    from '../../directives/scroll-reveal.directive';

@Component({
  selector: 'app-recently-viewed',
  standalone: true,
  imports: [CommonModule, ProductCard, ScrollRevealDirective],
  templateUrl: './recently-viewed.component.html',
  styleUrl: './recently-viewed.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentlyViewedComponent {
  readonly svc = inject(RecentlyViewedService);
}
