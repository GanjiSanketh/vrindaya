using Vrindaya.Api.AI.Workspace.Models;

namespace Vrindaya.Api.AI.Workspace.Interfaces;

public interface IPromptHistoryService
{
    void Record(PromptHistoryEntry entry);

    IReadOnlyList<PromptHistoryEntry> GetRecent(int count = 20);

    IReadOnlyList<PromptHistoryEntry> GetByModule(string module, int count = 10);

    void Clear();

    int Count { get; }
}
