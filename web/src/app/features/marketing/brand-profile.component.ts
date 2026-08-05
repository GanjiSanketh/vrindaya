import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-brand-profile',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="bp-page">
      <div class="bp-header">
        <h1 class="bp-title">Brand Profile</h1>
        <p class="bp-desc">Define your brand identity. The AI generator will automatically use this profile when generating future content.</p>
      </div>

      <div class="bp-card">
        <form class="bp-form" (ngSubmit)="onSave()">
          <div class="bp-field">
            <label class="bp-label">Brand Name</label>
            <input type="text" class="bp-input" [(ngModel)]="brandName" name="brandName" placeholder="Enter brand name" />
          </div>

          <div class="bp-field">
            <label class="bp-label">Brand Story</label>
            <textarea class="bp-textarea" [(ngModel)]="brandStory" name="brandStory" rows="4" placeholder="Tell your brand story..."></textarea>
          </div>

          <div class="bp-field">
            <label class="bp-label">Brand Tone</label>
            <select class="bp-input" [(ngModel)]="brandTone" name="brandTone">
              <option value="">Select tone</option>
              <option value="luxury">Luxury</option>
              <option value="casual">Casual</option>
              <option value="festive">Festive</option>
              <option value="elegant">Elegant</option>
              <option value="bold">Bold</option>
              <option value="minimal">Minimal</option>
            </select>
          </div>

          <div class="bp-field">
            <label class="bp-label">Primary Colors</label>
            <div class="bp-color-row">
              <input type="color" class="bp-color" [(ngModel)]="primaryColor1" name="primaryColor1" />
              <input type="color" class="bp-color" [(ngModel)]="primaryColor2" name="primaryColor2" />
              <input type="color" class="bp-color" [(ngModel)]="primaryColor3" name="primaryColor3" />
            </div>
          </div>

          <div class="bp-field">
            <label class="bp-label">Target Audience</label>
            <input type="text" class="bp-input" [(ngModel)]="targetAudience" name="targetAudience" placeholder="e.g., Women 25-40, Fashion-forward" />
          </div>

          <div class="bp-field">
            <label class="bp-label">Writing Style</label>
            <select class="bp-input" [(ngModel)]="writingStyle" name="writingStyle">
              <option value="">Select style</option>
              <option value="professional">Professional</option>
              <option value="conversational">Conversational</option>
              <option value="aspirational">Aspirational</option>
              <option value="playful">Playful</option>
              <option value="authoritative">Authoritative</option>
            </select>
          </div>

          <div class="bp-field">
            <label class="bp-label">Instagram Username</label>
            <input type="text" class="bp-input" [(ngModel)]="instagramUsername" name="instagramUsername" placeholder="@yourbrand" />
          </div>

          <div class="bp-field">
            <label class="bp-label">Website</label>
            <input type="url" class="bp-input" [(ngModel)]="website" name="website" placeholder="https://yourbrand.com" />
          </div>

          <div class="bp-field">
            <label class="bp-label">Flipkart Store</label>
            <input type="text" class="bp-input" [(ngModel)]="flipkartStore" name="flipkartStore" placeholder="your-brand-store" />
          </div>

          <div class="bp-field">
            <label class="bp-label">Logo Upload</label>
            <div class="bp-upload">
              <i class="bi bi-cloud-upload"></i>
              <span>Click to upload logo</span>
              <input type="file" class="bp-file-input" accept="image/*" />
            </div>
          </div>

          <div class="bp-actions">
            <button type="submit" class="bp-btn">
              <i class="bi bi-check-lg"></i>
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styleUrl: './brand-profile.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandProfileComponent {
  brandName = '';
  brandStory = '';
  brandTone = '';
  primaryColor1 = '#0c4a58';
  primaryColor2 = '#0f6f84';
  primaryColor3 = '#e6f4f7';
  targetAudience = '';
  writingStyle = '';
  instagramUsername = '';
  website = '';
  flipkartStore = '';

  onSave(): void {}
}