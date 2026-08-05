import { Injectable, signal } from '@angular/core';
import {
  CAMPAIGN_DELIVERABLES,
  CampaignItem,
  CampaignResult,
  DeliverableType,
  wordCount,
} from '../models/campaign-generator.model';

const STORAGE_KEY = 'vrindaya_campaign_generator_history';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

@Injectable({ providedIn: 'root' })
export class CampaignGeneratorService {
  readonly history = signal<CampaignResult[]>(this.load());

  private load(): CampaignResult[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CampaignResult[];
        if (Array.isArray(parsed)) return parsed.slice(0, 8);
      }
    } catch { /* ignore */ }
    return [];
  }

  private persist(): void {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history())); } catch { /* ignore */ }
  }

  generate(productName: string, tone: string): CampaignResult {
    const items = CAMPAIGN_DELIVERABLES.map(def => {
      const content = this.contentFor(def.type, productName.trim(), tone);
      return { type: def.type, content, words: wordCount(content) };
    });

    const result: CampaignResult = {
      id: uid(),
      productName: productName.trim(),
      tone,
      createdAt: new Date().toISOString(),
      items,
    };

    this.history.update(list => [result, ...list].slice(0, 8));
    this.persist();
    return result;
  }

  regenerateItem(item: CampaignItem, productName: string, tone: string): CampaignItem {
    const content = this.contentFor(item.type, productName.trim(), tone);
    return { ...item, content, words: wordCount(content) };
  }

  clearHistory(): void {
    this.history.set([]);
    this.persist();
  }

  private contentFor(type: DeliverableType, product: string, tone: string): string {
    const t = tone.toLowerCase();
    const lines: string[] = [];

    switch (type) {
      case 'instagram-post':
        lines.push(`Meet ${product} — crafted for moments that deserve more than ordinary.`);
        lines.push(`From the intricate detailing to the effortless drape, every stitch carries the Vrindaya promise of ${t.includes('luxury') ? 'quiet luxury' : 'timeless elegance'}.`);
        lines.push(`Style it your way this season and let the compliments do the talking.`);
        lines.push('');
        lines.push(`${product} is now live on the Vrindaya store.`);
        lines.push(`Link in bio to shop.`);
        lines.push('');
        lines.push(`#Vrindaya #${product.replace(/\s+/g, '')} #FestiveEdit #EthnicLuxury`);
        break;

      case 'instagram-reel':
        lines.push(`HOOK: “Wait for the moment she walks in wearing ${product}…”`);
        lines.push(`BEAT 1: 0-2s — slow zoom on the zari detailing, soft light.`);
        lines.push(`BEAT 2: 2-5s — model turns; fabric flow in slow motion.`);
        lines.push(`BEAT 3: 5-8s — styling flat-lay cut: jhumkas + potli + ${product}.`);
        lines.push(`BEAT 4: 8-11s — quick outfit change, front + back view.`);
        lines.push(`BEAT 5: 11-14s — card: “Shop ${product}” + CTA “Link in bio”.`);
        lines.push(`AUDIO: trending festive instrumental, beat-drop on reveal.`);
        lines.push(`CAPTION: Make every entrance a memory. ${product} is live now.`);
        break;

      case 'story':
        lines.push(`Quick style drop: ${product}`);
        lines.push(`Tap “Styles” for 3 ways to wear it.`);
        lines.push(`Swipe up to shop — limited sizes left.`);
        lines.push(`Poll: Classic gold or modern silver for the accessories?`);
        break;

      case 'carousel':
        lines.push(`Slide 1 — COVER: “${product} — Your new festive favourite”`);
        lines.push(`Slide 2 — The fabric story: handcrafted comfort with a premium finish.`);
        lines.push(`Slide 3 — The detail: zari work, neat seams, luxurious drape.`);
        lines.push(`Slide 4 — Style guide: 3 looks from day to evening.`);
        lines.push(`Slide 5 — Why you'll love it + size & care notes.`);
        lines.push(`Slide 6 — CTA: Shop ${product} at Vrindaya, link in bio.`);
        break;

      case 'pinterest':
        lines.push(`Title: ${product} | Festive Ethnic Style Idea`);
        lines.push(`Description: Discover ${product} from Vrindaya — premium craftsmanship, elegant silhouette and easy styling tips. Save this pin for your next festive edit.`);
        lines.push(`Tags: #EthnicWear #FestiveFashion #Vrindaya #IndianFashion`);
        break;

      case 'banner':
        lines.push(`HEADLINE: ${product}`);
        lines.push(`SUBHEAD: Heritage craftsmanship. Modern elegance.`);
        lines.push(`MESSAGE: The season's most-loved piece is here. Explore the ${product} collection.`);
        lines.push(`CTA: SHOP NOW`);
        lines.push(`NOTES: gold-on-deep-teal palette, editorial model shot, 16:9 desktop / 4:5 mobile.`);
        break;

      case 'seo':
        lines.push(`Meta Title: Buy ${product} Online | Premium Ethnic Wear — Vrindaya`);
        lines.push(`Meta Description: Shop ${product} at Vrindaya. Handcrafted, premium ethnic wear with free shipping and easy returns on orders above ₹2,999.`);
        lines.push(`Keywords: ${product.toLowerCase()}, ethnic wear online, luxury ethnic wear, designer ${product.toLowerCase()}, Vrindaya collection`);
        lines.push(`URL slug: vrindaya.com/collections/${product.toLowerCase().replace(/\s+/g, '-')}`);
        break;

      case 'flipkart':
        lines.push(`Product Title: Vrindaya ${product} — Premium Handcrafted Ethnic Wear`);
        lines.push(`Highlights: · Handcrafted premium fabric · Elegant festive silhouette · True-to-size fit · Easy returns`);
        lines.push(`Description: The ${product} from Vrindaya brings heritage craftsmanship to your wardrobe. Designed for festive occasions with a flattering cut and a soft, premium finish.`);
        lines.push(`Terms: Free delivery on prepaid orders · 7-day return · COD available.`);
        break;

      case 'email':
        lines.push(`Subject: ${product} just landed`);
        lines.push(`Preheader: Crafted for your festive moments — shop now.`);
        lines.push(`Body: Dear Vrindaya family,`);
        lines.push(`We are thrilled to introduce ${product}. Heritage craftsmanship, modern comfort and an elegant silhouette designed to turn heads.`);
        lines.push(`Shop the collection this week and enjoy free shipping on orders above ₹2,999.`);
        lines.push(`CTA: SHOP ${product.toUpperCase()} →`);
        break;

      case 'whatsapp':
        lines.push(`Hi! ${product} is here`);
        lines.push(`Handcrafted, premium and made for your festive moments.`);
        lines.push(`Order today — limited stock · free delivery over ₹2,999.`);
        lines.push(`Reply “SHOP” for the link.`);
        break;
    }

    const intro = `Campaign: ${product} · Tone: ${tone}`;
    return [intro, ...lines].join('\n');
  }
}