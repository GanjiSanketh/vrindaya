namespace Vrindaya.Api.AI.Workspace.DTOs;

public class WorkspaceResponseDto
{
    public string Result { get; set; } = string.Empty;

    public List<string> GeneratedItems { get; set; } = new();

    public List<string> SuggestedActions { get; set; } = new();

    public Dictionary<string, string> Diagnostics { get; set; } = new();

    public DateTime Timestamp { get; set; }
}
