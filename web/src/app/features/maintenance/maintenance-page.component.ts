import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-maintenance-page',
  standalone: true,
  template: `
    <div class="mp-container">
      <div class="mp-bg-ornament mp-bg-ornament--1"></div>
      <div class="mp-bg-ornament mp-bg-ornament--2"></div>
      <div class="mp-bg-ornament mp-bg-ornament--3"></div>

      <div class="mp-card">
        <div class="mp-logo">
          <svg viewBox="0 0 260 60" class="mp-logo-svg" aria-label="Vrindaya">
            <text x="130" y="36" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="30" font-weight="700" fill="#8B5E3C" letter-spacing="4">VRINDAYA</text>
            <line x1="50" y1="46" x2="210" y2="46" stroke="#D4A574" stroke-width="0.8" />
            <text x="130" y="55" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="9" fill="#B8860B" letter-spacing="6">WEAR THE GRACE</text>
          </svg>
        </div>

        <h1 class="mp-headline">We're Crafting<br />Something Beautiful</h1>

        <p class="mp-subtext">
          Our new shopping experience is currently under development.
          We're working hard to bring you a premium ethnic fashion destination.
          Please check back soon.
        </p>

        <div class="mp-badge-wrap">
          <div class="mp-badge">Coming Soon</div>
          <p class="mp-status">Launching Soon &bull; Thank you for your patience</p>
        </div>

        <div class="mp-social">
          <p class="mp-social-label">Follow Vrindaya on Instagram</p>
          <a href="https://instagram.com/vrindaya.co" target="_blank" rel="noopener noreferrer" class="mp-btn mp-btn--ig">
            <i class="bi bi-instagram"></i> Follow &#64;vrindaya.co
          </a>
        </div>

        <div class="mp-footer">
          <p class="mp-footer-brand">&copy; Vrindaya</p>
          <p class="mp-footer-tagline">Wear The Grace</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; background: linear-gradient(160deg, #faf6f0 0%, #f5ede4 40%, #efe4d8 100%); position: relative; overflow: hidden; }

    .mp-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 2rem 1rem; position: relative; z-index: 1; }

    /* ── Background ethnic ornaments ── */
    .mp-bg-ornament { position: fixed; border-radius: 50%; pointer-events: none; z-index: 0; }
    .mp-bg-ornament--1 { width: 500px; height: 500px; background: radial-gradient(circle, #D4A574, transparent 70%); opacity: 0.07; top: -120px; left: -100px; animation: mpFloat 18s ease-in-out infinite; }
    .mp-bg-ornament--2 { width: 400px; height: 400px; background: radial-gradient(circle, #B8860B, transparent 70%); opacity: 0.06; bottom: -100px; right: -80px; animation: mpFloat 22s ease-in-out infinite reverse; }
    .mp-bg-ornament--3 { width: 250px; height: 250px; background: radial-gradient(circle, #8B5E3C, transparent 70%); opacity: 0.05; top: 50%; left: 50%; transform: translate(-50%, -50%); animation: mpFloat 26s ease-in-out infinite 2s; }

    @keyframes mpFloat {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(30px, -20px) scale(1.05); }
      66% { transform: translate(-20px, 15px) scale(0.95); }
    }

    /* ── Card ── */
    .mp-card { position: relative; z-index: 1; max-width: 500px; width: 100%; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(12px); border-radius: 24px; padding: 3rem 2.5rem 2rem; text-align: center; box-shadow: 0 8px 40px rgba(139, 94, 60, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04); border: 1px solid rgba(212, 165, 116, 0.15); animation: mpFadeIn 1s ease-out; }

    @keyframes mpFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

    /* ── Logo ── */
    .mp-logo { margin-bottom: 2rem; display: flex; justify-content: center; }
    .mp-logo-svg { width: 220px; height: auto; display: block; }

    /* ── Headline ── */
    .mp-headline { font-family: Georgia, 'Times New Roman', serif; font-size: 1.85rem; font-weight: 400; color: #5C3A21; margin: 0 0 1.25rem; line-height: 1.4; letter-spacing: 0.01em; }

    /* ── Subtext ── */
    .mp-subtext { font-size: 0.92rem; line-height: 1.85; color: #7A6450; margin: 0 auto 1.75rem; max-width: 380px; }

    /* ── Badge ── */
    .mp-badge-wrap { margin-bottom: 2rem; }
    .mp-badge { display: inline-block; padding: 0.5rem 2rem; border: 1px solid #D4A574; border-radius: 100px; font-size: 0.8rem; font-weight: 600; color: #8B5E3C; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 0.6rem; }
    .mp-status { font-family: Georgia, 'Times New Roman', serif; font-size: 0.82rem; font-style: italic; color: #B8860B; margin: 0; letter-spacing: 0.5px; }

    /* ── Social ── */
    .mp-social { }
    .mp-social-label { font-size: 0.82rem; color: #7A6450; margin: 0 0 0.85rem; letter-spacing: 1px; }

    /* ── Button ── */
    .mp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0.75rem 2rem; border-radius: 100px; font-size: 0.9rem; font-weight: 500; text-decoration: none; transition: all 0.25s ease; min-width: 200px; border: none; cursor: pointer; }
    .mp-btn--ig { background: #1C7E7A; color: #fff; }
    .mp-btn--ig:hover { background: #166662; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(28, 126, 122, 0.3); }
    .mp-btn--ig i { font-size: 1.1rem; }

    /* ── Footer ── */
    .mp-footer { margin-top: 2rem; padding-top: 1.25rem; border-top: 1px solid rgba(212, 165, 116, 0.15); }
    .mp-footer-brand { font-family: Georgia, 'Times New Roman', serif; font-size: 0.92rem; color: #5C3A21; margin: 0 0 0.15rem; letter-spacing: 2px; }
    .mp-footer-tagline { font-size: 0.7rem; color: #B8860B; margin: 0; letter-spacing: 3px; text-transform: uppercase; }

    /* ── Responsive ── */
    @media (max-width: 480px) {
      .mp-card { padding: 2rem 1.5rem 1.5rem; border-radius: 16px; }
      .mp-headline { font-size: 1.45rem; }
      .mp-subtext { font-size: 0.85rem; }
      .mp-btn { min-width: 160px; padding: 0.65rem 1.25rem; font-size: 0.82rem; }
      .mp-logo-svg { width: 180px; }
      .mp-bg-ornament--1 { width: 300px; height: 300px; top: -80px; left: -60px; }
      .mp-bg-ornament--2 { width: 250px; height: 250px; bottom: -60px; right: -50px; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenancePageComponent {}
