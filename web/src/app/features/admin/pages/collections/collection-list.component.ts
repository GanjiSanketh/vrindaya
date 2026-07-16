import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HomepageAdminService } from '../../../../core/services/homepage-admin.service';
import { ApiCollection } from '../../../../core/models/collection.model';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

@Component({
  selector:    'app-collection-list',
  standalone:  true,
  imports:     [RouterLink],
  templateUrl: './collection-list.component.html',
  styleUrl:    './collection-list.component.css',
})
export class CollectionListComponent {
  private readonly admin = inject(HomepageAdminService);
  readonly BASE = `/${APP_ROUTES.ADMIN}/collections`;

  readonly collections = signal<ApiCollection[]>([]);
  readonly loading      = signal(true);
  readonly error        = signal<string | null>(null);
  readonly deleteId     = signal<string | null>(null);
  readonly reordering   = signal(false);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const list = await this.admin.getAllCollections();
      this.collections.set([...list].sort((a, b) => a.displayOrder - b.displayOrder));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load collections.');
    } finally {
      this.loading.set(false);
    }
  }

  async moveUp(index: number):   Promise<void> { await this.move(index, index - 1); }
  async moveDown(index: number): Promise<void> { await this.move(index, index + 1); }

  private async move(from: number, to: number): Promise<void> {
    const list = this.collections();
    if (to < 0 || to >= list.length || this.reordering()) return;

    const copy = [...list];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    this.collections.set(copy);

    this.reordering.set(true);
    try {
      await this.admin.reorderCollections(copy.map(c => c.id));
    } finally {
      this.reordering.set(false);
    }
  }

  async toggleActive(col: ApiCollection): Promise<void> {
    const updated = await this.admin.updateCollectionStatus(col.id, !col.active);
    this.collections.update(list => list.map(c => c.id === updated.id ? updated : c));
  }

  confirmDelete(id: string): void { this.deleteId.set(id); }
  cancelDelete():            void { this.deleteId.set(null); }

  async doDelete(): Promise<void> {
    const id = this.deleteId();
    if (!id) return;
    try {
      await this.admin.deleteCollection(id);
      this.collections.update(list => list.filter(c => c.id !== id));
    } finally {
      this.deleteId.set(null);
    }
  }
}
