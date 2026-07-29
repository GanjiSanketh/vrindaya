import { Injectable, signal } from '@angular/core';

export interface RecentItem {
  id: string;
  label: string;
  subtitle: string;
  path: string;
  icon: string;
  openedAt: Date;
}

@Injectable({ providedIn: 'root' })
export class RecentlyOpenedService {
  private readonly storageKey = 'vrindaya_recently_opened';
  private maxItems = 15;

  readonly items = signal<RecentItem[]>(this.load());

  push(item: Omit<RecentItem, 'openedAt'>): void {
    const existing = this.items().filter(i => i.id !== item.id);
    const updated: RecentItem[] = [{ ...item, openedAt: new Date() }, ...existing].slice(0, this.maxItems);
    this.items.set(updated);
    this.save(updated);
  }

  remove(id: string): void {
    const updated = this.items().filter(i => i.id !== id);
    this.items.set(updated);
    this.save(updated);
  }

  clear(): void {
    this.items.set([]);
    try { localStorage.removeItem(this.storageKey); } catch { }
  }

  private load(): RecentItem[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      return (JSON.parse(raw) as RecentItem[]).map(i => ({ ...i, openedAt: new Date(i.openedAt) }));
    } catch {
      return [];
    }
  }

  private save(items: RecentItem[]): void {
    try { localStorage.setItem(this.storageKey, JSON.stringify(items)); } catch { }
  }
}
