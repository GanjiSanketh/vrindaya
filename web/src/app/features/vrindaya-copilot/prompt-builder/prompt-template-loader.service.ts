import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PromptTemplateLoaderService {
  loadTemplate(category: string, name: string): string {
    return `Prompt template placeholder for ${category}/${name}`;
  }

  loadBrandProfile(): string {
    return 'Mock brand profile';
  }

  loadBrandVoice(): string {
    return 'Mock brand voice';
  }

  loadAudience(): string {
    return 'Mock target audience';
  }

  loadWritingGuidelines(): string {
    return 'Mock writing guidelines';
  }
}