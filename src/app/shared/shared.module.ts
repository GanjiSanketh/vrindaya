/**
 * Shared barrel — import from here in feature components.
 *
 * Exports the reusable building blocks available to all features:
 *   Components : ProductCard
 *   Directives : ScrollRevealDirective
 *   Utils      : sortProducts
 *
 * Rules:
 *  - shared/ may import from core/ but NEVER from features/
 *  - Add a component here only when ≥2 features need it
 */

export { ProductCard }            from './components/product-card/product-card';
export { ScrollRevealDirective }  from './directives/scroll-reveal.directive';
export { sortProducts }           from './utils/sort.util';
