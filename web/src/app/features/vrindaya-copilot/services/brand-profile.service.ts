import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { BrandProfile } from '../models/brand-profile.model';

@Injectable({ providedIn: 'root' })
export class BrandProfileService {
  getBrandProfile(): Observable<BrandProfile> {
    return of({
      brandName: 'Vrindaya',
      brandStory:
        'Vrindaya helps modern brands craft meaningful, consistent content that resonates with their audience.',
      usp: 'Consistent, on-brand content generated at scale.',
      tone: 'Professional, friendly, and approachable.',
      targetAudience: 'Marketing teams and content creators.',
      ctaStyle: 'Clear, action-oriented call-to-actions.',
      emojiStyle: 'Subtle and purposeful.',
      writingStyle: 'Concise, engaging, and clear.',
      preferredPlatforms: 'Instagram, LinkedIn, Email',
      preferredLanguage: 'English',
    });
  }
}
