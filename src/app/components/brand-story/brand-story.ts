import { Component, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ScrollRevealDirective } from '../../shared/directives/scroll-reveal.directive';

@Component({
  selector: 'app-brand-story',
  imports: [ScrollRevealDirective],
  templateUrl: './brand-story.html',
  styleUrl: './brand-story.css',
})
export class BrandStory {
  private platformId = inject(PLATFORM_ID);

  scrollToProducts(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
