import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface KnowledgeItem {
  id: string;
  category: string;
  title: string;
  content: string;
  createdAt: string;
}

@Component({
  selector: 'app-marketing-knowledge-engine',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="mke-page">
      <div class="mke-header">
        <h1 class="mke-title">Marketing Knowledge Engine</h1>
        <p class="mke-desc">Store and manage reusable marketing knowledge for AI-powered content creation.</p>
      </div>

      <div class="mke-actions">
        <button class="mke-btn mke-btn-primary" (click)="onOpenCreate()">
          <i class="bi bi-plus-lg"></i> Add Entry
        </button>
      </div>

      <div class="mke-categories">
        @for (cat of categories(); track cat) {
          <div class="mke-category-card">
            <div class="mke-category-header">
              <h3 class="mke-category-title">{{ cat }}</h3>
              <span class="mke-category-count">{{ itemsByCategory(cat)().length }}</span>
            </div>
            <div class="mke-category-list">
              @for (item of itemsByCategory(cat)(); track item.id) {
                <div class="mke-item">
                  <div class="mke-item-body">
                    <span class="mke-item-title">{{ item.title }}</span>
                    <p class="mke-item-content">{{ item.content }}</p>
                  </div>
                  <div class="mke-item-actions">
                    <button class="mke-icon-btn" (click)="onEdit(item)" title="Edit">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="mke-icon-btn mke-icon-danger" (click)="onDelete(item.id)" title="Delete">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              }
              @if (itemsByCategory(cat)().length === 0) {
                <p class="mke-empty">No entries yet.</p>
              }
            </div>
          </div>
        }
      </div>

      @if (showModal()) {
        <div class="mke-modal-overlay" (click)="onCloseModal()">
          <div class="mke-modal" (click)="$event.stopPropagation()">
            <h2 class="mke-modal-title">{{ editingItem() ? 'Edit Entry' : 'Add Entry' }}</h2>
            <div class="mke-field">
              <label class="mke-label">Category</label>
              <select class="mke-input" [(ngModel)]="formCategory" name="mkeCategory">
                @for (cat of categories(); track cat) {
                  <option value="{{ cat }}">{{ cat }}</option>
                }
              </select>
            </div>
            <div class="mke-field">
              <label class="mke-label">Title</label>
              <input type="text" class="mke-input" [(ngModel)]="formTitle" name="mkeTitle" placeholder="Entry title" />
            </div>
            <div class="mke-field">
              <label class="mke-label">Content</label>
              <textarea class="mke-textarea" [(ngModel)]="formContent" name="mkeContent" rows="4" placeholder="Enter the knowledge content..."></textarea>
            </div>
            <div class="mke-modal-actions">
              <button class="mke-btn mke-btn-secondary" (click)="onCloseModal()">Cancel</button>
              <button class="mke-btn mke-btn-primary" (click)="onSave()">
                {{ editingItem() ? 'Update' : 'Save' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './marketing-knowledge-engine.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingKnowledgeEngineComponent {
  categories = signal<string[]>([
    'Instagram Best Practices',
    'Flipkart Selling Tips',
    'Fashion Marketing',
    'Psychology of Buying',
    'Seasonal Marketing',
    'Festival Campaigns',
    'Color Psychology',
    "Women's Fashion Trends",
    'Call To Action Library',
  ]);

  items = signal<KnowledgeItem[]>([
    { id: '1', category: 'Instagram Best Practices', title: 'Post at 9 AM IST', content: 'Peak engagement for Indian audiences is between 9-11 AM IST on weekdays.', createdAt: '2026-07-20' },
    { id: '2', category: 'Instagram Best Practices', title: 'Use 3-5 Hashtags', content: 'Instagram algorithm favors 3-5 targeted hashtags over 30 generic ones.', createdAt: '2026-07-22' },
    { id: '3', category: 'Flipkart Selling Tips', title: 'Optimize Product Titles', content: 'Include brand, product type, key feature, and color in the title for better search visibility.', createdAt: '2026-07-18' },
    { id: '4', category: 'Flipkart Selling Tips', title: 'A+ Content Matters', content: 'Enhanced brand content increases conversion by up to 10% on Flipkart.', createdAt: '2026-07-25' },
    { id: '5', category: 'Fashion Marketing', title: 'Storytelling Sells', content: 'Customers connect with the story behind the garment, not just the product specs.', createdAt: '2026-07-15' },
    { id: '6', category: 'Psychology of Buying', title: 'Scarcity Principle', content: 'Limited edition drops create urgency and drive faster purchase decisions.', createdAt: '2026-07-12' },
    { id: '7', category: 'Psychology of Buying', title: 'Social Proof', content: 'Customer reviews and user-generated content build trust and increase conversions.', createdAt: '2026-07-14' },
    { id: '8', category: 'Seasonal Marketing', title: 'Pre-Season Teaser', content: 'Start teasing seasonal collections 2 weeks before launch for maximum anticipation.', createdAt: '2026-07-10' },
    { id: '9', category: 'Festival Campaigns', title: 'Diwali Gold Campaign', content: 'Gold and festive colors perform best during Diwali campaigns for ethnic wear.', createdAt: '2026-07-28' },
    { id: '10', category: 'Color Psychology', title: 'Red for Urgency', content: 'Red creates urgency and is effective for flash sales and limited-time offers.', createdAt: '2026-07-16' },
    { id: '11', category: 'Color Psychology', title: 'Pastels for Spring', content: 'Soft pastels evoke freshness and are ideal for spring/summer collections.', createdAt: '2026-07-17' },
    { id: '12', category: "Women's Fashion Trends", title: 'Oversized Silhouettes', content: 'Oversized and relaxed fits are trending for 2026 across all age groups.', createdAt: '2026-07-19' },
    { id: '13', category: 'Call To Action Library', title: 'Shop Now', content: 'Direct and action-oriented. Best for product launch and sale campaigns.', createdAt: '2026-07-11' },
    { id: '14', category: 'Call To Action Library', title: 'Discover Your Style', content: 'Soft and exploratory. Works well for brand awareness and lifestyle content.', createdAt: '2026-07-13' },
  ]);

  showModal = signal(false);
  editingItem = signal<KnowledgeItem | null>(null);
  formCategory = signal('');
  formTitle = signal('');
  formContent = signal('');

  itemsByCategory(category: string) {
    return signal<KnowledgeItem[]>(this.items().filter(i => i.category === category));
  }

  onOpenCreate(): void {
    this.editingItem.set(null);
    this.formCategory.set(this.categories()[0]);
    this.formTitle.set('');
    this.formContent.set('');
    this.showModal.set(true);
  }

  onEdit(item: KnowledgeItem): void {
    this.editingItem.set(item);
    this.formCategory.set(item.category);
    this.formTitle.set(item.title);
    this.formContent.set(item.content);
    this.showModal.set(true);
  }

  onDelete(id: string): void {
    this.items.update(items => items.filter(i => i.id !== id));
  }

  onSave(): void {
    const title = this.formTitle().trim();
    const content = this.formContent().trim();
    if (!title || !content) return;

    if (this.editingItem()) {
      this.items.update(items =>
        items.map(i =>
          i.id === this.editingItem()!.id
            ? { ...i, category: this.formCategory(), title, content }
            : i
        )
      );
    } else {
      const newItem: KnowledgeItem = {
        id: Date.now().toString(),
        category: this.formCategory(),
        title,
        content,
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