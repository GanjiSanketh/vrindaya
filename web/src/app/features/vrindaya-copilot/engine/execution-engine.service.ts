import { Injectable, inject } from '@angular/core';
import { Observable, of, from } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { IntentResolverService, ResolvedIntent } from './intent-resolver.service';
import { CampaignPlannerService, CampaignPlan } from './campaign-planner.service';
import { PromptBuilderService } from '../prompt-builder/prompt-builder.service';
import { ProviderManagerService } from '../providers/provider-manager.service';
import { ExecuteResponse, ExecuteCampaignResult } from '../models/execute-response.model';

@Injectable({ providedIn: 'root' })
export class ExecutionEngineService {
  private readonly intentResolver = inject(IntentResolverService);
  private readonly campaignPlanner = inject(CampaignPlannerService);
  private readonly promptBuilder = inject(PromptBuilderService);
  private readonly providerManager = inject(ProviderManagerService);

  execute(): Observable<ExecuteResponse> {
    const startedAt = Date.now();
    return this.intentResolver.resolve().pipe(
      switchMap(intent =>
        this.campaignPlanner.createPlan().pipe(
          switchMap(plan => {
            const prompt = this.promptBuilder.buildCampaignPrompt();
            return from(this.providerManager.execute(prompt)).pipe(
              map(output => this.buildResponse(output, intent, plan, prompt, startedAt)),
            );
          }),
        ),
      ),
    );
  }

  executeCampaign(): Observable<ExecuteResponse> {
    const startedAt = Date.now();
    return this.intentResolver.resolve().pipe(
      switchMap(intent =>
        this.campaignPlanner.createPlan().pipe(
          switchMap(plan => {
            const prompt = this.promptBuilder.buildCampaignPrompt();
            return from(this.providerManager.execute(prompt)).pipe(
              map(output => {
                const campaign: ExecuteCampaignResult = {
                  id: `campaign-${startedAt}`,
                  title: `${intent.contentType || 'Campaign'} for ${intent.platform || 'social'}`,
                  status: 'success',
                };
                return {
                  ...this.buildResponse(output, intent, plan, prompt, startedAt),
                  campaign,
                };
              }),
            );
          }),
        ),
      ),
    );
  }

  executePrompt(): Observable<ExecuteResponse> {
    const startedAt = Date.now();
    const prompt = this.promptBuilder.buildCaptionPrompt();
    return from(this.providerManager.execute(prompt)).pipe(
      map(output => this.buildResponse(output, undefined, undefined, prompt, startedAt)),
    );
  }

  cancel(): Observable<void> {
    return of(undefined);
  }

  private buildResponse(
    output: string,
    intent: ResolvedIntent | undefined,
    plan: CampaignPlan | undefined,
    prompt: string,
    startedAt: number,
  ): ExecuteResponse {
    const intentInfo = intent?.platform ? ` [${intent.platform}/${intent.contentType || 'any'}]` : '';
    const steps = plan?.steps ? `\nSteps: ${plan.steps.join(' -> ')}` : '';
    return {
      conversationId: `conversation-${startedAt}`,
      response: `${output || `Mock response to: "${prompt}"`}${intentInfo}${steps}`,
      tokens: {
        input: prompt.length,
        output: output ? output.length : 0,
        total: (prompt.length || 0) + (output ? output.length : 0),
      },
      provider: this.providerManager.getCurrentProvider().name,
      executionTime: Date.now() - startedAt,
      status: 'success',
      errors: [],
    };
  }
}
