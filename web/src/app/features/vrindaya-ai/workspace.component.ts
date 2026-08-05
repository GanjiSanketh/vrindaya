import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-workspace',
  standalone: true,
  imports: [],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceComponent {}