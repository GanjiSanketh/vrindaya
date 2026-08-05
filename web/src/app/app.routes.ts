import { Routes } from '@angular/router';
import { APP_ROUTES } from './core/constants/routes.constants';

export const routes: Routes = [
  /* ── Main site shell (Header + Footer via LayoutComponent) ── */
  {
    path: '',
    loadComponent: () =>
      import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      {
        path: APP_ROUTES.HOME,
        loadChildren: () =>
          import('./features/home/home.routes').then(m => m.HOME_ROUTES),
      },
      {
        path: APP_ROUTES.CATEGORY,
        loadChildren: () =>
          import('./features/products/products.routes').then(m => m.PRODUCTS_ROUTES),
      },
      {
        path: APP_ROUTES.PRODUCT,
        loadChildren: () =>
          import('./features/product-detail/product-detail.routes').then(m => m.PRODUCT_DETAIL_ROUTES),
      },
      {
        path: APP_ROUTES.SHOP,
        loadChildren: () =>
          import('./features/shop/shop.routes').then(m => m.SHOP_ROUTES),
      },
      {
        path: APP_ROUTES.NEW_ARRIVALS,
        loadChildren: () =>
          import('./features/new-arrivals/new-arrivals.routes').then(m => m.NEW_ARRIVALS_ROUTES),
      },
      {
        path: APP_ROUTES.TRENDING,
        loadChildren: () =>
          import('./features/trending/trending.routes').then(m => m.TRENDING_ROUTES),
      },
      {
        path: 'wishlist',
        loadComponent: () =>
          import('./features/wishlist/wishlist-page.component').then(m => m.WishlistPageComponent),
      },
      {
        path: APP_ROUTES.NOT_FOUND,
        loadComponent: () =>
          import('./features/not-found/not-found.component').then(m => m.NotFoundComponent),
      },
      {
        path: 'offline',
        loadComponent: () =>
          import('./features/offline/offline.component').then(m => m.OfflineComponent),
      },
      {
        path: 'marketing/dashboard',
        loadComponent: () =>
          import('./features/marketing/marketing-dashboard.component').then(m => m.MarketingDashboardComponent),
      },
      {
        path: APP_ROUTES.CONTENT_CALENDAR,
        loadComponent: () =>
          import('./features/marketing/content-calendar.component').then(m => m.ContentCalendarComponent),
      },
      {
        path: APP_ROUTES.PROMPT_STUDIO,
        loadComponent: () =>
          import('./features/marketing/ai-image-prompt-studio.component').then(m => m.AiImagePromptStudioComponent),
      },
      {
        path: APP_ROUTES.FASHION_KNOWLEDGE,
        loadComponent: () =>
          import('./features/marketing/fashion-knowledge.component').then(m => m.FashionKnowledgeComponent),
      },
      {
        path: APP_ROUTES.BRAND_VOICE_TRAINER,
        loadComponent: () =>
          import('./features/marketing/brand-voice-trainer.component').then(m => m.BrandVoiceTrainerComponent),
      },
      {
        path: APP_ROUTES.CONTENT_QUALITY,
        loadComponent: () =>
          import('./features/marketing/content-quality-panel.component').then(m => m.ContentQualityPanelComponent),
      },
      {
        path: APP_ROUTES.PROMPT_TEMPLATE_ENGINE,
        loadComponent: () =>
          import('./features/marketing/prompt-template-engine.component').then(m => m.PromptTemplateEngineComponent),
      },
      {
        path: APP_ROUTES.AI_WORKFLOW_BUILDER,
        loadComponent: () =>
          import('./features/marketing/ai-workflow-builder.component').then(m => m.AiWorkflowBuilderComponent),
      },
      {
        path: APP_ROUTES.GENERATION_QUEUE,
        loadComponent: () =>
          import('./features/marketing/generation-queue.component').then(m => m.GenerationQueueComponent),
      },
      {
        path: APP_ROUTES.AI_COST_DASHBOARD,
        loadComponent: () =>
          import('./features/marketing/ai-cost-dashboard.component').then(m => m.AiCostDashboardComponent),
      },
      {
        path: APP_ROUTES.BRAND_ASSET_LIBRARY,
        loadComponent: () =>
          import('./features/marketing/brand-asset-library.component').then(m => m.BrandAssetLibraryComponent),
      },
      {
        path: APP_ROUTES.AI_REVIEW_PANEL,
        loadComponent: () =>
          import('./features/marketing/ai-review-panel.component').then(m => m.AiReviewPanelComponent),
      },
      {
        path: APP_ROUTES.AI_BRAIN_CONFIG,
        loadComponent: () =>
          import('./features/marketing/ai-brain-config.component').then(m => m.AiBrainConfigComponent),
      },
      {
        path: APP_ROUTES.AI_MEMORY,
        loadComponent: () =>
          import('./features/marketing/ai-memory.component').then(m => m.AiMemoryComponent),
      },
      {
        path: APP_ROUTES.PROMPT_ORCHESTRATOR,
        loadComponent: () =>
          import('./features/marketing/prompt-orchestrator.component').then(m => m.PromptOrchestratorComponent),
      },
      {
        path: APP_ROUTES.AI_AGENTS,
        loadComponent: () =>
          import('./features/marketing/ai-agents.component').then(m => m.AiAgentsComponent),
      },
      {
        path: APP_ROUTES.CAMPAIGN_PIPELINE,
        loadComponent: () =>
          import('./features/marketing/campaign-pipeline.component').then(m => m.CampaignPipelineComponent),
      },
      {
        path: APP_ROUTES.IMAGE_DIRECTOR,
        loadComponent: () =>
          import('./features/marketing/image-director.component').then(m => m.ImageDirectorComponent),
      },
      {
        path: APP_ROUTES.AI_REVIEWER,
        loadComponent: () =>
          import('./features/marketing/ai-reviewer.component').then(m => m.AiReviewerComponent),
      },
      {
        path: APP_ROUTES.MULTI_STEP_GENERATION,
        loadComponent: () =>
          import('./features/marketing/multi-step-generation.component').then(m => m.MultiStepGenerationComponent),
      },
      {
        path: APP_ROUTES.AI_PROVIDER,
        loadComponent: () =>
          import('./features/marketing/ai-provider.component').then(m => m.AiProviderComponent),
      },
      {
        path: APP_ROUTES.AI_ORCHESTRATOR,
        loadComponent: () =>
          import('./features/marketing/ai-orchestrator.component').then(m => m.AiOrchestratorComponent),
      },
      {
        path: APP_ROUTES.PIPELINE_DESIGNER,
        loadComponent: () =>
          import('./features/marketing/pipeline-designer.component').then(m => m.PipelineDesignerComponent),
      },
      {
        path: APP_ROUTES.CAMPAIGN_GENERATOR,
        loadComponent: () =>
          import('./features/marketing/campaign-generator.component').then(m => m.CampaignGeneratorComponent),
      },
      {
        path: APP_ROUTES.AI_DECISION_ENGINE,
        loadComponent: () =>
          import('./features/marketing/ai-decision-engine.component').then(m => m.AiDecisionEngineComponent),
      },
      {
        path: APP_ROUTES.FASHION_INTELLIGENCE,
        loadComponent: () =>
          import('./features/marketing/fashion-intelligence.component').then(m => m.FashionIntelligenceComponent),
      },
      {
        path: APP_ROUTES.MARKETING_STRATEGIST,
        loadComponent: () =>
          import('./features/marketing/marketing-strategist.component').then(m => m.MarketingStrategistComponent),
      },
      {
        path: APP_ROUTES.RECOMMENDATION_CENTER,
        loadComponent: () =>
          import('./features/marketing/recommendation-center.component').then(m => m.RecommendationCenterComponent),
      },
      {
        path: APP_ROUTES.AI_CEO_DASHBOARD,
        loadComponent: () =>
          import('./features/marketing/ai-ceo-dashboard.component').then(m => m.AiCeoDashboardComponent),
      },
      {
        path: APP_ROUTES.AI_TREND_ANALYSIS,
        loadComponent: () =>
          import('./features/marketing/trend-analysis.component').then(m => m.TrendAnalysisComponent),
      },
      {
        path: APP_ROUTES.AI_CONTENT_PLANNER,
        loadComponent: () =>
          import('./features/marketing/content-planner.component').then(m => m.ContentPlannerComponent),
      },
    ],
  },

  /* ── Admin shell (no header/footer) ── */
  {
    path: APP_ROUTES.ADMIN,
    loadChildren: () =>
      import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  },

  /* ── Fallback ── */
  { path: '**', redirectTo: '/not-found' },
];
