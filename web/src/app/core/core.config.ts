/**
 * Core module boundary — everything in core/ is singleton, app-wide.
 *
 * Rules enforced by convention (no NgModule needed in standalone Angular):
 *  - Services    → core/services/   (providedIn: 'root' only)
 *  - Models      → core/models/     (interfaces + types only, no classes)
 *  - Constants   → core/constants/  (const objects, no mutating state)
 *  - Guards      → core/guards/     (CanActivate / CanMatch)
 *  - Interceptors→ core/interceptors/
 *
 * Nothing in core/ may import from features/ or shared/.
 * Features may import from core/. Shared may import from core/.
 */
export const CORE_VERSION = '1.0.0';
