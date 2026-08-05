import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface PromptTemplate {
  id: string;
  category: string;
  name: string;
  content: string;
  isActive: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-prompt-template-engine',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="pte-page">
      <div class="pte-header">
        <h1 class="pte-title">Prompt Template Engine</h1>
        <p class="pte-desc">Store and manage reusable prompt templates for content generation.</p>
      </div>

      <div class="pte-actions">
        <button class="pte-btn pte-btn-primary" (click)="onOpenCreate()">
          <i class="bi bi-plus-lg"></i> Add Template
        </button>
      </div>

      <div class="pte-categories">
        @for (cat of categories(); track cat) {
          <div class="pte-category-card">
            <div class="pte-category-header">
              <h3 class="pte-category-title">{{ cat }}</h3>
              <span class="pte-category-count">{{ templatesByCategory(cat)().length }}</span>
            </div>
            <div class="pte-category-list">
              @for (tpl of templatesByCategory(cat)(); track tpl.id) {
                <div class="pte-template-card" [class.pte-active]="tpl.isActive">
                  <div class="pte-template-header">
                    <span class="pte-template-name">{{ tpl.name }}</span>
                    @if (tpl.isActive) {
                      <span class="pte-active-badge">Active</span>
                    }
                  </div>
                  <p class="pte-template-content">{{ tpl.content }}</p>
                  <div class="pte-template-actions">
                    <button class="pte-icon-btn" (click)="onToggleActive(tpl)" title="Toggle Active">
                      <i class="bi {{ tpl.isActive ? 'bi-check-circle' : 'bi-circle' }}"></i>
                    </button>
                    <button class="pte-icon-btn" (click)="onEdit(tpl)" title="Edit">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="pte-icon-btn pte-icon-danger" (click)="onDelete(tpl.id)" title="Delete">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              }
              @if (templatesByCategory(cat)().length === 0) {
                <p class="pte-empty">No templates yet.</p>
              }
            </div>
          </div>
        }
      </div>

      @if (showModal()) {
        <div class="pte-modal-overlay" (click)="onCloseModal()">
          <div class="pte-modal" (click)="$event.stopPropagation()">
            <h2 class="pte-modal-title">{{ editingTemplate() ? 'Edit Template' : 'Add Template' }}</h2>
            <div class="pte-field">
              <label class="pte-label">Category</label>
              <select class="pte-input" [(ngModel)]="formCategory" name="pteCategory">
                @for (cat of categories(); track cat) {
                  <option value="{{ cat }}">{{ cat }}</option>
                }
              </select>
            </div>
            <div class="pte-field">
              <label class="pte-label">Template Name</label>
              <input type="text" class="pte-input" [(ngModel)]="formName" name="pteName" placeholder="e.g., Festival Sale Post" />
            </div>
            <div class="pte-field">
              <label class="pte-label">Prompt Template</label>
              <textarea class="pte-textarea" [(ngModel)]="formContent" name="pteContent" rows="4" placeholder="Write the prompt template..."></textarea>
            </div>
            <div class="pte-modal-actions">
              <button class="pte-btn pte-btn-secondary" (click)="onCloseModal()">Cancel</button>
              <button class="pte-btn pte-btn-primary" (click)="onSave()">
                {{ editingTemplate() ? 'Update' : 'Save' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styleUrl: './prompt-template-engine.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromptTemplateEngineComponent {
  categories = signal<string[]>([
    'Instagram Post',
    'Instagram Reel',
    'Carousel',
    'Story',
    'Festival',
    'Sale',
    'Brand Awareness',
    'Educational Content',
  ]);

  templates = signal<PromptTemplate[]>([
    { id: '1', category: 'Instagram Post', name: 'Festival Sale Post', content: 'Celebrate the festive season with our exclusive collection. Shop now and enjoy up to 50% off on selected items. Use code FESTIVE at checkout.', isActive: true, createdAt: '2026-07-20' },
    { id: '2', category: 'Instagram Post', name: 'New Arrival Post', content: 'Introducing our latest collection — designed for the modern woman. Explore new styles and find your perfect fit.', isActive: false, createdAt: '2026-07-22' },
    { id: '3', category: 'Instagram Reel', name: 'Behind the Scenes Reel', content: 'Take a look behind the scenes of our latest photoshoot. Swipe up to shop the featured collection.', isActive: false, createdAt: '2026-07-18' },
    { id: '4', category: 'Carousel', name: 'Style Guide Carousel', content: 'Swipe to see 5 ways to style our bestseller. From casual to formal — find your look.', isActive: false, createdAt: '2026-07-25' },
    { id: '5', category: 'Story', name: 'Poll Story', content: 'Which color are you loving this season? Vote below and tell us in the comments!', isActive: false, createdAt: '2026-07-15' },
    { id: '6', category: 'Festival', name: 'Diwali Campaign', content: 'Light up your festive season with our handcrafted collection. Celebrate in style this Diwali.', isActive: false, createdAt: '2026-07-28' },
    { id: '7', category: 'Sale', name: 'Flash Sale CTA', content: 'Hurry! Limited time flash sale — 40% off everything. Sale ends tonight at midnight. Shop now!', isActive: false, createdAt: '2026-07-12' },
    { id: '8', category: 'Brand Awareness', name: 'Brand Story Post', content: 'We believe fashion should be timeless, not trendy. Discover our philosophy and craftsmanship.', isActive: false, createdAt: '2026-07-10' },
    { id: '9', category: 'Educational Content', name: 'Fabric Care Guide', content: 'Did you know? Hand-wash silk items in cold water with mild detergent. Lay flat to dry for longevity.', isActive: false, createdAt: '2026-07-14' },
  ]);

  showModal = signal(false);
  editingTemplate = signal<PromptTemplate | null>(null);
  formCategory = signal('');
  formName = signal('');
  formContent = signal('');

  templatesByCategory(category: string) {
    return signal<PromptTemplate[]>(this.templates().filter(t => t.category === category));
  }

  onOpenCreate(): void {
    this.editingTemplate.set(null);
    this.formCategory.set(this.categories()[0]);
    this.formName.set('');
    this.formContent.set('');
    this.showModal.set(true);
  }

  onEdit(tpl: PromptTemplate): void {
    this.editingTemplate.set(tpl);
    this.formCategory.set(tpl.category);
    this.formName.set(tpl.name);
    this.formContent.set(tpl.content);
    this.showModal.set(true);
  }

  onDelete(id: string): void {
    this.templates.update(tpls => tpls.filter(t => t.id !== id));
  }

  onToggleActive(tpl: PromptTemplate): void {
    this.templates.update(tpls =>
      tpls.map(t => ({ ...t, isActive: t.id === tpl.id ? !t.isActive : t.isActive }))
    );
  }

  onSave(): void {
    const name = this.formName().trim();
    const content = this.formContent().trim();
    if (!name || !content) return;

    if (this.editingTemplate()) {
      this.templates.update(tpls =>
        tpls.map(t =>
          t.id === this.editingTemplate()!.id
            ? { ...t, category: this.formCategory(), name, content }
            : t
        )
      );
    } else {
      const newTpl: PromptTemplate = {
        id: Date.now().toString(),
        category: this.formCategory(),
        name,
        content,
        isActive: false,
        createdAt: new Date().toISOString().split('T')[0],
      };
      this.templates.update(tpls => [newTpl, ...tpls]);
    }

    this.showModal.set(false);
    this.editingTemplate.set(null);
  }

  onCloseModal(): void {
    this.showModal.set(false);
    this.editingTemplate.set(null);
  }
}