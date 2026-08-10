namespace Vrindaya.Api.AI.Workspace.Models;

public class ConversationMessage
{
    public string Id { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    public DateTime Timestamp { get; set; }

    public Dictionary<string, string> Metadata { get; set; } = new();
}
