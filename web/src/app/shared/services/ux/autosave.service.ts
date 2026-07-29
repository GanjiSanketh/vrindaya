import { Injectable, signal, type OnDestroy } from '@angular/core';

export interface AutosaveEntry {
  key: string;
  label: string;
  data: unknown;
  savedAt: Date;
}

@Injectable({ providedIn: 'root' })
export class AutosaveService implements OnDestroy {
  private readonly STORAGE_PREFIX = 'vrindaya_autosave_';
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly saving = signal(false);
  readonly lastSaved = signal<Date | null>(null);
  readonly saveCount = signal(0);

  schedule(key: string, label: string, data: unknown, delayMs = 2000): void {
    if (this.timer) clearTimeout(this.timer);
    this.saving.set(true);
    this.timer = setTimeout(() => {
      this.save(key, label, data);
    }, delayMs);
  }

  saveNow(key: string, label: string, data: unknown): void {
    if (this.timer) clearTimeout(this.timer);
    this.save(key, label, data);
  }

  private save(key: string, label: string, data: unknown): void {
    try {
      const entry: AutosaveEntry = { key, label, data, savedAt: new Date() };
      localStorage.setItem(this.STORAGE_PREFIX + key, JSON.stringify(entry));
      this.lastSaved.set(new Date());
      this.saveCount.update(c => c + 1);
    } catch { }
    this.saving.set(false);
  }

  getDraft(key: string): AutosaveEntry | null {
    try {
      const raw = localStorage.getItem(this.STORAGE_PREFIX + key);
      if (!raw) return null;
      const entry = JSON.parse(raw) as AutosaveEntry;
      entry.savedAt = new Date(entry.savedAt);
      return entry;
    } catch {
      return null;
    }
  }

  clearDraft(key: string): void {
    try { localStorage.removeItem(this.STORAGE_PREFIX + key); } catch { }
  }

  getAllDrafts(): AutosaveEntry[] {
    const drafts: AutosaveEntry[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(this.STORAGE_PREFIX)) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const entry = JSON.parse(raw) as AutosaveEntry;
            entry.savedAt = new Date(entry.savedAt);
            drafts.push(entry);
          }
        }
      }
    } catch { }
    return drafts.sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());
  }

  cancel(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    this.saving.set(false);
  }

  ngOnDestroy(): void {
    this.cancel();
  }
}
