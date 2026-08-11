import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CampaignScoringService {
  CalculateScore(_data: any): number {
    throw new Error('Not implemented');
  }

  CalculateROI(_data: any): number {
    throw new Error('Not implemented');
  }

  CalculatePriority(_data: any): string {
    throw new Error('Not implemented');
  }
}