import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CampaignScoringService {
  CalculateScore(data: any): number {
    throw new Error('Not implemented');
  }

  CalculateROI(data: any): number {
    throw new Error('Not implemented');
  }

  CalculatePriority(data: any): string {
    throw new Error('Not implemented');
  }
}