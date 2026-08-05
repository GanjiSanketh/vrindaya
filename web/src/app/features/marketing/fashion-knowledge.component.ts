import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface FashionKnowledgeItem {
  id: string;
  category: string;
  title: string;
  description: string;
  createdAt: string;
}

@Component({
  selector: 'app-fashion-knowledge',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="fk-page">
      <div class="fk-header">
        <h1 class="fk-title">Fashion Knowledge</h1>
        <p class="fk-desc">Store and manage reusable fashion information across categories.</p>
      </div>

      <div class="fk-actions">
        <button class="fk-btn fk-btn-primary" (click)="onOpenCreate()">
          <i class="bi bi-plus-lg"></i> Add Entry
        </button>
      </div>

      <div class="fk-categories">
        @for (cat of categories(); track cat) {
          <div class="fk-category-card">
            <div class="fk-category-header">
              <h3 class="fk-category-title">{{ cat }}</h3>
              <span class="fk-category-count">{{ itemsByCategory(cat)().length }}</span>
            </div>
            <div class="fk-category-list">
              @for (item of itemsByCategory(cat)(); track item.id) {
                <div class="fk-item">
                  <div class="fk-item-body">
                    <span class="fk-item-title">{{ item.title }}</span>
                    <p class="fk-item-desc">{{ item.description }}</p>
                  </div>
                  <div class="fk-item-actions">
                    <button class="fk-icon-btn" (click)="onEdit(item)" title="Edit">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="fk-icon-btn fk-icon-danger" (click)="onDelete(item.id)" title="Delete">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              }
              @if (itemsByCategory(cat)().length === 0) {
                <p class="fk-empty">No entries yet.</p>
              }
            </div>
          </div>
        }
      </div>

      @if (showModal()) {
        <div class="fk-modal-overlay" (click)="onCloseModal()">
          <div class="fk-modal" (click)="$event.stopPropagation()">
            <h2 class="fk-modal-title">{{ editingItem() ? 'Edit Entry' : 'Add Entry' }}</h2>
            <div class="fk-field">
              <label class="fk-label">Category</label>
              <select class="fk-input" [(ngModel)]="formCategory" name="fkCategory">
                @for (cat of categories(); track cat) {
                  <option value="{{ cat }}">{{ cat }}</option>
                }
              </select>
            </div>
            <div class="fk-field">
              <label class="fk-label">Title</label>
              <input type="text" class="fk-input" [(ngModel)]="formTitle" name="fkTitle" placeholder="Entry title" />
            </div>
            <div class="fk-field">
              <label class="fk-label">Description</label>
              <textarea class="fk-textarea" [(ngModel)]="formDescription" name="fkDescription" rows="4" placeholder="Describe the fashion knowledge..."></textarea>
            </div>
            <div class="fk-modal-actions">
              <button class="fk-btn fk-btn-secondary" (click)="onCloseModal()">Cancel</button>
              <button class="fk-btn fk-btn-primary" (click)="onSave()">
                {{ editingItem() ? 'Update' : 'Save' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './fashion-knowledge.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FashionKnowledgeComponent {
  categories = signal<string[]>([
    'Seasonal Fashion',
    'Trending Colours',
    'Trending Fabrics',
    'Trending Prints',
    "Women's Styling Tips",
    'Office Wear',
    'Wedding Wear',
    'Festive Wear',
  ]);

  items = signal<FashionKnowledgeItem[]>([
    { id: '1', category: 'Seasonal Fashion', title: 'Spring Pastels', description: 'Soft pinks, lavenders, and mint greens dominate spring collections.', createdAt: '2026-07-15' },
    { id: '2', category: 'Trending Colours', title: 'Terracotta', description: 'Warm earthy terracotta is trending for autumn/winter wardrobes.', createdAt: '2026-07-20' },
    { id: '3', category: 'Trending Fabrics', title: 'Organza', description: 'Sheer organza is popular for overlays and festive wear.', createdAt: '2026-07-10' },
    { id: '4', category: 'Trending Prints', title: 'Floral Motifs', description: 'Large-scale floral prints are in trend for summer.', createdAt: '2026-07-18' },
    { id: '5', category: "Women's Styling Tips", title: 'Layering', description: 'Layer lightweight pieces for depth without bulk.', createdAt: '2026-07-12' },
    { id: '6', category: 'Office Wear', title: 'Tailored Blazer', description: 'A well-fitted blazer elevates any office outfit.', createdAt: '2026-07-08' },
    { id: '7', category: 'Wedding Wear', title: 'Lehenga Silhouette', description: 'A-line lehengas with draped dupattas are trending.', createdAt: '2026-07-22' },
    { id: '8', category: 'Festive Wear', title: 'Embroidery Details', description: 'Hand-embroidered details add a festive touch to any outfit.', createdAt: '2026-07-25' },
  ]);

  showModal = signal(false);
  editingItem = signal<FashionKnowledgeItem | null>(null);
  formCategory = signal('');
  formTitle = signal('');
  formDescription = signal('');

  itemsByCategory(category: string) {
    return signal<FashionKnowledgeItem[]>(this.items().filter(i => i.category === category));
  }

  onOpenCreate(): void {
    this.editingItem.set(null);
    this.formCategory.set(this.categories()[0]);
    this.formTitle.set('');
    this.formDescription.set('');
    this.showModal.set(true);
  }

  onEdit(item: FashionKnowledgeItem): void {
    this.editingItem.set(item);
    this.formCategory.set(item.category);
    this.formTitle.set(item.title);
    this.formDescription.set(item.description);
    this.showModal.set(true);
  }

  onDelete(id: string): void {
    this.items.update(items => items.filter(i => i.id !== id));
  }

  onSave(): void {
    const title = this.formTitle().trim();
    const description = this.formDescription().trim();
    if (!title || !description) return;

    if (this.editingItem()) {
      this.items.update(items =>
        items.map(i =>
          i.id === this.editingItem()!.id
            ? { ...i, category: this.formCategory(), title, description }
            : i
        )
      );
    } else {
      const newItem: FashionKnowledgeItem = {
        id: Date.now().toString(),
        category: this.formCategory(),
        title,
        description,
        createdAt: new Date().toISOString().split('T')[0],
      };
      this.items.update(items => [newItem, ...items]);
    }

    this.showModal.set(false);
    this.editingItem.set(null);
  }

  onCloseModal(): void {
    this.showModal.set(false);
    this.editingItem.set(null);
  }
}