namespace Vrindaya.Api.AI.Content.Generators;

/// <summary>
/// Instagram-ready content produced by the <see cref="InstagramContentGenerator"/>:
/// the primary caption, associated hashtags, a call-to-action and emoji
/// suggestions to inject into the post.
/// </summary>
public sealed class InstagramContent
{
    public string Caption { get; set; } = string.Empty;

    public List<string> Hashtags { get; set; } = new();

    public string Cta { get; set; } = string.Empty;

    /// <summary>Suggested emoji to sprinkle into the caption.</summary>
    public List<string> Emojis { get; set; } = new();
}