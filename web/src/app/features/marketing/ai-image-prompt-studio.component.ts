import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ai-image-prompt-studio',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="ips-page">
      <div class="ips-header">
        <h1 class="ips-title">AI Image Prompt Studio</h1>
        <p class="ips-desc">Build structured image prompts for premium fashion catalog visuals.</p>
      </div>

      <div class="ips-layout">
        <div class="ips-panel-left">
          <div class="ips-section">
            <h2 class="ips-section-title">Reference Product</h2>
            <div class="ips-field">
              <label class="ips-label">Product Name</label>
              <input type="text" class="ips-input" [(ngModel)]="productName" name="productName" placeholder="e.g., Silk Kurta Set" />
            </div>
            <div class="ips-field">
              <label class="ips-label">Category</label>
              <input type="text" class="ips-input" [(ngModel)]="productCategory" name="productCategory" placeholder="e.g., long-kurtas" />
            </div>
            <div class="ips-field">
              <label class="ips-label">Fabric</label>
              <input type="text" class="ips-input" [(ngModel)]="fabric" name="fabric" placeholder="e.g., silk, cotton" />
            </div>
            <div class="ips-field">
              <label class="ips-label">Color</label>
              <input type="text" class="ips-input" [(ngModel)]="productColor" name="productColor" placeholder="e.g., wine red, ivory" />
            </div>
          </div>

          <div class="ips-section">
            <h2 class="ips-section-title">Camera</h2>
            <div class="ips-field">
              <label class="ips-label">Lens</label>
              <select class="ips-input" [(ngModel)]="lens" name="lens">
                <option value="85mm f/1.4">85mm f/1.4</option>
                <option value="50mm f/1.8">50mm f/1.8</option>
                <option value="35mm f/2.0">35mm f/2.0</option>
                <option value="70-200mm f/2.8">70-200mm f/2.8</option>
              </select>
            </div>
            <div class="ips-field">
              <label class="ips-label">Composition</label>
              <select class="ips-input" [(ngModel)]="composition" name="composition">
                <option value="centered">Centered</option>
                <option value="rule of thirds">Rule of Thirds</option>
                <option value="close-up">Close-Up</option>
                <option value="full body">Full Body</option>
              </select>
            </div>
            <div class="ips-field">
              <label class="ips-label">Camera Angle</label>
              <select class="ips-input" [(ngModel)]="cameraAngle" name="cameraAngle">
                <option value="eye level">Eye Level</option>
                <option value="slight overhead">Slight Overhead</option>
                <option value="low angle">Low Angle</option>
                <option value="profile">Profile</option>
              </select>
            </div>
          </div>

          <div class="ips-section">
            <h2 class="ips-section-title">Lighting</h2>
            <div class="ips-field">
              <label class="ips-label">Lighting Setup</label>
              <select class="ips-input" [(ngModel)]="lighting" name="lighting">
                <option value="soft diffused studio">Soft Diffused Studio</option>
                <option value="golden hour">Golden Hour</option>
                <option value="rim light">Rim Light</option>
                <option value="high key">High Key</option>
                <option value="dramatic">Dramatic</option>
              </select>
            </div>
          </div>

          <div class="ips-section">
            <h2 class="ips-section-title">Background</h2>
            <div class="ips-field">
              <label class="ips-label">Background</label>
              <select class="ips-input" [(ngModel)]="background" name="background">
                <option value="luxury studio marble">Luxury Studio Marble</option>
                <option value="neutral linen">Neutral Linen</option>
                <option value="soft gradient">Soft Gradient</option>
                <option value="outdoor garden">Outdoor Garden</option>
                <option value="urban concrete">Urban Concrete</option>
              </select>
            </div>
          </div>

          <div class="ips-section">
            <h2 class="ips-section-title">Pose</h2>
            <div class="ips-field">
              <label class="ips-label">Pose</label>
              <select class="ips-input" [(ngModel)]="pose" name="pose">
                <option value="elegant standing">Elegant Standing</option>
                <option value="relaxed seated">Relaxed Seated</option>
                <option value="dynamic movement">Dynamic Movement</option>
                <option value="contemplative">Contemplative</option>
                <option value="hands-on-hips">Hands on Hips</option>
              </select>
            </div>
          </div>

          <div class="ips-section">
            <h2 class="ips-section-title">Accessories</h2>
            <div class="ips-field">
              <label class="ips-label">Accessories</label>
              <input type="text" class="ips-input" [(ngModel)]="accessories" name="accessories" placeholder="e.g., gold earrings, clutch bag" />
            </div>
          </div>

          <div class="ips-section">
            <h2 class="ips-section-title">Negative Prompt</h2>
            <div class="ips-field">
              <textarea class="ips-textarea" [(ngModel)]="negativePrompt" name="negativePrompt" rows="3" placeholder="e.g., blurry, distorted, ugly"></textarea>
            </div>
          </div>

          <div class="ips-section">
            <h2 class="ips-section-title">Aspect Ratio</h2>
            <div class="ips-radio-group">
              <label class="ips-radio">
                <input type="radio" name="aspectRatio" value="1:1" [(ngModel)]="aspectRatio" />
                <span>1:1</span>
              </label>
              <label class="ips-radio">
                <input type="radio" name="aspectRatio" value="4:5" [(ngModel)]="aspectRatio" />
                <span>4:5</span>
              </label>
              <label class="ips-radio">
                <input type="radio" name="aspectRatio" value="9:16" [(ngModel)]="aspectRatio" />
                <span>9:16</span>
              </label>
              <label class="ips-radio">
                <input type="radio" name="aspectRatio" value="16:9" [(ngModel)]="aspectRatio" />
                <span>16:9</span>
              </label>
            </div>
          </div>

          <div class="ips-actions">
            <button class="ips-btn ips-btn-secondary" (click)="onCopyPrompt()">
              <i class="bi bi-clipboard"></i>
              Copy Prompt
            </button>
            <button class="ips-btn ips-btn-primary" (click)="onGenerate()">
              <i class="bi bi-lightning"></i>
              Generate Prompt
            </button>
          </div>
        </div>

        <div class="ips-panel-right">
          <div class="ips-section">
            <h2 class="ips-section-title">Prompt Preview</h2>
            <div class="ips-preview">
              <pre class="ips-preview-text">{{ promptPreview() }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './ai-image-prompt-studio.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiImagePromptStudioComponent {
  productName = '';
  productCategory = '';
  fabric = '';
  productColor = '';
  lens = '85mm f/1.4';
  composition = 'centered';
  cameraAngle = 'eye level';
  lighting = 'soft diffused studio';
  background = 'luxury studio marble';
  pose = 'elegant standing';
  accessories = '';
  negativePrompt = '';
  aspectRatio = '4:5';

  promptPreview() {
    return `Product: ${this.productName || 'N/A'}
Category: ${this.productCategory || 'N/A'}
Fabric: ${this.fabric || 'N/A'}
Color: ${this.productColor || 'N/A'}

Camera: ${this.lens}, ${this.composition}, ${this.cameraAngle}
Lighting: ${this.lighting}
Background: ${this.background}
Pose: ${this.pose}
Accessories: ${this.accessories || 'None'}
Aspect Ratio: ${this.aspectRatio}
Negative Prompt: ${this.negativePrompt || 'None'}`;
  }

  onCopyPrompt(): void {}

  onGenerate(): void {}
}