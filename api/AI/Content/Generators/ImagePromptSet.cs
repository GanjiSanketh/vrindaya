namespace Vrindaya.Api.AI.Content.Generators;

/// <summary>
/// Platform-specific text-to-image prompts produced by the
/// <see cref="ImagePromptGenerator"/> for the same scene description. This is
/// prompt text only — no image generation happens here.
/// </summary>
public sealed class ImagePromptSet
{
    /// <summary>Natural-language prompt for ChatGPT Images (gpt-image / DALL·E).</summary>
    public string ChatGptImages { get; set; } = string.Empty;

    /// <summary>Tag-style prompt for Midjourney.</summary>
    public string Midjourney { get; set; } = string.Empty;

    /// <summary>Natural-language prompt for Flux.</summary>
    public string Flux { get; set; } = string.Empty;

    /// <summary>Comma-separated prompt (plus negative guidance) for Stable Diffusion.</summary>
    public string StableDiffusion { get; set; } = string.Empty;
}