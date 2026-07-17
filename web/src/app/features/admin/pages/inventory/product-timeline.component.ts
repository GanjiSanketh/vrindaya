import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { InventoryService } from '../../services/inventory.service';
import { StockMovement, StockMovementType, MOVEMENT_TYPE_LABELS } from '../../models/inventory.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

interface TimelineDay {
  date: string;
  movements: StockMovement[];
}

const MOVEMENT_ICONS: Record<StockMovementType, string> = {
  Purchase: 'bi-box-seam',
  Sale: 'bi-cart-check',
  Return: 'bi-arrow-return-left',
  Damage: 'bi-exclamation-triangle',
  ManualAdjustment: 'bi-sliders',
  StockCorrection: 'bi-clipboard-check',
  Transfer: 'bi-arrow-left-right',
};

@Component({
  selector:    'app-product-timeline',
  standalone:  true,
  imports:     [RouterLink],
  templateUrl: './product-timeline.component.html',
  styleUrl:    './product-timeline.component.css',
})
export class ProductTimelineComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly svc   = inject(InventoryService);

  readonly BASE = `/${APP_ROUTES.ADMIN}/inventory`;
  readonly MOVEMENT_TYPE_LABELS = MOVEMENT_TYPE_LABELS;

  productId = '';
  productName: string | null = null;

  readonly movements = signal<StockMovement[]>([]);
  readonly loading   = signal(true);
  readonly error     = signal<string | null>(null);
  readonly hasNext     = signal(false);
  readonly hasPrevious = signal(false);

  private currentCursor: string | null = null;
  private nextCursor: string | null = null;
  private history: (string | null)[] = [];

  readonly days = computed<TimelineDay[]>(() => {
    const byDay = new Map<string, StockMovement[]>();
    for (const m of this.movements()) {
      const day = m.createdAt.slice(0, 10);
      const list = byDay.get(day) ?? [];
      list.push(m);
      byDay.set(day, list);
    }
    return [...byDay.entries()].map(([date, movements]) => ({ date, movements }));
  });

  constructor() {
    this.productId = this.route.snapshot.paramMap.get('productId') ?? '';
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const variants = await this.svc.getVariantsByProduct(this.productId);
      this.productName = variants[0]?.productName ?? null;

      const page = await this.svc.getMovements(this.currentCursor, 20, { productId: this.productId });
      this.movements.set(page.items);
      this.nextCursor = page.nextCursor;
      this.hasNext.set(!!page.nextCursor);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load this product’s timeline.');
    } finally {
      this.loading.set(false);
    }
  }

  async nextPage(): Promise<void> {
    if (!this.hasNext()) return;
    this.history.push(this.currentCursor);
    this.currentCursor = this.nextCursor;
    this.hasPrevious.set(true);
    await this.load();
  }

  async previousPage(): Promise<void> {
    if (this.history.length === 0) return;
    this.currentCursor = this.history.pop() ?? null;
    this.hasPrevious.set(this.history.length > 0);
    await this.load();
  }

  icon(type: StockMovementType): string {
    return MOVEMENT_ICONS[type];
  }

  /** 'up' | 'down' | 'flat' — drives the dot's color; icon stays fixed per type. */
  direction(m: StockMovement): 'up' | 'down' | 'flat' {
    return m.delta > 0 ? 'up' : m.delta < 0 ? 'down' : 'flat';
  }

  formatDay(date: string): string {
    return new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
}
