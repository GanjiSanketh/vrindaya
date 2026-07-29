import { Injectable, signal } from '@angular/core';
import { AutosaveService, type AutosaveEntry } from './autosave.service';

export interface DraftNotification {
  entry: AutosaveEntry;
  dismissed: boolean;
}

@Injectable({ providedIn: 'root' })
export class DraftRecoveryService {
  private readonly recoveryKey = 'vrindaya_draft_recovery_notified';

  readonly pendingDrafts = signal<DraftNotification[]>([]);
  readonly showRecovery = signal(false);

  constructor(private readonly autosave: AutosaveService) {
    this.check();
  }

  private check(): void {
    const drafts = this.autosave.getAllDrafts().filter(d => {
      const age = Date.now() - d.savedAt.getTime();
      return age < 24 * 60 * 60 * 1000;
    });

    const notified = this.getNotified();
    const pending = drafts.filter(d => !notified.has(d.key));

    if (pending.length > 0) {
      this.pendingDrafts.set(pending.map(d => ({ entry: d, dismissed: false })));
      this.showRecovery.set(true);
    }
  }

  restore(key: string): AutosaveEntry | null {
    const entry = this.autosave.getDraft(key);
    if (entry) this.markNotified(key);
    return entry;
  }

  dismiss(key: string): void {
    this.markNotified(key);
    this.pendingDrafts.update(list => list.filter(d => d.entry.key !== key));
    if (this.pendingDrafts().length === 0) this.showRecovery.set(false);
  }

  dismissAll(): void {
    for (const d of this.pendingDrafts()) this.markNotified(d.entry.key);
    this.pendingDrafts.set([]);
    this.showRecovery.set(false);
  }

  clearAndDismiss(key: string): void {
    this.dismiss(key);
    this.autosave.clearDraft(key);
  }

  private markNotified(key: string): void {
    const set = this.getNotified();
    set.add(key);
    try { localStorage.setItem(this.recoveryKey, JSON.stringify([...set])); } catch { }
  }

  private getNotified(): Set<string> {
    try {
      const raw = localStorage.getItem(this.recoveryKey);
      return new Set<string>(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  }
}
