import { Injectable, signal, computed } from '@angular/core';
import {
  Recommendation,
  RecommendationFilter,
  RECOMMENDATION_TYPES,
  PRIORITY_CONFIG,
  generateMockRecommendations,
} from '../models/recommendation-center.model';

const STORAGE_KEY = 'vrindaya_recommendations';

@Injectable({ providedIn: 'root' })
export class RecommendationCenterService {
  private _recommendations = signal<Recommendation[]>(this.load());
  private _filter = signal<RecommendationFilter>({
    types: [],
    priorities: [],
    search: '',
  });

  readonly recommendations = computed(() => this._recommendations());
  readonly filter = computed(() => this._filter());

  readonly filteredRecommendations = computed(() => {
    const recs = this._recommendations();
    const filter = this._filter();
    return recs.filter(r => {
      if (r.dismissed) return false;
      if (filter.types.length && !filter.types.includes(r.type)) return false;
      if (filter.priorities.length && !filter.priorities.includes(r.priority)) return false;
      if (filter.search) {
        const s = filter.search.toLowerCase();
        if (!r.title.toLowerCase().includes(s) &&
            !r.description.toLowerCase().includes(s) &&
            !r.tags.some(t => t.toLowerCase().includes(s))) {
          return false;
        }
      }
      return true;
    });
  });

  readonly highPriority = computed(() => this.filteredRecommendations().filter(r => r.priority === 'high'));
  readonly mediumPriority = computed(() => this.filteredRecommendations().filter(r => r.priority === 'medium'));
  readonly lowPriority = computed(() => this.filteredRecommendations().filter(r => r.priority === 'low'));

  readonly types = RECOMMENDATION_TYPES;
  readonly priorityConfig = PRIORITY_CONFIG;

  private load(): Recommendation[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Recommendation[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch { /* ignore */ }
    return generateMockRecommendations();
  }

  private persist(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this._recommendations())); } catch { /* ignore */ }
  }

  setFilter(filter: Partial<RecommendationFilter>): void {
    this._filter.update(f => ({ ...f, ...filter }));
  }

  clearFilters(): void {
    this._filter.set({ types: [], priorities: [], search: '' });
  }

  dismiss(id: string): void {
    this._recommendations.update(list =>
      list.map(r => r.id === id ? { ...r, dismissed: true } : r)
    );
    this.persist();
  }

  dismissAll(): void {
    this._recommendations.update(list => list.map(r => ({ ...r, dismissed: true })));
    this.persist();
  }

  restore(id: string): void {
    this._recommendations.update(list =>
      list.map(r => r.id === id ? { ...r, dismissed: false } : r)
    );
    this.persist();
  }

  reset(): void {
    this._recommendations.set(generateMockRecommendations());
    this.persist();
  }

  getById(id: string): Recommendation | undefined {
    return this._recommendations().find(r => r.id === id);
  }
}