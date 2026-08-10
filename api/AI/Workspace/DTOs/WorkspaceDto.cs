namespace Vrindaya.Api.AI.Workspace.DTOs;

public class WorkspaceDto
{
    public string Id { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string UserId { get; set; } = string.Empty;

    public string Status { get; set; } = "active";

    public string CurrentModule { get; set; } = string.Empty;

    public List<WorkspaceMessageDto> Messages { get; set; } = new();

    public Dictionary<string, string> Context { get; set; } = new();

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
