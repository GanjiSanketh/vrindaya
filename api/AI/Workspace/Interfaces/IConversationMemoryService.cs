using Vrindaya.Api.AI.Workspace.Models;

namespace Vrindaya.Api.AI.Workspace.Interfaces;

public interface IConversationMemoryService
{
    IReadOnlyList<ConversationMessage> GetHistory(string conversationId);

    void AddMessage(string conversationId, ConversationMessage message);

    void AddUserMessage(string conversationId, string content, Dictionary<string, string>? metadata = null);

    void AddAssistantMessage(string conversationId, string content, Dictionary<string, string>? metadata = null);

    void ClearHistory(string conversationId);

    bool HasHistory(string conversationId);
}
