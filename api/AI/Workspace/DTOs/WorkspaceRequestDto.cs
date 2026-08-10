using Vrindaya.Api.AI.Workspace.Models;

namespace Vrindaya.Api.AI.Workspace.DTOs;

public class WorkspaceRequestDto
{
    public string Prompt { get; set; } = string.Empty;

    public WorkspaceType WorkspaceType { get; set; } = WorkspaceType.GeneralChat;

    public List<string> SelectedProducts { get; set; } = new();

    public Dictionary<string, string> Context { get; set; } = new();

    public string ConversationId { get; set; } = string.Empty;
}
