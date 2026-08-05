import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-marketing-settings',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="ms-page">
      <div class="ms-header">
        <h1 class="ms-title">AI Settings</h1>
        <p class="ms-desc">Configure your AI marketing providers and generation parameters.</p>
      </div>

      <div class="ms-layout">
        <div class="ms-card">
          <div class="ms-section">
            <h2 class="ms-section-title">Providers</h2>

            <div class="ms-field">
              <label class="ms-label">LLM Provider</label>
              <select class="ms-input" [(ngModel)]="llmProvider" name="llmProvider">
                <option value="">Select provider</option>
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
                <option value="ollama">Ollama</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div class="ms-field">
              <label class="ms-label">Image Provider</label>
              <select class="ms-input" [(ngModel)]="imageProvider" name="imageProvider">
                <option value="">Select provider</option>
                <option value="dalle">DALL·E</option>
                <option value="midjourney">Midjourney</option>
                <option value="stable-diffusion">Stable Diffusion</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div class="ms-section">
            <h2 class="ms-section-title">Generation Parameters</h2>

            <div class="ms-field">
              <label class="ms-label">Temperature</label>
              <input type="range" class="ms-slider" min="0" max="1" step="0.01" [(ngModel)]="temperature" name="temperature" />
              <span class="ms-slider-value">{{ temperature }}</span>
            </div>

            <div class="ms-field">
              <label class="ms-label">Max Tokens</label>
              <input type="number" class="ms-input" [(ngModel)]="maxTokens" name="maxTokens" min="1" max="4096" />
            </div>

            <div class="ms-field">
              <label class="ms-label">Creativity</label>
              <input type="range" class="ms-slider" min="0" max="100" step="1" [(ngModel)]="creativity" name="creativity" />
              <span class="ms-slider-value">{{ creativity }}%</span>
            </div>
          </div>

          <div class="ms-section">
            <h2 class="ms-section-title">Prompt Template</h2>

            <div class="ms-field">
              <textarea class="ms-textarea" [(ngModel)]="promptTemplate" name="promptTemplate" rows="6" placeholder="Enter prompt template..."></textarea>
            </div>
          </div>

          <div class="ms-actions">
            <button class="ms-btn" (click)="onSave()">
              <i class="bi bi-check-lg"></i>
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './marketing-settings.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketingSettingsComponent {
  llmProvider = '';
  imageProvider = '';
  temperature = 0.7;
  maxTokens = 2048;
  creativity = 50;
  promptTemplate = '';

  onSave(): void {}
}