namespace Vrindaya.Api.AI.ContentGeneration.Engines;

/// <summary>
/// Feature-level tuning knobs for content generation. Scoring thresholds come
/// from the shared campaign scoring engine; only content-specific behavior is
/// configured here — nothing is hard-coded in the engine.
/// </summary>
public static class ContentGenerationConstants
{
    /// <summary>Hard cap on the number of pieces a single request may return.</summary>
    public const int MaxPiecesLimit = 30;

    // ---- Priority thresholds (score -> ContentPriority) ----
    public const int CriticalPriorityThreshold = 80;
    public const int HighPriorityThreshold = 60;
    public const int MediumPriorityThreshold = 40;

    // ---- Festival -> category keyword mapping for seasonality ----
    public static readonly string[] FestiveCategoryKeywords =
    {
        "ethnic", "saree", "lehenga", "suit", "jewelry", "apparel",
    };
}