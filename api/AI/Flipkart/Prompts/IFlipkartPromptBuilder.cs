using Vrindaya.Api.AI.Flipkart.DTOs;

namespace Vrindaya.Api.AI.Flipkart.Prompts;

/// <summary>
/// Generates specialized, Flipkart-optimized prompt guidance for producing
/// individual listing components (SEO title, product description, feature
/// bullets, search keywords and meta description) from a structured
/// <see cref="FlipkartListingRequest"/>.
///
/// This is a deterministic prompt-building layer — it never invokes an AI
/// provider. It reuses the project-wide <see cref="Vrindaya.Api.Utilities.PromptBuilder"/>
/// to author each component-specific prompt, enriching it with Flipkart SEO
/// constraints and the supplied product attributes.
/// </summary>
public interface IFlipkartPromptBuilder
{
    /// <summary>
    /// Builds a prompt for generating an SEO-optimized Flipkart listing title
    /// (Brand + Product Type + Key Attributes + Size/Color).
    /// </summary>
    string BuildSeoTitlePrompt(FlipkartListingRequest request);

    /// <summary>
    /// Builds a prompt for generating a detailed Flipkart product description
    /// covering features, fabric, fit, care instructions and usage guidance.
    /// </summary>
    string BuildProductDescriptionPrompt(FlipkartListingRequest request);

    /// <summary>
    /// Builds a prompt for generating concise, scannable key feature bullet points.
    /// </summary>
    string BuildBulletFeaturesPrompt(FlipkartListingRequest request);

    /// <summary>
    /// Builds a prompt for generating backend search keywords to maximize
    /// Flipkart discoverability.
    /// </summary>
    string BuildSearchKeywordsPrompt(FlipkartListingRequest request);

    /// <summary>
    /// Builds a prompt for generating an SEO-optimized meta description
    /// (max 160 characters) for the listing page.
    /// </summary>
    string BuildMetaDescriptionPrompt(FlipkartListingRequest request);
}
