import { Injectable, signal } from '@angular/core';
import {
  ReviewCategory,
  ReviewIssue,
  ReviewResult,
} from '../models/ai-reviewer.model';

const STORAGE_KEY = 'vrindaya_ai_reviewer_history';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

interface Check {
  severity: ReviewIssue['severity'];
  ok: boolean;
  problem: string;
  suggestion: string;
}

@Injectable({ providedIn: 'root' })
export class AiReviewerService {
  readonly history = signal<ReviewResult[]>(this.loadHistory());

  private loadHistory(): ReviewResult[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ReviewResult[];
        if (Array.isArray(parsed)) return parsed.slice(0, 12);
      }
    } catch { /* ignore */ }
    return [];
  }

  private persistHistory(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history())); } catch { /* ignore */ }
  }

  review(category: ReviewCategory, content: string): ReviewResult {
    const checks = this.runChecks(category, content.trim());
    const failed = checks.filter(c => !c.ok);
    const penalty = failed.reduce((sum, c) => sum + (c.severity === 'high' ? 18 : c.severity === 'medium' ? 10 : 5), 0);
    const score = Math.max(15, Math.min(98, 100 - penalty + this.styleBonus(content)));

    const problems = failed.map(c => ({ severity: c.severity, problem: c.problem }));
    const suggestions = failed.map(c => c.suggestion);
    if (suggestions.length === 0) suggestions.push(`No major issues found for ${category.toLowerCase()}. Keep the voice consistent across posts.`);

    const result: ReviewResult = {
      id: uid(),
      category,
      content,
      score,
      verdict: this.verdictFor(score),
      problems,
      suggestions,
      improvements: this.improvementsFor(category, content),
      createdAt: new Date().toISOString(),
    };

    this.history.update(list => [result, ...list].slice(0, 12));
    this.persistHistory();
    return result;
  }

  clearHistory(): void {
    this.history.set([]);
    this.persistHistory();
  }

  private verdictFor(score: number): string {
    if (score >= 85) return 'Excellent — publish-ready';
    if (score >= 75) return 'Strong — minor polish needed';
    if (score >= 60) return 'Good — a few fixes advised';
    if (score >= 45) return 'Needs work — revise before publishing';
    return 'Weak — rewrite recommended';
  }

  private styleBonus(content: string): number {
    let bonus = 0;
    const lower = content.toLowerCase();
    if (/vrindaya/.test(lower)) bonus += 4;
    if (/(heritage|craftsmanship|elegant|premium|timeless|luxury|handcrafted)/.test(lower)) bonus += 3;
    if (/[!\?]$/.test(content.trim())) bonus += 2;
    if (/\p{Extended_Pictographic}/u.test(content)) bonus += 1;
    return Math.min(bonus, 6);
  }

  private improvementsFor(category: ReviewCategory, _content: string): string[] {
    const base: Record<ReviewCategory, string[]> = {
      'Caption': [
        'Open with an emotive first line that names the feeling before the product.',
        'Add a benefit-led middle sentence (occasion, fit, or versatility).',
        'Close with one clear action and a seasonal hashtag cluster.',
      ],
      'Image Prompt': [
        'Add camera and lens details to sharpen fidelity.',
        'Specify the color palette and negative prompt explicitly.',
        'State the aspect ratio for platform-optimised delivery.',
      ],
      'Hashtags': [
        'Mix 3 broad + 3 niche + 2 branded hashtags.',
        'Use camel-case for readability, e.g. #FestiveEdit.',
        'Rotate 2-3 hashtags per post to avoid repetition flags.',
      ],
      'Hook': [
        'Keep the hook under 12 words and front-load curiosity.',
        'Try a question, a contrast, or a surprising fact as an opener.',
        'Make the reward of reading obvious within the first line.',
      ],
      'Carousel': [
        'Use a strong cover slide with a bold benefit headline.',
        'End with a recap slide that restates the offer.',
        'Keep each slide under 20 words for swipe readability.',
      ],
      'Story': [
        'Add an interactive element (poll, question, or swipe-up).',
        'Tag the location and product for discoverability.',
        'Include a time-sensitive prompt to drive replies.',
      ],
      'CTA': [
        'Use one primary action verb and remove competing asks.',
        'Reduce friction — state shipping, returns, or price if relevant.',
        'Add a mild urgency or exclusivity signal without being pushy.',
      ],
      'SEO': [
        'Place the primary keyword early in the first 50 characters.',
        'Write for one intent per piece; avoid keyword stuffing.',
        'Pair keywords with a clear meta description of 50-160 chars.',
      ],
      'Grammar': [
        'Split run-on sentences for cleaner pacing.',
        'Standardise punctuation and spacing before publishing.',
        'Read aloud to catch rhythm issues automated checks miss.',
      ],
      'Brand Consistency': [
        'Anchor every post to Vrindaya and one brand pillar.',
        'Use consistent tone words: heritage, elegant, premium, timeless.',
        'Align visuals with the approved color palette and styling.',
      ],
    };
    return base[category];
  }

  private runChecks(category: ReviewCategory, content: string): Check[] {
    const checks: Check[] = [];
    const words = content.trim().split(/\s+/).filter(Boolean);
    const lower = content.toLowerCase();
    const trimmed = content.trim();

    const add = (severity: Check['severity'], ok: boolean, problem: string, suggestion: string) =>
      checks.push({ severity, ok, problem, suggestion });

    const minChars: Record<ReviewCategory, number> = {
      'Caption': 80, 'Image Prompt': 120, 'Hashtags': 20, 'Hook': 20, 'Carousel': 160,
      'Story': 20, 'CTA': 20, 'SEO': 40, 'Grammar': 40, 'Brand Consistency': 40,
    };
    const maxChars: Record<ReviewCategory, number> = {
      'Caption': 280, 'Image Prompt': 600, 'Hashtags': 160, 'Hook': 120, 'Carousel': 800,
      'Story': 160, 'CTA': 120, 'SEO': 160, 'Grammar': 600, 'Brand Consistency': 400,
    };

    if (content.length < minChars[category]) {
      add('high', false, `Too short — only ${content.length} characters (target ${minChars[category]}+).`, `Expand the ${category.toLowerCase()} to at least ${minChars[category]} characters with a clear message.`);
    } else if (content.length > maxChars[category]) {
      add('medium', false, `Too long — ${content.length} characters (cap ${maxChars[category]}).`, `Trim the ${category.toLowerCase()} to stay under ${maxChars[category]} characters for engagement.`);
    }

    if (/lorem|tbd|xxx|placeholder/i.test(content)) {
      add('high', false, 'Contains placeholder text (lorem / TBD).', 'Replace placeholders with real product details before publishing.');
    }
    if (/\s{2,}/.test(content)) {
      add('medium', false, 'Double spaces found.', 'Replace double spaces with single spaces.');
    }
    if (/^[a-z]/.test(trimmed)) {
      add('low', false, 'Does not start with a capital letter.', 'Capitalise the opening word for a polished look.');
    }

    if (category === 'Caption' || category === 'Hook' || category === 'Story') {
      if (words.length < 12 && category === 'Caption') {
        add('medium', false, 'Caption feels thin for storytelling.', 'Add an occasion, fabric, or styling detail to enrich the caption.');
      }
      if (!/[!\?]/.test(trimmed)) {
        add('low', false, 'No hook punctuation (question or exclamation).', 'Add a question or exclamation near the opening to lift emotion.');
      }
      const ctaWords = /\b(shop|buy|dm|link|checkout|order|explore|visit|contact|book)\b/.test(lower);
      if (!ctaWords) {
        add('medium', false, 'Missing a clear call-to-action.', 'End with one action such as "Shop the look" or "Link in bio".');
      }
    }

    if (category === 'Hashtags') {
      const tags = (content.match(/#[a-zA-Z0-9_]+/g) || []).length;
      if (tags < 3) add('medium', false, `Only ${tags} hashtag(s) detected.`, 'Use 5-8 hashtags mixing broad, niche and branded tags.');
      if (tags > 10) add('medium', false, `${tags} hashtags is excessive.`, 'Cap hashtags at 8 to avoid looking spammy.');
      if (/\s#/.test(content) && /#[a-z]+$/.test(content.trim())) {
        add('low', false, 'Hashtags use all-lowercase.', 'Use camel-case hashtags like #FestiveEdit for readability.');
      }
    }

    if (category === 'Carousel') {
      const slides = content.split(/\n+/).filter(l => l.trim().length > 0).length;
      if (slides < 3) add('medium', false, `Only ${slides} slide(s) defined.`, 'Break the carousel into 3-8 clear slides, one idea each.');
      if (slides > 8) add('medium', false, `${slides} slides may overstay.`, 'Keep carousels between 3 and 8 slides for swipe completion.');
    }

    if (category === 'CTA') {
      const verbs = /\b(shop|buy|book|grab|order|explore|discover|save|get)\b/.test(lower);
      if (!verbs) add('high', false, 'No strong action verb.', 'Lead with an action verb such as "Shop" or "Book".');
      if (/(and also|plus also|additionally)/.test(lower)) {
        add('low', false, 'Competing asks dilute the CTA.', 'Keep a single primary action; move extras into fine print.');
      }
    }

    if (category === 'SEO') {
      const keywordLen = words.length > 0 ? (lower.match(/vrindaya/g) || []).length : 0;
      if (keywordLen === 0) add('high', false, 'Primary keyword (Vrindaya) missing.', 'Place "Vrindaya" and a category keyword early in the text.');
      if (keywordLen > 4) add('low', false, 'Keyword density looks stuffed.', 'Limit keyword repeats to 2-3 natural occurrences.');
    }

    if (category === 'Grammar') {
      if ((content.match(/, and/g) || []).length >= 2) {
        add('medium', false, 'Run-on sentence pattern detected.', 'Break long compound sentences into shorter ones.');
      }
      if (/(^\w+ \w+ \w+ \w+ \w+ )\1/.test(content)) {
        add('medium', false, 'Possible repetitive phrasing.', 'Vary sentence openings for better rhythm.');
      }
    }

    if (category === 'Brand Consistency') {
      const brand = /vrindaya/.test(lower);
      if (!brand) add('high', false, 'Brand name not mentioned.', 'Anchor the post with the Vrindaya brand name.');
      const pillars = /(heritage|craftsmanship|elegant|premium|timeless|luxury|handcrafted)/.test(lower);
      if (!pillars) add('medium', false, 'No brand pillar language detected.', 'Weave in one tone word: heritage, elegant, premium or timeless.');
      if (/cheap|discount dump|sale flood/i.test(lower)) {
        add('low', false, 'Off-brand discounting language.', 'Present offers in a premium tone to protect brand equity.');
      }
    }

    if (category === 'Image Prompt') {
      if (!/(camera|canon|sony|fuji|nikon|lens|mm)/i.test(content)) {
        add('medium', false, 'No camera / lens direction.', 'Add a camera body and lens, e.g. "Canon EOS R5, 85mm f/1.4".');
      }
      if (!/(lighting|daylight|softbox|golden hour|low.?light)/i.test(lower)) {
        add('medium', false, 'Lighting not specified.', 'Define the lighting mood, e.g. soft daylight or golden hour.');
      }
      if (!/(palette|tone|color)/i.test(lower)) {
        add('low', false, 'Color palette not specified.', 'Name a palette such as earth tones or deep teal & gold.');
      }
      if (!/negative/i.test(lower)) {
        add('low', false, 'No negative prompt included.', 'Add a negative prompt to suppress artefacts and clutter.');
      }
    }

    if (checks.length === 0) {
      add('low', true, 'All structural checks passed.', 'You are all set — publish with confidence.');
    }

    return checks;
  }
}