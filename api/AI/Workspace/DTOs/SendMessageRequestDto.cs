namespace Vrindaya.Api.AI.Workspace.DTOs;

public class SendMessageRequestDto
{
    public string Content { get; set; } = string.Empty;

    public Dictionary<string, string> Context { get; set; } = new();
}
