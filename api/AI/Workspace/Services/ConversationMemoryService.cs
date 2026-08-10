using System.Collections.Concurrent;
using Microsoft.Extensions.Options;
using Vrindaya.Api.AI.Workspace.Configuration;
using Vrindaya.Api.AI.Workspace.Interfaces;
using Vrindaya.Api.AI.Workspace.Models;

namespace Vrindaya.Api.AI.Workspace.Services;

public sealed class ConversationMemoryService : IConversationMemoryService
{
    private readonly ConcurrentDictionary<string, List<ConversationMessage>> _history = new();
    private readonly int _maxHistoryLength;
    private readonly ILogger<ConversationMemoryService> _logger;

    public ConversationMemoryService(
        IOptions<ConversationMemoryOptions> options,
        ILogger<ConversationMemoryService> logger)
    {
        _maxHistoryLength = options.Value.MaxHistoryLength > 0
            ? options.Value.MaxHistoryLength
            : 50;
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public IReadOnlyList<ConversationMessage> GetHistory(string conversationId)
    {
        if (string.IsNullOrWhiteSpace(conversationId))
            return Array.Empty<ConversationMessage>();

        if (_history.TryGetValue(conversationId, out var messages))
            return messages.AsReadOnly();

        return Array.Empty<ConversationMessage>();
    }

    public void AddMessage(string conversationId, ConversationMessage message)
    {
        if (string.IsNullOrWhiteSpace(conversationId) || message is null)
            return;

        var messages = _history.GetOrAdd(conversationId, _ => new List<ConversationMessage>());

        lock (messages)
        {
            messages.Add(message);

            while (messages.Count > _maxHistoryLength)
            {
                messages.RemoveAt(0);
            }
        }

        _logger.LogDebug(
            "ConversationMemory: added {Role} message to '{ConversationId}', history size {Count}.",
            message.Role, conversationId, messages.Count);
    }

    public void AddUserMessage(string conversationId, string content, Dictionary<string, string>? metadata = null)
    {
        AddMessage(conversationId, new ConversationMessage
        {
            Id = Guid.NewGuid().ToString("N"),
            Role = "user",
            Content = content,
            Timestamp = DateTime.UtcNow,
            Metadata = metadata ?? new Dictionary<string, string>(),
        });
    }

    public void AddAssistantMessage(string conversationId, string content, Dictionary<string, string>? metadata = null)
    {
        AddMessage(conversationId, new ConversationMessage
        {
            Id = Guid.NewGuid().ToString("N"),
            Role = "assistant",
            Content = content,
            Timestamp = DateTime.UtcNow,
            Metadata = metadata ?? new Dictionary<string, string>(),
        });
    }

    public void ClearHistory(string conversationId)
    {
        if (string.IsNullOrWhiteSpace(conversationId))
            return;

        if (_history.TryRemove(conversationId, out _))
        {
            _logger.LogDebug("ConversationMemory: cleared history for '{ConversationId}'.", conversationId);
        }
    }

    public bool HasHistory(string conversationId)
    {
        return !string.IsNullOrWhiteSpace(conversationId) && _history.ContainsKey(conversationId);
    }
}
