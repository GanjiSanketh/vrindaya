import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface ReelScene {
  id: string;
  label: string;
  description: string;
}

@Component({
  selector: 'app-reel-builder',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="rb-page">
      <div class="rb-header">
        <h1 class="rb-title">Reel Builder</h1>
        <p class="rb-desc">Compose your Instagram Reel scene by scene.</p>
      </div>

      <div class="rb-layout">
        <div class="rb-panel-left">
          <div class="rb-section">
            <h2 class="rb-section-title">Hook</h2>
            <div class="rb-field">
              <label class="rb-label">Hook Text</label>
              <input type="text" class="rb-input" [(ngModel)]="hook" name="hook" placeholder="Opening hook line" />
            </div>
          </div>

          <div class="rb-section">
            <h2 class="rb-section-title">Scenes</h2>
            @for (scene of scenes(); track scene.id) {
              <div class="rb-scene-card">
                <div class="rb-scene-header">
                  <span class="rb-scene-number">{{ scene.label }}</span>
                </div>
                <div class="rb-field">
                  <label class="rb-label">Description</label>
                  <textarea class="rb-textarea" [(ngModel)]="scene.description" name="scene{{ scene.id }}" rows="2" placeholder="Describe this scene..."></textarea>
                </div>
              </div>
            }
          </div>

          <div class="rb-section">
            <h2 class="rb-section-title">Voiceover</h2>
            <div class="rb-field">
              <label class="rb-label">Voiceover Text</label>
              <textarea class="rb-textarea" [(ngModel)]="voiceover" name="voiceover" rows="3" placeholder="Voiceover script..."></textarea>
            </div>
          </div>

          <div class="rb-section">
            <h2 class="rb-section-title">Captions</h2>
            <div class="rb-field">
              <label class="rb-label">Caption Text</label>
              <textarea class="rb-textarea" [(ngModel)]="captions" name="captions" rows="2" placeholder="Caption for the reel..."></textarea>
            </div>
          </div>

          <div class="rb-section">
            <h2 class="rb-section-title">Music</h2>
            <div class="rb-field">
              <label class="rb-label">Track</label>
              <input type="text" class="rb-input" [(ngModel)]="music" name="music" placeholder="e.g., Aesthetic Chill" />
            </div>
          </div>

          <div class="rb-section">
            <h2 class="rb-section-title">Ending CTA</h2>
            <div class="rb-field">
              <label class="rb-label">CTA Text</label>
              <input type="text" class="rb-input" [(ngModel)]="endingCta" name="endingCta" placeholder="e.g., Follow for more" />
            </div>
          </div>
        </div>

        <div class="rb-panel-right">
          <div class="rb-section">
            <h2 class="rb-section-title">Timeline Preview</h2>
            <div class="rb-timeline">
              <div class="rb-timeline-item">
                <div class="rb-timeline-dot"></div>
                <div class="rb-timeline-content">
                  <span class="rb-timeline-label">Hook</span>
                  <span class="rb-timeline-text">{{ hook || 'No hook set' }}</span>
                </div>
              </div>

              @for (scene of scenes(); track scene.id) {
                <div class="rb-timeline-item">
                  <div class="rb-timeline-dot"></div>
                  <div class="rb-timeline-content">
                    <span class="rb-timeline-label">{{ scene.label }}</span>
                    <span class="rb-timeline-text">{{ scene.description || 'No description' }}</span>
                  </div>
                </div>
              }

              <div class="rb-timeline-item">
                <div class="rb-timeline-dot"></div>
                <div class="rb-timeline-content">
                  <span class="rb-timeline-label">Voiceover</span>
                  <span class="rb-timeline-text">{{ voiceover || 'No voiceover' }}</span>
                </div>
              </div>

              <div class="rb-timeline-item">
                <div class="rb-timeline-dot"></div>
                <div class="rb-timeline-content">
                  <span class="rb-timeline-label">Captions</span>
                  <span class="rb-timeline-text">{{ captions || 'No captions' }}</span>
                </div>
              </div>

              <div class="rb-timeline-item">
                <div class="rb-timeline-dot"></div>
                <div class="rb-timeline-content">
                  <span class="rb-timeline-label">Music</span>
                  <span class="rb-timeline-text">{{ music || 'No music set' }}</span>
                </div>
              </div>

              <div class="rb-timeline-item">
                <div class="rb-timeline-dot"></div>
                <div class="rb-timeline-content">
                  <span class="rb-timeline-label">Ending CTA</span>
                  <span class="rb-timeline-text">{{ endingCta || 'No CTA set' }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './reel-builder.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReelBuilderComponent {
  hook = signal('');
  voiceover = signal('');
  captions = signal('');
  music = signal('');
  endingCta = signal('');

  scenes = signal<ReelScene[]>([
    { id: '1', label: 'Scene 1', description: '' },
    { id: '2', label: 'Scene 2', description: '' },
    { id: '3', label: 'Scene 3', description: '' },
    { id: '4', label: 'Scene 4', description: '' },
    { id: '5', label: 'Scene 5', description: '' },
  ]);
}