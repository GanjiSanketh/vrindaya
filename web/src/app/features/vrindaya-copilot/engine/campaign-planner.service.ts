import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface CampaignPlan {
  platform?: string;
  contentType?: string;
  goal?: string;
  steps?: string[];
}

export interface PlanValidationResult {
  valid: boolean;
  errors?: string[];
}

@Injectable({ providedIn: 'root' })
export class CampaignPlannerService {
  createPlan(): Observable<CampaignPlan> {
    return of({
      platform: 'instagram',
      contentType: 'reel',
      goal: 'awareness',
      steps: ['Draft script', 'Generate visuals', 'Review output'],
    });
  }

  validatePlan(): Observable<PlanValidationResult> {
    return of({
      valid: true,
      errors: [],
    });
  }
}
