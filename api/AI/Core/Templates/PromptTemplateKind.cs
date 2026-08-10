namespace Vrindaya.Api.AI.Core.Templates;

/// <summary>
/// Identifies a managed prompt template. Each kind maps to one templated LLM
/// prompt body loaded by the prompt template service from embedded resources
/// (or overridden via configuration) — never hardcoded in services.
/// </summary>
public enum PromptTemplateKind
{
    /// <summary>Full campaign-plan generation prompt.</summary>
    Campaign = 0,

    /// <summary>Flipkart listing optimization prompt (SEO title, description, bullets, keywords).</summary>
    Flipkart = 1,

    /// <summary>Instagram post caption generation prompt.</summary>
    Instagram = 2,

    /// <summary>Reels/short-form video script generation prompt.</summary>
    Reels = 3,

    /// <summary>Multi-slide carousel post generation prompt.</summary>
    Carousel = 4,

    /// <summary>Product intelligence analysis prompt.</summary>
    ProductIntelligence = 5,
}