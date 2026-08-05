import { Component, ChangeDetectionStrategy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../shared/services/toast.service';
import { RecommendationCenterService } from './recommendation-center.service';
import {
  Recommendation,
  RecommendationType,
  RecommendationPriority,
  RECOMMENDATION_TYPES,
  PRIORITY_CONFIG,
} from './models/recommendation-center.model';

@Component({
  selector: 'app-recommendation-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="rc-page">
      <div class="rc-header">
        <div>
          <h1 class="rc-title"><i class="bi bi-lightbulb"></i> Recommendation Center</h1>
          <p class="rc-desc">AI-generated growth recommendations prioritized by impact. Filter, dismiss, or act on each insight.</p>
        </div>
        <div class="rc-actions">
          <button class="btn btn-outline-secondary rc-btn" (click)="reset()" title="Restore all recommendations">
            <i class="bi bi-arrow-counterclockwise"></i> Reset All
          </button>
        </div>
      </div>

      <div class="rc-toolbar">
        <div class="rc-search">
          <i class="bi bi-search"></i>
          <input type="text" class="form-control" placeholder="Search recommendations..." [(ngModel)]="searchInput" (ngModelChange)="onSearch($event)">
        </div>
        <div class="rc-filters">
          <div class="rc-filter-group">
            <label class="rc-filter-label">Type</label>
            <div class="rc-filter-chips">
              @for (t of types; track t.value) {
                <button class="rc-chip" [class.active]="isTypeSelected(t.value)" (click)="toggleType(t.value)">
                  <i class="bi {{ t.icon }}"></i> {{ t.label }}
                </button>
              }
            </div>
          </div>
          <div class="rc-filter-group">
            <label class="rc-filter-label">Priority</label>
            <div class="rc-filter-chips">
              @for (p of priorityKeys; track p) {
                <button class="rc-chip rc-chip-priority" [class.active]="isPrioritySelected(p)" (click)="togglePriority(p)" [style.border-color]="priorityConfig[p].color" [style.color]="priorityConfig[p].color">
                  {{ priorityConfig[p].label }}
                </button>
              }
            </div>
          </div>
          @if (hasActiveFilters()) {
            <button class="btn btn-sm btn-outline-secondary rc-clear" (click)="clearFilters()">
              <i class="bi bi-x-lg"></i> Clear Filters
            </button>
          }
        </div>
      </div>

      <div class="rc-stats">
        <div class="rc-stat rc-stat-high">
          <span class="rc-stat-value">{{ highPriority().length }}</span>
          <span class="rc-stat-label">High Priority</span>
        </div>
        <div class="rc-stat rc-stat-medium">
          <span class="rc-stat-value">{{ mediumPriority().length }}</span>
          <span class="rc-stat-label">Medium Priority</span>
        </div>
        <div class="rc-stat rc-stat-low">
          <span class="rc-stat-value">{{ lowPriority().length }}</span>
          <span class="rc-stat-label">Low Priority</span>
        </div>
        <div class="rc-stat rc-stat-total">
          <span class="rc-stat-value">{{ totalRevenue() }}</span>
          <span class="rc-stat-label">Est. Revenue Potential</span>
        </div>
      </div>

      @if (filteredRecommendations().length > 0) {
        <div class="rc-grid">
          @for (rec of filteredRecommendations(); track rec.id) {
            <div class="rc-card" [class.rc-card-priority]="rec.priority">
              <div class="rc-card-header">
                <div class="rc-card-type" [style.background]="typeColor(rec.type)">
                  <i class="bi {{ typeIcon(rec.type) }}"></i>
                </div>
                <div class="rc-card-priority-badge" [class]="priorityBadgeClass(rec.priority)">
                  {{ priorityConfig[rec.priority].label }}
                </div>
              </div>

              <h3 class="rc-card-title">{{ rec.title }}</h3>
              <p class="rc-card-desc">{{ rec.description }}</p>

              <div class="rc-card-meta">
                <div class="rc-meta-item">
                  <i class="bi bi-graph-up-arrow"></i>
                  <span>{{ rec.impact }}</span>
                </div>
                <div class="rc-meta-item">
                  <i class="bi bi-clock"></i>
                  <span>{{ rec.timeframe }}</span>
                </div>
                <div class="rc-meta-item">
                  <i class="bi bi-people"></i>
                  <span>{{ rec.estimatedReach }}</span>
                </div>
                <div class="rc-meta-item">
                  <i class="bi bi-currency-rupee"></i>
                  <span>{{ rec.estimatedRevenue }}</span>
                </div>
              </div>

              <div class="rc-card-tags">
                @for (tag of rec.tags; track tag) {
                  <span class="rc-tag">{{ tag }}</span>
                }
              </div>

              <div class="rc-card-actions">
                <button class="btn btn-sm rc-btn-primary" (click)="openDetail(rec)">
                  <i class="bi bi-arrow-right"></i> View Details
                </button>
                <button class="btn btn-sm btn-outline-secondary rc-btn-dismiss" (click)="dismiss(rec.id)">
                  <i class="bi bi-x"></i> Dismiss
                </button>
              </div>
            </div>
          }
        </div>
      } @else {
        <div class="rc-empty">
          <i class="bi bi-funnel"></i>
          <h3>No recommendations match</h3>
          <p>Try adjusting your filters or search terms.</p>
          <button class="btn btn-outline-secondary" (click)="clearFilters()">Clear All Filters</button>
        </div>
      }

      <!-- Detail Modal -->
      @if (selectedRecommendation()) {
        <div class="rc-modal-overlay" (click)="closeDetail()">
          <div class="rc-modal" (click)="$event.stopPropagation()">
            <div class="rc-modal-header">
              <div class="rc-modal-type" [style.background]="typeColor(selectedRecommendation()!.type)">
                <i class="bi {{ typeIcon(selectedRecommendation()!.type) }}"></i>
              </div>
              <div>
                <span class="rc-modal-priority" [class]="priorityBadgeClass(selectedRecommendation()!.priority)">
                  {{ priorityConfig[selectedRecommendation()!.priority].label }} Priority
                </span>
                <h2 class="rc-modal-title">{{ selectedRecommendation()!.title }}</h2>
              </div>
              <button class="rc-modal-close" (click)="closeDetail()"><i class="bi bi-x-lg"></i></button>
            </div>

            <div class="rc-modal-body">
              <div class="rc-modal-section">
                <h4><i class="bi bi-info-circle"></i> Overview</h4>
                <p>{{ selectedRecommendation()!.description }}</p>
                <p class="rc-reasoning"><strong>Reasoning:</strong> {{ selectedRecommendation()!.reasoning }}</p>
              </div>

              <div class="rc-modal-section">
                <h4><i class="bi bi-list-check"></i> Action Items</h4>
                <ol>
                  @for (item of selectedRecommendation()!.actionItems; track item) {
                    <li>{{ item }}</li>
                  }
                </ol>
              </div>

              <div class="rc-modal-section">
                <h4><i class="bi bi-graph-up"></i> Supporting Data</h4>
                <div class="rc-data-grid">
                  @for (dp of selectedRecommendation()!.dataPoints; track dp.label) {
                    <div class="rc-data-item">
                      <span class="rc-data-label">{{ dp.label }}</span>
                      <span class="rc-data-value">{{ dp.value }}</span>
                    </div>
                  }
                </div>
              </div>

              <div class="rc-modal-section">
                <h4><i class="bi bi-tags"></i> Tags</h4>
                <div class="rc-tags">
                  @for (tag of selectedRecommendation()!.tags; track tag) {
                    <span class="rc-tag">{{ tag }}</span>
                  }
                </div>
              </div>
            </div>

            <div class="rc-modal-footer">
              <button class="btn btn-outline-secondary" (click)="dismiss(selectedRecommendation()!.id); closeDetail()">
                <i class="bi bi-x"></i> Dismiss
              </button>
              <button class="btn btn-primary" (click)="closeDetail()">
                <i class="bi bi-check"></i> Got It
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './recommendation-center.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecommendationCenterComponent {
  private readonly toast = inject(ToastService);
  private readonly service = inject(RecommendationCenterService);

  readonly filteredRecommendations = computed(() => this.service.filteredRecommendations());
  readonly highPriority = computed(() => this.service.highPriority());
  readonly mediumPriority = computed(() => this.service.mediumPriority());
  readonly lowPriority = computed(() => this.service.lowPriority());
  readonly types = RECOMMENDATION_TYPES;
  readonly priorityConfig = PRIORITY_CONFIG;
  readonly priorityKeys = Object.keys(PRIORITY_CONFIG) as RecommendationPriority[];

  searchInput = '';
  selectedRecommendation = signal<Recommendation | null>(null);

  totalRevenue = computed(() => {
    const recs = this.filteredRecommendations();
    // Extract numeric values from estimatedRevenue strings
    let total = 0;
    recs.forEach(r => {
      const match = r.estimatedRevenue.match(/₹([\d.]+)([LK])/);
      if (match) {
        const val = parseFloat(match[1]);
        const mult = match[2] === 'L' ? 100000 : 1000;
        total += val * mult;
      }
    });
    if (total >= 100000) return `₹${(total / 100000).toFixed(1)}L`;
    if (total >= 1000) return `₹${(total / 1000).toFixed(0)}K`;
    return `₹${total}`;
  });

  typeColor(type: RecommendationType): string {
    return this.types.find(t => t.value === type)?.color ?? '#0f6f84';
  }

  typeIcon(type: RecommendationType): string {
    return this.types.find(t => t.value === type)?.icon ?? 'bi-lightbulb';
  }

  priorityBadgeClass(priority: RecommendationPriority): string {
    return `rc-priority-${priority}`;
  }

  isTypeSelected(type: RecommendationType): boolean {
    return this.service.filter().types.includes(type);
  }

  isPrioritySelected(priority: RecommendationPriority): boolean {
    return this.service.filter().priorities.includes(priority);
  }

  hasActiveFilters(): boolean {
    const f = this.service.filter();
    return f.types.length > 0 || f.priorities.length > 0 || f.search.length > 0;
  }

  onSearch(value: string): void {
    this.searchInput = value;
    this.service.setFilter({ search: value });
  }

  toggleType(type: RecommendationType): void {
    const current = this.service.filter().types;
    const updated = current.includes(type) ? current.filter(t => t !== type) : [...current, type];
    this.service.setFilter({ types: updated });
  }

  togglePriority(priority: RecommendationPriority): void {
    const current = this.service.filter().priorities;
    const updated = current.includes(priority) ? current.filter(p => p !== priority) : [...current, priority];
    this.service.setFilter({ priorities: updated });
  }

  clearFilters(): void {
    this.searchInput = '';
    this.service.clearFilters();
  }

  openDetail(rec: Recommendation): void {
    this.selectedRecommendation.set(rec);
  }

  closeDetail(): void {
    this.selectedRecommendation.set(null);
  }

  dismiss(id: string): void {
    this.service.dismiss(id);
    this.toast.info('Recommendation dismissed');
  }

  reset(): void {
    if (confirm('Restore all dismissed recommendations?')) {
      this.service.reset();
      this.toast.success('All recommendations restored');
    }
  }
}