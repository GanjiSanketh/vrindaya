import { Component } from '@angular/core';

@Component({
  selector:   'app-admin-analytics',
  standalone: true,
  template: `
    <div class="an-page">
      <div class="an-header">
        <h1 class="an-title">Analytics</h1>
        <p class="an-sub">Site analytics and performance insights.</p>
      </div>
      <div class="an-card">
        <div class="an-icon"><i class="bi bi-graph-up-arrow"></i></div>
        <h2 class="an-card-title">Analytics Dashboard</h2>
        <p class="an-card-body">
          Connect Google Analytics or your preferred analytics provider to view
          traffic, conversion, and product performance data here.
        </p>
      </div>
    </div>
  `,
  styles: [`
    .an-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .an-title { font-family: 'Cormorant Garamond', serif; font-size: 1.75rem; font-weight: 700; color: #1a1a2e; margin: 0 0 0.25rem; }
    .an-sub { color: #6b7280; font-size: 0.875rem; margin: 0; }
    .an-card {
      background: #fff; border-radius: 12px; padding: 3rem 2rem;
      text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.07);
    }
    .an-icon { font-size: 3rem; color: #0c4a58; opacity: 0.25; margin-bottom: 1rem; }
    .an-card-title { font-size: 1.1rem; font-weight: 700; color: #1a1a2e; margin: 0 0 0.5rem; }
    .an-card-body  { color: #6b7280; font-size: 0.9rem; line-height: 1.6; margin: 0; max-width: 420px; margin-inline: auto; }
  `],
})
export class AdminAnalyticsComponent {}
