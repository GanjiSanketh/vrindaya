import { Injectable, signal } from '@angular/core';
import { PipelineDesign } from '../models/pipeline-designer.model';

const STORAGE_KEY = 'vrindaya_pipeline_designs';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

@Injectable({ providedIn: 'root' })
export class PipelineDesignerService {
  readonly designs = signal<PipelineDesign[]>(this.load());

  private load(): PipelineDesign[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PipelineDesign[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch { /* ignore */ }
    return [];
  }

  private persist(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.designs())); } catch { /* ignore */ }
  }

  save(name: string, nodes: PipelineDesign['nodes'], edges: PipelineDesign['edges']): PipelineDesign {
    const existing = this.designs().find(d => d.name.toLowerCase() === name.toLowerCase());
    const now = new Date().toISOString();
    if (existing) {
      const updated: PipelineDesign = { ...existing, nodes: nodes.map(n => ({ ...n })), edges: edges.map(e => ({ ...e })), updatedAt: now };
      this.designs.update(list => list.map(d => (d.id === updated.id ? updated : d)));
      this.persist();
      return updated;
    }
    const created: PipelineDesign = { id: uid(), name, nodes: nodes.map(n => ({ ...n })), edges: edges.map(e => ({ ...e })), updatedAt: now };
    this.designs.update(list => [created, ...list]);
    this.persist();
    return created;
  }

  remove(id: string): void {
    this.designs.update(list => list.filter(d => d.id !== id));
    this.persist();
  }
}