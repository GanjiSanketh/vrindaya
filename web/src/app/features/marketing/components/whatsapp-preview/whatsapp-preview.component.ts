import { Component, computed, input } from '@angular/core';

@Component({
  selector:    'app-whatsapp-preview',
  standalone:  true,
  templateUrl: './whatsapp-preview.component.html',
  styleUrl:    './whatsapp-preview.component.css',
})
export class WhatsAppPreviewComponent {
  readonly businessName = input('Vrindaya');
  readonly message      = input('');
  readonly imageUrl      = input<string | undefined>(undefined);
  readonly buttonUrl     = input<string | undefined>(undefined);

  readonly hasContent = computed(() => !!this.message().trim() || !!this.imageUrl());

  readonly currentTime = computed(() =>
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  );
}
