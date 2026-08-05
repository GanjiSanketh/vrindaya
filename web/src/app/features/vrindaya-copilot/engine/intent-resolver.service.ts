import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface ResolvedIntent {
  platform?: string;
  contentType?: string;
  goal?: string;
}

@Injectable({ providedIn: 'root' })
export class IntentResolverService {
  resolve(): Observable<ResolvedIntent> {
    return of({
      platform: 'instagram',
      contentType: 'reel',
      goal: 'awareness',
    });
  }

  detectPlatform(): Observable<string> {
    return of('instagram');
  }

  detectContentType(): Observable<string> {
    return of('reel');
  }

  detectGoal(): Observable<string> {
    return of('awareness');
  }
}
