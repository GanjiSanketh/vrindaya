# Vrindaya Project Memory

## Core Principles & Operational Directives

1. **Never Redesign Existing UI**:
   - Preserve the existing design system, layout boundaries, responsive behavior, and visual styles.
   - Do not redesign or alter working UI components unless explicitly requested.

2. **Never Duplicate Firestore Collections**:
   - Reuse existing collections (`products`, `productVariants`, `categories`, `marketingSubscribers`, `campaigns`, `campaignExecutions`, `campaignRecipients`, `marketplaceListings`, `marketplaceSyncs`, `marketplaceProducts`, `marketplaceLogs`, `marketplacePlatforms`).
   - Do not create parallel top-level collections for existing entities.

3. **Reuse Existing Services**:
   - Use pre-existing services (`ProductApiService`, `ProductService`, `CategoryService`, `AdminAuthService`, `AiProviderSettingsService`, `MarketplaceListingService`, `MarketplaceSyncService`, etc.).
   - Avoid creating duplicate service classes that replicate existing functionality.

4. **Reuse Signals**:
   - Rely on Angular Signals (`signal()`, `computed()`, `effect()`) for reactive state management.
   - Avoid introducing duplicated state or unneeded RxJS subjects when Signals can be reused or computed.

5. **Keep Standalone Angular Components**:
   - Maintain Angular Standalone Component architecture across the entire `web/` application.
   - Do not introduce `NgModule` wrappers.

6. **Preserve Lazy Loading**:
   - Keep route-level code splitting intact in `app.routes.ts`, `admin.routes.ts`, and `marketplace.routes.ts`.
   - Ensure all feature modules and page components are lazy-loaded via `loadChildren` or `loadComponent`.

7. **Follow SOLID Principles**:
   - Maintain Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion throughout frontend and backend code.

8. **Keep Angular Build Passing**:
   - Ensure `npm run build` succeeds cleanly without compilation or type errors after every task.

9. **Never Hardcode API Keys or Secrets**:
   - Never embed credentials, tokens, or API keys directly in source code.
   - Store settings securely in environment variables, backend configuration, or user-configurable local settings.

10. **Keep AI Providers Generic**:
    - Build against the `IAIProvider` interface contract and `AIProviderFactory`.
    - Never reference specific provider implementations (OpenAI, Gemini, Claude, Azure, Ollama, OpenRouter) directly in domain feature code.

11. **Keep Marketplace Providers Generic**:
    - Maintain a provider-agnostic architecture for multi-channel marketplace platforms (Amazon, Flipkart, Myntra, Meesho, Ajio, Tata CLiQ).
    - Never hardcode channel-specific business logic outside dedicated channel provider implementations.

12. **Never Replace Existing Architecture**:
    - Respect the dual Angular 21 frontend + ASP.NET Core 9 Web API backend structure linked by Firebase Firestore.
    - Do not refactor core architectural abstractions without explicit authorization.

13. **Prefer Editing Existing Files Over Creating Replacements**:
    - Modify and extend existing files rather than creating duplicate, redundant, or `-new` replacement files.

14. **Every Feature Must Be Production Ready**:
    - Code must be fully implemented, fully typed, error-handled, and free of placeholder logic or `TODO` comments.

---

## Repository Architecture Map

- **`web/`**: Angular 21 storefront & admin portal (`src/app/core/`, `features/`, `shared/`, `layout/`).
- **`api/`**: ASP.NET Core 9 Web API (`Controllers/`, `Services/`, `Interfaces/`, `Models/`, `Middleware/`, `Extensions/`).
- **`firebase.json` / `firestore.rules` / `storage.rules`**: Firebase project rules and indexes.
