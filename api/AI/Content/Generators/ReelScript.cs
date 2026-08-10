namespace Vrindaya.Api.AI.Content.Generators;

/// <summary>
/// A structured short-form (Reel/Short) script produced by the
/// <see cref="ReelScriptGenerator"/>: an opening hook, three scenes, an ending
/// and a call-to-action.
/// </summary>
public sealed class ReelScript
{
    public string Hook { get; set; } = string.Empty;

    public string Scene1 { get; set; } = string.Empty;

    public string Scene2 { get; set; } = string.Empty;

    public string Scene3 { get; set; } = string.Empty;

    public string Ending { get; set; } = string.Empty;

    public string Cta { get; set; } = string.Empty;
}