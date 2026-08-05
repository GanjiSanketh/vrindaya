export type DecisionKey =
  | 'platform'
  | 'time'
  | 'audience'
  | 'creative'
  | 'cta'
  | 'campaignType'
  | 'frequency'
  | 'colorTheme'
  | 'imageStyle';

export interface DecisionCandidate {
  name: string;
  score: number;
  isWinner: boolean;
}

export interface DecisionResult {
  key: DecisionKey;
  label: string;
  icon: string;
  decision: string;
  confidence: number;
  reasoning: string;
  candidates: DecisionCandidate[];
}

export interface DecisionBrief {
  goal: string;
  category: string;
  audience: string;
}

export const DECISION_GOALS = ['Awareness', 'Sales', 'Engagement', 'Product Launch'];
export const DECISION_CATEGORIES = ['Ethnic Wear', 'Western Wear', 'Sarees', 'Accessories'];
export const DECISION_AUDIENCES = ['Urban Women 25-34', 'Brides-to-be', 'Working Women', 'Festival Shoppers'];

export const DECISION_KEYS: { key: DecisionKey; label: string; icon: string }[] = [
  { key: 'platform', label: 'Best Platform', icon: 'bi-grid-1x2' },
  { key: 'time', label: 'Best Time', icon: 'bi-clock' },
  { key: 'audience', label: 'Best Audience', icon: 'bi-people' },
  { key: 'creative', label: 'Best Creative Style', icon: 'bi-easel' },
  { key: 'cta', label: 'Best CTA', icon: 'bi-bullseye' },
  { key: 'campaignType', label: 'Best Campaign Type', icon: 'bi-megaphone' },
  { key: 'frequency', label: 'Best Posting Frequency', icon: 'bi-calendar-week' },
  { key: 'colorTheme', label: 'Best Color Theme', icon: 'bi-palette2' },
  { key: 'imageStyle', label: 'Best Image Style', icon: 'bi-image' },
];