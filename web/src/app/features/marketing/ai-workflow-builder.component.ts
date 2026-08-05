import { Component, ChangeDetectionStrategy, signal } from '@angular/core';

interface WorkflowStep {
  id: string;
  phase: string;
  title: string;
  description: string;
  icon: string;
  status: 'completed' | 'active' | 'upcoming';
}

@Component({
  selector: 'app-ai-workflow-builder',
  standalone: true,
  imports: [],
  template: `
    <div class="awb-page">
      <div class="awb-header">
        <h1 class="awb-title">AI Workflow Builder</h1>
        <p class="awb-desc">Visualize and manage your content creation pipeline from brand profile to publish.</p>
      </div>

      <div class="awb-flow">
        @for (step of steps(); track step.id) {
          <div class="awb-step-wrapper">
            <div class="awb-step" [class.awb-step-completed]="step.status === 'completed'" [class.awb-step-active]="step.status === 'active'" [class.awb-step-upcoming]="step.status === 'upcoming'">
              <div class="awb-step-icon">
                <i class="bi {{ step.icon }}"></i>
              </div>
              <div class="awb-step-body">
                <span class="awb-step-phase">{{ step.phase }}</span>
                <h3 class="awb-step-title">{{ step.title }}</h3>
                <p class="awb-step-desc">{{ step.description }}</p>
              </div>
              <div class="awb-step-status">
                @if (step.status === 'completed') {
                  <i class="bi bi-check-circle-fill awb-status-done"></i>
                }
                @if (step.status === 'active') {
                  <span class="awb-status-live">Live</span>
                }
                @if (step.status === 'upcoming') {
                  <i class="bi bi-circle awb-status-pending"></i>
                }
              </div>
            </div>
            @if (!$last) {
              <div class="awb-connector">
                <div class="awb-connector-line"></div>
                <i class="bi bi-arrow-down-circle awb-connector-arrow"></i>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styleUrl: './ai-workflow-builder.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiWorkflowBuilderComponent {
  steps = signal<WorkflowStep[]>([
    { id: '1', phase: 'Setup', title: 'Brand Profile', description: 'Define your brand identity, story, tone, and visual guidelines.', icon: 'bi-person-badge', status: 'completed' },
    { id: '2', phase: 'Setup', title: 'Product', description: 'Select and configure the product details for content generation.', icon: 'bi-box-seam', status: 'completed' },
    { id: '3', phase: 'Setup', title: 'Knowledge Base', description: 'Reference fashion knowledge, trends, and brand guidelines.', icon: 'bi-book', status: 'completed' },
    { id: '4', phase: 'Setup', title: 'Brand Voice', description: 'Set the tone, vocabulary, and style for all generated content.', icon: 'bi-megaphone', status: 'completed' },
    { id: '5', phase: 'Creation', title: 'Prompt Builder', description: 'Construct the prompt with reference product, camera, lighting, and style details.', icon: 'bi-code-slash', status: 'completed' },
    { id: '6', phase: 'Creation', title: 'AI', description: 'AI processes the prompt and generates the initial content draft.', icon: 'bi-robot', status: 'active' },
    { id: '7', phase: 'Creation', title: 'Image Prompt', description: 'Refine the image generation prompt with aspect ratio, negative prompts, and style.', icon: 'bi-camera', status: 'upcoming' },
    { id: '8', phase: 'Finalize', title: 'Preview', description: 'Review the generated content in the preview panel before publishing.', icon: 'bi-eye', status: 'upcoming' },
    { id: '9', phase: 'Finalize', title: 'Draft', description: 'Save the content as a draft for later editing or scheduling.', icon: 'bi-bookmark', status: 'upcoming' },
    { id: '10', phase: 'Finalize', title: 'Publish', description: 'Publish the final content to your chosen platform.', icon: 'bi-send', status: 'upcoming' },
  ]);
}