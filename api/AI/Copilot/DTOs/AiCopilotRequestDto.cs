namespace Vrindaya.Api.AI.Copilot.DTOs;

/// <summary>
/// Input contract for the AI copilot. Carries the operator's message plus the
/// conversation and workspace context the copilot reasons over. Pure request
/// data — no Firestore, no AI.
/// </summary>
public class AiCopilotRequestDto
{
    /// <summary>Raw message typed by the operator.</summary>
    public string UserMessage { get; set; } = string.Empty;

    /// <summary>Conversation thread identifier. When empty a new thread is assumed.</summary>
    public string ConversationId { get; set; } = string.Empty;

    /// <summary>Identifier of the operator issuing the message.</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>Free-form contextual key/value pairs supplied by the caller (selected product, date range, filters, etc.).</summary>
    public Dictionary<string, string> Context { get; set; } = new();

    /// <summary>Module the operator is currently working in (e.g. "campaigns", "products", "dashboard").</summary>
    public string CurrentModule { get; set; } = string.Empty;
}
