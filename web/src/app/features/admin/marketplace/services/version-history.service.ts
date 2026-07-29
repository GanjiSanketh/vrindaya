import { Injectable, signal } from '@angular/core';
import { VersionEntry, STORAGE_KEY_VERSIONS, GENERATION_TYPE_LABELS } from '../models/version-history.model';

@Injectable({ providedIn: 'root' })
export class VersionHistoryService {
  readonly all = signal<VersionEntry[]>([]);
  readonly loaded = signal(false);

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_VERSIONS);
      if (raw) { this.all.set(JSON.parse(raw)); }
    } catch { /* ignore */ }
    this.loaded.set(true);
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY_VERSIONS, JSON.stringify(this.all()));
  }

  add(entry: VersionEntry): void {
    this.all.update(list => [entry, ...list]);
    this.persist();
  }

  get(id: string): VersionEntry | undefined {
    return this.all().find(v => v.id === id);
  }

  update(id: string, partial: Partial<VersionEntry>): void {
    this.all.update(list => list.map(v => v.id === id ? { ...v, ...partial } : v));
    this.persist();
  }

  delete(id: string): void {
    this.all.update(list => list.filter(v => v.id !== id));
    this.persist();
  }

  deleteMultiple(ids: string[]): void {
    const set = new Set(ids);
    this.all.update(list => list.filter(v => !set.has(v.id)));
    this.persist();
  }

  clearAll(): void {
    this.all.set([]);
    localStorage.removeItem(STORAGE_KEY_VERSIONS);
  }

  /** Create a deep duplicate entry. */
  duplicate(id: string): VersionEntry | undefined {
    const original = this.get(id);
    if (!original) return undefined;
    const dup: VersionEntry = {
      ...JSON.parse(JSON.stringify(original)),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      label: `${original.label} (Copy)`,
      approved: false,
    };
    this.add(dup);
    return dup;
  }

  /** Compare two versions: return a list of field diffs. */
  compare(idA: string, idB: string): VersionDiff[] {
    const a = this.get(idA);
    const b = this.get(idB);
    if (!a || !b) return [];

    const diffs: VersionDiff[] = [];
    const allKeys = new Set([
      ...Object.keys(a.generatedContent),
      ...Object.keys(b.generatedContent),
      ...Object.keys(a.inputSnapshot),
      ...Object.keys(b.inputSnapshot),
    ]);

    for (const key of allKeys) {
      const valA = a.generatedContent[key] ?? a.inputSnapshot[key];
      const valB = b.generatedContent[key] ?? b.inputSnapshot[key];
      const strA = JSON.stringify(valA);
      const strB = JSON.stringify(valB);
      if (strA !== strB) {
        diffs.push({ field: key, valueA: strA, valueB: strB, changed: true });
      } else {
        diffs.push({ field: key, valueA: strA, valueB: strB, changed: false });
      }
    }
    return diffs.sort((x, y) => x.field.localeCompare(y.field));
  }

  /** Export versions as JSON string. */
  exportJson(ids?: string[]): string {
    const list = ids ? this.all().filter(v => ids.includes(v.id)) : this.all();
    return JSON.stringify(list, null, 2);
  }

  /** Export versions as plain text summary. */
  exportText(ids?: string[]): string {
    const list = ids ? this.all().filter(v => ids.includes(v.id)) : this.all();
    return list.map(v => {
      const lines = [
        `=== ${v.label} ===`,
        `Date: ${new Date(v.createdAt).toLocaleString('en-IN')}`,
        `Type: ${GENERATION_TYPE_LABELS[v.generationType] || v.generationType}`,
        `Provider: ${v.providerLabel} / ${v.model}`,
        `Prompt: ${v.prompt}`,
        `--- Content ---`,
        ...Object.entries(v.generatedContent).map(([k, val]) => {
          const str = Array.isArray(val) ? val.join(', ') : String(val);
          return `${k}: ${str}`;
        }),
        ``,
      ];
      return lines.join('\n');
    }).join('\n');
  }
}

export interface VersionDiff {
  field: string;
  valueA: string;
  valueB: string;
  changed: boolean;
}
