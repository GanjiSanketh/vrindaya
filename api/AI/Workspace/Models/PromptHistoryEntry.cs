namespace Vrindaya.Api.AI.Workspace.Models;

public class PromptHistoryEntry
{
    public string Id { get; set; } = string.Empty;

    public string Prompt { get; set; } = string.Empty;

    public string Module { get; set; } = string.Empty;

    public string Provider { get; set; } = string.Empty;

    public long ExecutionTimeMs { get; set; }

    public bool Success { get; set; }

    public DateTime Timestamp { get; set; }

    public string? ErrorMessage { get; set; }
}
