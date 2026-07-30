import { Component, inject, signal, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CategoryAdminService, AdminCategory } from '../../services/category-admin.service';
import { APP_ROUTES } from '../../../../core/constants/routes.constants';

@Component({
  selector:    'app-category-list',
  standalone:  true,
  imports:     [RouterLink],
  templateUrl: './category-list.component.html',
  styleUrl:    './category-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryListComponent {
  private readonly admin = inject(CategoryAdminService);
  readonly BASE = `/${APP_ROUTES.ADMIN}/categories`;

  readonly categories = signal<AdminCategory[]>([]);
  readonly loading    = signal(true);
  readonly error      = signal<string | null>(null);
  readonly deleteId   = signal<string | null>(null);
  readonly reordering = signal(false);

  constructor() {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const list = await this.admin.getAll();
      this.categories.set([...list].sort((a, b) => a.displayOrder - b.displayOrder));
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Could not load categories.');
    } finally {
      this.loading.set(false);
    }
  }

  async moveUp(index: number):   Promise<void> { await this.move(index, index - 1); }
  async moveDown(index: number): Promise<void> { await this.move(index, index + 1); }

  private async move(from: number, to: number): Promise<void> {
    const list = this.categories();
    if (to < 0 || to >= list.length || this.reordering()) return;

    const copy = [...list];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    this.categories.set(copy);

    this.reordering.set(true);
    try {
      await this.admin.reorder(copy.map(c => c.id));
    } finally {
      this.reordering.set(false);
    }
  }

  async toggleActive(cat: AdminCategory): Promise<void> {
    const updated = await this.admin.updateStatus(cat.id, !cat.active);
    this.categories.update(list => list.map(c => c.id === updated.id ? updated : c));
  }

  confirmDelete(id: string): void { this.deleteId.set(id); }
  cancelDelete():            void { this.deleteId.set(null); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.cancelDelete(); }

  async doDelete(): Promise<void> {
    const id = this.deleteId();
    if (!id) return;
    try {
      await this.admin.delete(id);
      this.categories.update(list => list.filter(c => c.id !== id));
    } finally {
      this.deleteId.set(null);
    }
  }
}
