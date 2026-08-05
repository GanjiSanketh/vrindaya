import { Injectable } from '@angular/core';
import { PromptTemplateLoaderService } from './prompt-template-loader.service';
import { ProductContextService } from '../services/product-context.service';
import { ProductContext } from '../models/product-context.model';

@Injectable({ providedIn: 'root' })
export class PromptBuilderService {
  private productContext: ProductContext = {};

  constructor(
    private templateLoader: PromptTemplateLoaderService,
    private productContextService: ProductContextService
  ) {
    this.productContextService.getMockProductContext().subscribe((context) => {
      this.productContext = context;
    });
  }

  buildCampaignPrompt(userRequest: string = ''): string {
    const template = this.templateLoader.loadTemplate('campaign', 'overview');
    return [
      `Product Context:\n${this.formatProductContext(this.productContext)}`,
      `Brand Profile:\n${this.templateLoader.loadBrandProfile()}`,
      `Brand Voice:\n${this.templateLoader.loadBrandVoice()}`,
      `Audience:\n${this.templateLoader.loadAudience()}`,
      `Writing Guidelines:\n${this.templateLoader.loadWritingGuidelines()}`,
      `Prompt Template:\n${template}`,
      `User Request:\n${userRequest}`,
    ].join('\n\n');
  }

  buildCaptionPrompt(): string {
    return this.combine(this.templateLoader.loadTemplate('instagram', 'caption'));
  }

  buildReelPrompt(): string {
    return this.combine(this.templateLoader.loadTemplate('instagram', 'reel'));
  }

  buildImagePrompt(): string {
    return this.combine(this.templateLoader.loadTemplate('brand', 'image'));
  }

  private combine(template: string): string {
    return `You are a marketing assistant. ${template}`;
  }

  private formatProductContext(context: ProductContext): string {
    return Object.entries(context)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => {
        const formattedValue = Array.isArray(value) ? value.join(', ') : String(value);
        return `${key}: ${formattedValue}`;
      })
      .join('\n');
  }
}
