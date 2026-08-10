using System.Text;
using Vrindaya.Api.AI.ContentGeneration.DTOs;
using Vrindaya.Api.AI.ContentGeneration.Models;

namespace Vrindaya.Api.AI.ContentGeneration.Prompts;

/// <summary>
/// Converts a list of <see cref="ContentPieceDto"/> plus the originating
/// <see cref="ContentGenerationRequestDto"/> into a single, optimized LLM
/// prompt string. Pure transformation — no AI calls, no business logic beyond
/// prompt assembly.
/// </summary>
public sealed class ContentPromptBuilder : IContentPromptBuilder
{
    /// <summary>
    /// Builds a single LLM prompt from the content request and scored pieces.
    /// </summary>
    /// <param name="request">The original request driving format, tone, audience, and filters.</param>
    /// <param name="pieces">Scored content pieces produced by the content engine.</param>
    /// <returns>A single string prompt ready to send to an LLM.</returns>
    public string Build(
        ContentGenerationRequestDto? request,
        IReadOnlyList<ContentPieceDto>? pieces)
    {
        var sb = new StringBuilder();

        sb.AppendLine("# Content Brief");

        // ---- Content format ----
        sb.AppendLine();
        sb.AppendLine("## Content Format");
        sb.AppendLine();
        sb.AppendLine($"{request?.ContentType ?? ContentType.Post}");
        sb.AppendLine();

        // ---- Products ----
        sb.AppendLine("## Products");
        sb.AppendLine();
        if (pieces is { Count: > 0 })
        {
            foreach (var p in pieces)
            {
                sb.AppendLine($"- **Product**: {p.ProductName} ({p.Category})");
                sb.AppendLine($"  - Product ID: `{p.ProductId}`");
                sb.AppendLine($"  - Suggested Title: {p.Title}");
                sb.AppendLine($"  - Score: {p.Score}/100 | Priority: {p.Priority} | Confidence: {p.Confidence:P0}");
                sb.AppendLine($"  - Rationale: {p.Rationale}");
                sb.AppendLine();
            }
        }
        else
        {
            sb.AppendLine("_(No product candidates available.)_");
            sb.AppendLine();
        }

        // ---- Audience ----
        var audience = string.IsNullOrWhiteSpace(request?.TargetAudience) ? "General" : request!.TargetAudience;
        sb.AppendLine("## Target Audience");
        sb.AppendLine();
        sb.AppendLine(audience);
        sb.AppendLine();

        // ---- Tone ----
        sb.AppendLine("## Tone & Style");
        sb.AppendLine();
        sb.AppendLine(ToneFor(request?.Tone ?? ContentTone.Professional));
        sb.AppendLine();

        // ---- Platform ----
        sb.AppendLine("## Platform");
        sb.AppendLine();
        sb.AppendLine(request?.Platform?.ToString() ?? "Default for the content format");
        sb.AppendLine();

        // ---- Festival / season ----
        sb.AppendLine("## Festival & Season");
        sb.AppendLine();
        sb.AppendLine(string.IsNullOrWhiteSpace(request?.FestivalName)
            ? "_(No specific festival — use seasonal-neutral copy.)_"
            : $"Lean into **{request!.FestivalName}** theming where natural.");
        sb.AppendLine();

        // ---- Expected Output ----
        sb.AppendLine("## Expected Output");
        sb.AppendLine();
        sb.AppendLine("For each product produce a complete content piece with:");
        sb.AppendLine("1. A hook (<= 60 characters)");
        sb.AppendLine("2. Primary caption copy (100-150 words)");
        sb.AppendLine("3. Up to 5 relevant hashtags");
        sb.AppendLine("4. A single call-to-action variant");
        sb.AppendLine("5. An image prompt for the visual");
        sb.AppendLine("6. Up to 3 engagement tips for the post");
        sb.AppendLine();

        return sb.ToString();
    }

    private static string ToneFor(ContentTone tone) =>
        tone switch
        {
            ContentTone.Professional => "Authoritative, polished, and trustworthy.",
            ContentTone.Casual => "Friendly, conversational, and approachable.",
            ContentTone.Festive => "Celebratory, warm, and culturally resonant.",
            ContentTone.Urgent => "Scarcity-driven, direct, and action-oriented.",
            ContentTone.Premium => "Refined, aspirational, and exclusive.",
            ContentTone.Storytelling => "Narrative, emotional, and authentic.",
            _ => "Friendly, professional, and clear.",
        };
}