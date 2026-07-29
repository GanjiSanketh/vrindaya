import { Injectable, signal } from '@angular/core';
import {
  PromptTemplate, PromptTemplateVersion, PromptMarketplace, PromptCategory,
  PROMPT_MARKETPLACES, PROMPT_CATEGORIES, createPromptTemplate, STORAGE_KEY_PROMPTS, DEFAULT_PROMPTS,
} from '../models/prompt-template.model';

@Injectable({ providedIn: 'root' })
export class PromptManagementService {
  readonly templates = signal<PromptTemplate[]>([]);
  readonly loaded = signal(false);

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PROMPTS);
      if (raw) {
        this.templates.set(JSON.parse(raw));
      } else {
        this.templates.set(this.buildDefaults());
      }
    } catch {
      this.templates.set(this.buildDefaults());
    }
    this.loaded.set(true);
  }

  private buildDefaults(): PromptTemplate[] {
    const list: PromptTemplate[] = [];
    for (const mp of PROMPT_MARKETPLACES) {
      for (const cat of PROMPT_CATEGORIES) {
        const key = `${mp}-${cat}`;
        const tpl = createPromptTemplate(mp, cat);
        const defaultContent = DEFAULT_PROMPTS[key];
        if (defaultContent) {
          tpl.content = defaultContent;
          tpl.version = 1;
          tpl.versions = [{
            id: crypto.randomUUID(),
            content: defaultContent,
            version: 1,
            createdAt: new Date().toISOString(),
            createdBy: 'system',
            comment: 'Default template',
          }];
        }
        list.push(tpl);
      }
    }
    return list;
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY_PROMPTS, JSON.stringify(this.templates()));
  }

  getTemplates(marketplace: PromptMarketplace): PromptTemplate[] {
    return this.templates().filter(t => t.marketplace === marketplace);
  }

  getTemplate(marketplace: PromptMarketplace, category: PromptCategory): PromptTemplate | undefined {
    return this.templates().find(t => t.marketplace === marketplace && t.category === category);
  }

  /** Substitute variables in prompt content with provided values. Unknown variables remain as-is. */
  preview(content: string, values: Record<string, string>): string {
    let result = content;
    for (const [key, val] of Object.entries(values)) {
      result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), val);
    }
    return result;
  }

  saveTemplate(tpl: PromptTemplate, comment: string): void {
    const now = new Date().toISOString();
    const existing = this.templates().find(t => t.id === tpl.id);
    if (existing) {
      const newVersion: PromptTemplateVersion = {
        id: crypto.randomUUID(),
        content: tpl.content,
        version: existing.version + 1,
        createdAt: now,
        createdBy: 'admin',
        comment,
      };
      const updated: PromptTemplate = {
        ...tpl,
        version: newVersion.version,
        versions: [...existing.versions, newVersion],
        updatedAt: now,
        updatedBy: 'admin',
      };
      this.templates.update(list => list.map(t => t.id === tpl.id ? updated : t));
    } else {
      const firstVersion: PromptTemplateVersion = {
        id: crypto.randomUUID(),
        content: tpl.content,
        version: 1,
        createdAt: now,
        createdBy: 'admin',
        comment,
      };
      const created: PromptTemplate = {
        ...tpl,
        version: 1,
        versions: [firstVersion],
        createdAt: now,
        updatedAt: now,
        updatedBy: 'admin',
      };
      this.templates.update(list => [...list, created]);
    }
    this.persist();
  }

  restoreVersion(tplId: string, versionId: string, comment: string): void {
    const tpl = this.templates().find(t => t.id === tplId);
    if (!tpl) return;
    const ver = tpl.versions.find(v => v.id === versionId);
    if (!ver) return;
    const now = new Date().toISOString();
    const restored: PromptTemplate = {
      ...tpl,
      content: ver.content,
      version: tpl.version + 1,
      versions: [...tpl.versions, {
        id: crypto.randomUUID(),
        content: ver.content,
        version: tpl.version + 1,
        createdAt: now,
        createdBy: 'admin',
        comment: `Restored from v${ver.version}: ${comment}`,
      }],
      updatedAt: now,
      updatedBy: 'admin',
    };
    this.templates.update(list => list.map(t => t.id === tplId ? restored : t));
    this.persist();
  }

  deleteTemplate(tplId: string): void {
    this.templates.update(list => list.filter(t => t.id !== tplId));
    this.persist();
  }

  resetAll(): void {
    localStorage.removeItem(STORAGE_KEY_PROMPTS);
    this.templates.set(this.buildDefaults());
  }
}
