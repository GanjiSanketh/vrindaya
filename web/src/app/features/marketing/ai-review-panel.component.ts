import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

interface ReviewMetric {
  name: string;
  score: number;
  maxScore: number;
  icon: string;
  color: string;
  label: string;
}

interface Suggestion {
  id: string;
  metric: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
}

@Component({
  selector: 'app-ai-review-panel',
  standalone: true,
  imports: [],
  template: `
    <div class="arp-page">
      <div class="arp-header">
        <h1 class="arp-title">AI Review Panel</h1>
        <p class="arp-desc">AI-powered content review scores and improvement suggestions.</p>
      </div>

      <div class="arp-scores">
        @for (metric of metrics(); track metric.name) {
          <div class="arp-score-card">
            <div class="arp-score-icon">
              <i class="bi {{ metric.icon }}"></i>
            </div>
            <div class="arp-score-body">
              <span class="arp-score-label">{{ metric.label }}</span>
              <div class="arp-score-bar">
                <div class="arp-score-fill" [style.width.%]="metric.score" [style.background-color]="metric.color"></div>
              </div>
              <span class="arp-score-value">{{ metric.score }}/{{ metric.maxScore }}</span>
            </div>
          </div>
        }
      </div>

      <div class="arp-overall">
        <div class="arp-overall-card">
          <span class="arp-overall-label">Overall Score</span>
          <span class="arp-overall-value">{{ overallScore() }}</span>
        </div>
        <div class="arp-overall-card">
          <span class="arp-overall-label">Status</span>
          <span class="arp-status-badge" [class.arp-status-good]="overallScore() >= 70" [class.arp-status-ok]="overallScore() >= 40 && overallScore() < 70" [class.arp-status-low]="overallScore() < 40">
            {{ overallStatus() }}
          </span>
        </div>
      </div>

      <div class="arp-section">
        <h2 class="arp-section-title">Improvement Suggestions</h2>
        <div class="arp-suggestions">
          @for (suggestion of suggestions(); track suggestion.id) {
            <div class="arp-suggestion-card" [class.arp-priority-high]="suggestion.priority === 'high'" [class.arp-priority-medium]="suggestion.priority === 'medium'" [class.arp-priority-low]="suggestion.priority === 'low'">
              <div class="arp-suggestion-header">
                <span class="arp-suggestion-metric">{{ suggestion.metric }}</span>
                <span class="arp-priority-badge" [class.arp-priority-high]="suggestion.priority === 'high'" [class.arp-priority-medium]="suggestion.priority === 'medium'" [class.arp-priority-low]="suggestion.priority === 'low'">
                  {{ suggestion.priority }}
                </span>
              </div>
              <p class="arp-suggestion-text">{{ suggestion.text }}</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './ai-review-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiReviewPanelComponent {
  metrics = signal<ReviewMetric[]>([
    { name: 'Grammar', score: 88, maxScore: 100, icon: 'bi-spellcheck', color: '#22a34a', label: 'Grammar' },
    { name: 'Brand Voice', score: 72, maxScore: 100, icon: 'bi-megaphone', color: '#0c4a58', label: 'Brand Voice' },
    { name: 'Engagement', score: 65, maxScore: 100, icon: 'bi-fire', color: '#d4a017', label: 'Engagement' },
    { name: 'SEO', score: 81, maxScore: 100, icon: 'bi-search', color: '#0f6f84', label: 'SEO' },
    { name: 'Readability', score: 90, maxScore: 100, icon: 'bi-book', color: '#22a34a', label: 'Readability' },
    { name: 'Originality', score: 58, maxScore: 100, icon: 'bi-lightbulb', color: '#d4a017', label: 'Originality' },
    { name: 'Visual Appeal', score: 76, maxScore: 100, icon: 'bi-palette', color: '#0c4a58', label: 'Visual Appeal' },
  ]);

  suggestions = signal<Suggestion[]>([
    { id: '1', metric: 'Brand Voice', text: 'Adjust tone to be more conversational. Current draft uses formal language that may not resonate with the target audience of young professionals.', priority: 'high' },
    { id: '2', metric: 'Originality', text: 'The caption follows a generic template. Consider adding a unique personal anecdote or data point to increase originality.', priority: 'high' },
    { id: '3', metric: 'Engagement', text: 'Add a question or call-to-action in the first line to boost engagement. Posts with interactive hooks receive 2.5x more comments.', priority: 'medium' },
    { id: '4', metric: 'SEO', text: 'Include 2–3 additional long-tail keywords in the caption to improve discoverability in Instagram search.', priority: 'medium' },
    { id: '5', metric: 'Grammar', text: 'Minor punctuation inconsistency in the second sentence. Review comma usage for clarity.', priority: 'low' },
    { id: '6', metric: 'Visual Appeal', text: 'Consider using a warm-toned filter to align with the brand color palette. The current image contrast is slightly low.', priority: 'low' },
  ]);

  overallScore() {
    const scores = this.metrics().map(m => m.score);
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  overallStatus() {
    const score = this.overallScore();
    if (score >= 70) return 'Good';
    if (score >= 40) return 'Needs Work';
    return 'Poor';
  }
}