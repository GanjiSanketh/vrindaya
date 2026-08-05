import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

interface QualityMetric {
  label: string;
  score: number;
  color: string;
}

@Component({
  selector: 'app-content-quality-panel',
  standalone: true,
  imports: [],
  template: `
    <div class="cqp-page">
      <div class="cqp-header">
        <h1 class="cqp-title">Content Quality</h1>
        <p class="cqp-desc">Evaluate generated content across key quality dimensions.</p>
      </div>

      <div class="cqp-summary">
        <div class="cqp-overall">
          <span class="cqp-overall-label">Overall Score</span>
          <span class="cqp-overall-value">{{ overallScore() }}</span>
        </div>
        <div class="cqp-overall-bar">
          <div class="cqp-overall-fill" [style.width.%]="overallScore()" [style.background]="overallColor()"></div>
        </div>
      </div>

      <div class="cqp-metrics">
        @for (metric of metrics(); track metric.label) {
          <div class="cqp-metric">
            <div class="cqp-metric-header">
              <span class="cqp-metric-label">{{ metric.label }}</span>
              <span class="cqp-metric-score">{{ metric.score }}/100</span>
            </div>
            <div class="cqp-progress-track">
              <div class="cqp-progress-fill" [style.width.%]="metric.score" [style.background]="metric.color"></div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './content-quality-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentQualityPanelComponent {
  metrics = signal<QualityMetric[]>([
    { label: 'Caption', score: 82, color: '#0c4a58' },
    { label: 'Hashtags', score: 75, color: '#0f6f84' },
    { label: 'Hook', score: 90, color: '#22a34a' },
    { label: 'Brand Voice', score: 88, color: '#c9a54c' },
    { label: 'SEO', score: 70, color: '#d97706' },
    { label: 'Engagement', score: 85, color: '#0c4a58' },
    { label: 'Visual Quality', score: 78, color: '#0f6f84' },
  ]);

  overallScore() {
    const scores = this.metrics().map(m => m.score);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }

  overallColor() {
    const score = this.overallScore();
    if (score >= 85) return '#22a34a';
    if (score >= 70) return '#0c4a58';
    if (score >= 50) return '#d97706';
    return '#dc2626';
  }
}