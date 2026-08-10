using System.Collections.Concurrent;
using Vrindaya.Api.AI.Workspace.Interfaces;
using Vrindaya.Api.AI.Workspace.Models;

namespace Vrindaya.Api.AI.Workspace.Services;

public sealed class PromptHistoryService : IPromptHistoryService
{
    private readonly ConcurrentQueue<PromptHistoryEntry> _history = new();
    private const int MaxEntries = 100;

    public int Count => _history.Count;

    public void Record(PromptHistoryEntry entry)
    {
        if (entry is null)
            return;

        _history.Enqueue(entry);

        while (_history.Count > MaxEntries)
        {
            _history.TryDequeue(out _);
        }
    }

    public IReadOnlyList<PromptHistoryEntry> GetRecent(int count = 20)
    {
        if (count <= 0)
            return Array.Empty<PromptHistoryEntry>();

        return _history.TakeLast(Math.Min(count, _history.Count)).ToList().AsReadOnly();
    }

    public IReadOnlyList<PromptHistoryEntry> GetByModule(string module, int count = 10)
    {
        if (string.IsNullOrWhiteSpace(module) || count <= 0)
            return Array.Empty<PromptHistoryEntry>();

        return _history
            .Where(e => e.Module == module)
            .TakeLast(Math.Min(count, _history.Count))
            .ToList()
            .AsReadOnly();
    }

    public void Clear()
    {
        while (_history.TryDequeue(out _)) { }
    }
}
