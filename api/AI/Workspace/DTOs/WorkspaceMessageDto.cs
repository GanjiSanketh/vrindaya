namespace Vrindaya.Api.AI.Workspace.DTOs;

public class WorkspaceMessageDto
{
    public string Id { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public string Module { get; set; } = string.Empty;

    public Dictionary<string, string> Context { get; set; } = new();
}
