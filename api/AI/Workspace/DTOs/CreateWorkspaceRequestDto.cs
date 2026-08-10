namespace Vrindaya.Api.AI.Workspace.DTOs;

public class CreateWorkspaceRequestDto
{
    public string Name { get; set; } = string.Empty;

    public string UserId { get; set; } = string.Empty;

    public string CurrentModule { get; set; } = string.Empty;

    public Dictionary<string, string> Context { get; set; } = new();
}
