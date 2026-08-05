import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface BrandVoiceItem {
  id: string;
  category: string;
  content: string;
  notes: string;
  createdAt: string;
}

@Component({
  selector: 'app-brand-voice-trainer',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="bvt-page">
      <div class="bvt-header">
        <h1 class="bvt-title">Brand Voice Trainer</h1>
        <p class="bvt-desc">Define and refine your brand voice with reusable examples.</p>
      </div>

      <div class="bvt-actions">
        <button class="bvt-btn bvt-btn-primary" (click)="onOpenCreate()">
          <i class="bi bi-plus-lg"></i> Add Entry
        </button>
      </div>

      <div class="bvt-categories">
        @for (cat of categories(); track cat) {
          <div class="bvt-category-card">
            <div class="bvt-category-header">
              <h3 class="bvt-category-title">{{ cat.label }}</h3>
              <span class="bvt-category-count">{{ itemsByCategory(cat.value)().length }}</span>
            </div>
            <div class="bvt-category-list">
              @for (item of itemsByCategory(cat.value)(); track item.id) {
                <div class="bvt-item">
                  <div class="bvt-item-body">
                    <span class="bvt-item-content">{{ item.content }}</span>
                    @if (item.notes) {
                      <span class="bvt-item-notes">{{ item.notes }}</span>
                    }
                  </div>
                  <div class="bvt-item-actions">
                    <button class="bvt-icon-btn" (click)="onEdit(item)" title="Edit">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="bvt-icon-btn bvt-icon-danger" (click)="onDelete(item.id)" title="Delete">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              }
              @if (itemsByCategory(cat.value)().length === 0) {
                <p class="bvt-empty">No entries yet.</p>
              }
            </div>
          </div>
        }
      </div>

      @if (showModal()) {
        <div class="bvt-modal-overlay" (click)="onCloseModal()">
          <div class="bvt-modal" (click)="$event.stopPropagation()">
            <h2 class="bvt-modal-title">{{ editingItem() ? 'Edit Entry' : 'Add Entry' }}</h2>
            <div class="bvt-field">
              <label class="bvt-label">Category</label>
              <select class="bvt-input" [(ngModel)]="formCategory" name="bvtCategory">
                @for (cat of categories(); track cat) {
                  <option value="{{ cat.value }}">{{ cat.label }}</option>
                }
              </select>
            </div>
            <div class="bvt-field">
              <label class="bvt-label">Content</label>
              <textarea class="bvt-textarea" [(ngModel)]="formContent" name="bvtContent" rows="3" placeholder="Enter the example content..."></textarea>
            </div>
            <div class="bvt-field">
              <label class="bvt-label">Notes</label>
              <input type="text" class="bvt-input" [(ngModel)]="formNotes" name="bvtNotes" placeholder="Optional notes" />
            </div>
            <div class="bvt-modal-actions">
              <button class="bvt-btn bvt-btn-secondary" (click)="onCloseModal()">Cancel</button>
              <button class="bvt-btn bvt-btn-primary" (click)="onSave()">
                {{ editingItem() ? 'Update' : 'Save' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './brand-voice-trainer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandVoiceTrainerComponent {
  categories = signal<{ label: string; value: string }[]>([
    { label: 'Instagram Captions', value: 'Instagram Captions' },
    { label: 'Reel Hooks', value: 'Reel Hooks' },
    { label: 'CTA', value: 'CTA' },
    { label: 'Writing Style', value: 'Writing Style' },
    { label: 'Words to Avoid', value: 'Words to Avoid' },
    { label: 'Emoji Usage', value: 'Emoji Usage' },
    { label: 'Brand Vocabulary', value: 'Brand Vocabulary' },
  ]);

  items = signal<BrandVoiceItem[]>([
    { id: '1', category: 'Instagram Captions', content: 'Discover the elegance that defines you.', notes: 'Luxury tone, short and aspirational', createdAt: '2026-07-20' },
    { id: '2', category: 'Instagram Captions', content: 'This season, wear your confidence.', notes: 'Empowering, direct', createdAt: '2026-07-22' },
    { id: '3', category: 'Reel Hooks', content: 'You are not just wearing clothes — you are making a statement.', notes: 'Opening line for reels', createdAt: '2026-07-18' },
    { id: '4', category: 'Reel Hooks', content: 'Ever wondered what makes luxury feel different?', notes: 'Curiosity-driven hook', createdAt: '2026-07-25' },
    { id: '5', category: 'CTA', content: 'Shop the collection now', notes: 'Primary CTA for product launches', createdAt: '2026-07-15' },
    { id: '6', category: 'CTA', content: 'Find your perfect fit today', notes: ' softer alternative to Shop now', createdAt: '2026-07-28' },
    { id: '7', category: 'Writing Style', content: 'Elegant, warm, and conversational', notes: 'Overall brand voice descriptor', createdAt: '2026-07-10' },
    { id: '8', category: 'Words to Avoid', content: 'Cheap, affordable, budget', notes: 'Avoid price-sensitive language', createdAt: '2026-07-12' },
    { id: '9', category: 'Words to Avoid', content: 'Trending, viral, FOMO', notes: 'Avoid desperation-driven language', createdAt: '2026-07-14' },
    { id: '10', category: 'Emoji Usage', content: '✨ 🌸 👑 💫', notes: 'Approved emojis for luxury posts', createdAt: '2026-07-16' },
    { id: '11', category: 'Emoji Usage', content: 'Avoid 💰 🔥 🚀', notes: 'Prohibited emojis — too salesy', createdAt: '2026-07-17' },
    { id: '12', category: 'Brand Vocabulary', content: 'Timeless, curated, elegant, grace, craft', notes: 'Core brand adjectives', createdAt: '2026-07-11' },
    { id: '13', category: 'Brand Vocabulary', content: 'Heritage, artistry, bespoke', notes: 'Premium tier vocabulary', createdAt: '2026-07-13' },
  ]);

  showModal = signal(false);
  editingItem = signal<BrandVoiceItem | null>(null);
  formCategory = signal('');
  formContent = signal('');
  formNotes = signal('');

  itemsByCategory(category: string) {
    return signal<BrandVoiceItem[]>(this.items().filter(i => i.category === category));
  }

  onOpenCreate(): void {
    this.editingItem.set(null);
    this.formCategory.set(this.categories()[0].value);
    this.formContent.set('');
    this.formNotes.set('');
    this.showModal.set(true);
  }

  onEdit(item: BrandVoiceItem): void {
    this.editingItem.set(item);
    this.formCategory.set(item.category);
    this.formContent.set(item.content);
    this.formNotes.set(item.notes);
    this.showModal.set(true);
  }

  onDelete(id: string): void {
    this.items.update(items => items.filter(i => i.id !== id));
  }

  onSave(): void {
    const content = this.formContent().trim();
    if (!content) return;

    if (this.editingItem()) {
      this.items.update(items =>
        items.map(i =>
          i.id === this.editingItem()!.id
            ? { ...i, category: this.formCategory(), content, notes: this.formNotes().trim() }
            : i
        )
      );
    } else {
      const newItem: BrandVoiceItem = {
        id: Date.now().toString(),
        category: this.formCategory(),
        content,
        notes: this.formNotes().trim(),
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