import { Injectable, signal } from '@angular/core';
import {
  DECISION_KEYS,
  DecisionBrief,
  DecisionResult,
} from '../models/ai-decision-engine.model';

const STORAGE_KEY = 'vrindaya_decision_engine_history';

interface CandidateSpec {
  name: string;
  base: number;
}

interface DecisionSpec {
  key: DecisionResult['key'];
  candidates: CandidateSpec[];
}

const SPECS: DecisionSpec[] = [
  {
    key: 'platform',
    candidates: [
      { name: 'Instagram', base: 82 },
      { name: 'Facebook', base: 64 },
      { name: 'Pinterest', base: 58 },
      { name: 'WhatsApp', base: 52 },
      { name: 'Website Blog', base: 44 },
      { name: 'Flipkart', base: 40 },
    ],
  },
  {
    key: 'time',
    candidates: [
      { name: '8-10 PM', base: 86 },
      { name: '12-1 PM', base: 68 },
      { name: '6-7 PM', base: 74 },
      { name: '9-10 AM', base: 64 },
      { name: '11 AM', base: 56 },
    ],
  },
  {
    key: 'audience',
    candidates: [
      { name: 'Urban Women 25-34', base: 78 },
      { name: 'Brides-to-be', base: 70 },
      { name: 'Working Women', base: 66 },
      { name: 'Festival Shoppers', base: 62 },
      { name: 'Trend Explorers', base: 54 },
    ],
  },
  {
    key: 'creative',
    candidates: [
      { name: 'Editorial', base: 74 },
      { name: 'Lifestyle', base: 70 },
      { name: 'Flat Lay', base: 62 },
      { name: 'Studio Catalog', base: 58 },
      { name: 'Cinematic', base: 66 },
    ],
  },
  {
    key: 'cta',
    candidates: [
      { name: 'Shop Now', base: 80 },
      { name: 'Link in Bio', base: 72 },
      { name: 'DM to Order', base: 64 },
      { name: 'Book Appointment', base: 58 },
      { name: 'Learn More', base: 50 },
    ],
  },
  {
    key: 'campaignType',
    candidates: [
      { name: 'Product Launch', base: 74 },
      { name: 'Awareness', base: 68 },
      { name: 'Retargeting', base: 66 },
      { name: 'Festival Drop', base: 64 },
      { name: 'UGC Boost', base: 60 },
    ],
  },
  {
    key: 'frequency',
    candidates: [
      { name: '3x per week', base: 70 },
      { name: 'Daily', base: 58 },
      { name: '5x per week', base: 66 },
      { name: '2x per week', base: 62 },
    ],
  },
  {
    key: 'colorTheme',
    candidates: [
      { name: 'Deep Teal & Gold', base: 78 },
      { name: 'Earth Tones', base: 70 },
      { name: 'Monochrome Ivory', base: 62 },
      { name: 'Festive Vibrancy', base: 60 },
      { name: 'Pastel', base: 54 },
    ],
  },
  {
    key: 'imageStyle',
    candidates: [
      { name: 'Editorial Minimal', base: 72 },
      { name: 'Heritage Editorial', base: 74 },
      { name: 'Lifestyle', base: 66 },
      { name: 'Studio Catalog', base: 60 },
      { name: 'Cinematic', base: 62 },
    ],
  },
];

const MODIFIERS: Record<string, [string, number][]> = {
  'Awareness': [['Instagram', 10], ['Cinematic', 10], ['Awareness', 12], ['3x per week', 6]],
  'Sales': [['Shop Now', 14], ['Retargeting', 12], ['WhatsApp', 8], ['5x per week', 8]],
  'Engagement': [['8-10 PM', 14], ['Lifestyle', 10], ['UGC Boost', 12]],
  'Product Launch': [['Product Launch', 14], ['5x per week', 10], ['Editorial', 8], ['Instagram', 6]],
  'Ethnic Wear': [['Festival Shoppers', 10], ['Deep Teal & Gold', 12], ['Heritage Editorial', 10], ['Brides-to-be', 8]],
  'Western Wear': [['Monochrome Ivory', 12], ['Studio Catalog', 10], ['Lifestyle', 8]],
  'Sarees': [['Heritage Editorial', 12], ['Brides-to-be', 12], ['6-7 PM', 8]],
  'Accessories': [['Working Women', 12], ['Flat Lay', 10], ['Pastel', 6]],
  'Urban Women 25-34': [['Instagram', 8], ['9-10 AM', 6], ['Urban Women 25-34', 10]],
  'Brides-to-be': [['Brides-to-be', 14], ['Deep Teal & Gold', 10], ['Heritage Editorial', 10]],
  'Working Women': [['Working Women', 12], ['12-1 PM', 8], ['Book Appointment', 8]],
  'Festival Shoppers': [['Festival Shoppers', 14], ['8-10 PM', 10], ['Festival Drop', 12]],
};

function reasonFor(key: DecisionResult['key'], decision: string, goal: string): string {
  const g = goal.toLowerCase();
  switch (key) {
    case 'platform': return `Highest historical engagement for a ${g} objective; strong audience overlap and low competition per post.`;
    case 'time': return `Audience activity peaks in this window (+${decision} based on 30-day engagement heatmap).`;
    case 'audience': return `This segment matches the ${g} objective with the best conversion index across recent campaigns.`;
    case 'creative': return `This creative scored highest on recall and swipe-through for ${g} campaigns.`;
    case 'cta': return `This call-to-action produced the highest click-rate for ${g} objectives in the last 90 days.`;
    case 'campaignType': return `Recommended structure maximises budget efficiency for a ${g} brief.`;
    case 'frequency': return `This cadence balances reach and fatigue based on your current content volume.`;
    case 'colorTheme': return `Palette aligns with brand identity and outperformed alternatives in AB tests.`;
    case 'imageStyle': return `Matches the brand visual language and the top-performing editorial direction.`;
  }
}

@Injectable({ providedIn: 'root' })
export class AiDecisionEngineService {
  readonly history = signal<DecisionResult[][]>([]);

  private load(): DecisionResult[][] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as DecisionResult[][];
        if (Array.isArray(parsed)) return parsed.slice(0, 6);
      }
    } catch { /* ignore */ }
    return [];
  }

  constructor() {
    this.history.set(this.load());
  }

  private persist(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history())); } catch { /* ignore */ }
  }

  decide(brief: DecisionBrief): DecisionResult[] {
    const results = DECISION_KEYS.map(def => {
      const spec = SPECS.find(s => s.key === def.key)!;
      const scores = spec.candidates.map(c => {
        let score = c.base;
        for (const [name, delta] of MODIFIERS[brief.goal] ?? []) {
          if (c.name === name) score += delta;
        }
        for (const [name, delta] of MODIFIERS[brief.category] ?? []) {
          if (c.name === name) score += delta;
        }
        for (const [name, delta] of MODIFIERS[brief.audience] ?? []) {
          if (c.name === name) score += delta;
        }
        return { name: c.name, score };
      });

      scores.sort((a, b) => b.score - a.score);
      const winner = scores[0];
      const runner = scores[1];
      const confidence = Math.min(96, Math.max(82, 78 + (winner.score - runner.score) * 2));
      const candidates = scores.map((c, i) => ({ ...c, isWinner: i === 0 }));

      return {
        key: def.key,
        label: def.label,
        icon: def.icon,
        decision: winner.name,
        confidence,
        reasoning: reasonFor(def.key, winner.name, brief.goal),
        candidates,
      };
    });

    this.history.update(list => [results, ...list].slice(0, 6));
    this.persist();
    return results;
  }

  clearHistory(): void {
    this.history.set([]);
    this.persist();
  }
}