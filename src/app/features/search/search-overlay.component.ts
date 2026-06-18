import {
  Component, effect, HostListener, inject,
  OnDestroy, OnInit, PLATFORM_ID, signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule }                     from '@angular/forms';
import { Router }                          from '@angular/router';
import { Subject, Subscription }           from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { SearchService }  from '../../core/services/search.service';
import { ProductService } from '../../core/services/product.service';
import { Product }        from '../../core/models/product.model';

@Component({
  selector: 'app-search-overlay',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-overlay.component.html',
  styleUrl:    './search-overlay.component.css',
})
export class SearchOverlayComponent implements OnInit, OnDestroy {
  readonly svc     = inject(SearchService);
  private readonly prodSvc = inject(ProductService);
  private readonly router  = inject(Router);
  private readonly pid     = inject(PLATFORM_ID);

  readonly query   = signal('');
  readonly results = signal<Product[]>([]);

  readonly hints = ['Floral', 'Indigo', '3-Piece', 'Kurta Set', 'Embroidered', 'Pastel'];

  private readonly query$ = new Subject<string>();
  private sub!: Subscription;

  constructor() {
    // Scroll-lock and autofocus when overlay opens
    effect(() => {
      const open = this.svc.isOpen();
      if (isPlatformBrowser(this.pid)) {
        document.body.style.overflow = open ? 'hidden' : '';
        if (open) {
          setTimeout(() => {
            (document.querySelector('.so-input') as HTMLInputElement)?.focus();
          }, 60);
        }
      }
    });
  }

  ngOnInit(): void {
    this.sub = this.query$
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe(q => this.runSearch(q));
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  @HostListener('document:keydown.escape')
  onEsc(): void { if (this.svc.isOpen()) this.close(); }

  onInput(value: string): void {
    this.query.set(value);
    this.query$.next(value);
  }

  private runSearch(q: string): void {
    if (!q.trim()) { this.results.set([]); return; }
    const lower = q.trim().toLowerCase();
    this.results.set(
      this.prodSvc.allProducts
        .filter(p =>
          p.name.toLowerCase().includes(lower)            ||
          p.category.toLowerCase().includes(lower)        ||
          (p.description ?? '').toLowerCase().includes(lower)
        )
        .slice(0, 8)
    );
  }

  navigate(p: Product): void {
    this.router.navigate(['/category', p.categoryId]);
    this.close();
  }

  onBackdropClick(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('so-backdrop')) this.close();
  }

  close(): void {
    this.query.set('');
    this.results.set([]);
    this.svc.close();
  }
}
