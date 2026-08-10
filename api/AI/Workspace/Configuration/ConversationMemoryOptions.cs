namespace Vrindaya.Api.AI.Workspace.Configuration;

public class ConversationMemoryOptions
{
    public const string SectionName = "AI:Workspace:Memory";

    public int MaxHistoryLength { get; set; } = 50;
}
