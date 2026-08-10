using Google.Cloud.Firestore;
using Vrindaya.Api.AI.Copilot.DTOs;
using Vrindaya.Api.AI.Copilot.Interfaces;
using Vrindaya.Api.AI.Workspace.DTOs;
using Vrindaya.Api.AI.Workspace.Interfaces;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.AI.Workspace.Services;

public sealed class WorkspaceService : IWorkspaceService
{
    private const string CollectionName = "ai_workspaces";
    private const int MaxMessagesPerWorkspace = 200;

    private readonly IFirebaseService _firebaseService;
    private readonly IAiCopilotService _copilotService;
    private readonly ILogger<WorkspaceService> _logger;

    public WorkspaceService(
        IFirebaseService firebaseService,
        IAiCopilotService copilotService,
        ILogger<WorkspaceService> logger)
    {
        _firebaseService = firebaseService ?? throw new ArgumentNullException(nameof(firebaseService));
        _copilotService = copilotService ?? throw new ArgumentNullException(nameof(copilotService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<WorkspaceDto?> GetAsync(string workspaceId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(workspaceId))
            return null;

        var db = _firebaseService.GetFirestoreDb();
        var docRef = db.Collection(CollectionName).Document(workspaceId);
        var snapshot = await docRef.GetSnapshotAsync(cancellationToken);

        if (!snapshot.Exists)
            return null;

        return MapToDto(snapshot);
    }

    public async Task<IReadOnlyList<WorkspaceSummaryDto>> ListAsync(string userId, CancellationToken cancellationToken = default)
    {
        var db = _firebaseService.GetFirestoreDb();
        var query = db.Collection(CollectionName)
            .WhereEqualTo("UserId", userId)
            .WhereEqualTo("Status", "active")
            .OrderByDescending("UpdatedAt");

        var snapshot = await query.GetSnapshotAsync(cancellationToken);

        return snapshot.Documents
            .Select(doc => new WorkspaceSummaryDto
            {
                Id = doc.Id,
                Name = doc.GetValue<string>("Name"),
                Status = doc.GetValue<string>("Status"),
                CurrentModule = doc.GetValue<string>("CurrentModule"),
                MessageCount = doc.GetValue<List<FirestoreDocumentMessage>>("Messages")?.Count ?? 0,
                CreatedAt = doc.GetValue<Timestamp>("CreatedAt").ToDateTime(),
                UpdatedAt = doc.GetValue<Timestamp>("UpdatedAt").ToDateTime(),
            })
            .ToList();
    }

    public async Task<WorkspaceDto> CreateAsync(CreateWorkspaceRequestDto request, CancellationToken cancellationToken = default)
    {
        if (request is null)
            throw new ArgumentNullException(nameof(request));

        var now = DateTime.UtcNow;
        var workspaceId = Guid.NewGuid().ToString("N");

        var dto = new WorkspaceDto
        {
            Id = workspaceId,
            Name = string.IsNullOrWhiteSpace(request.Name) ? $"Workspace {now:yyyy-MM-dd HH:mm}" : request.Name,
            UserId = request.UserId,
            Status = "active",
            CurrentModule = request.CurrentModule,
            Messages = new List<WorkspaceMessageDto>(),
            Context = request.Context ?? new Dictionary<string, string>(),
            CreatedAt = now,
            UpdatedAt = now,
        };

        var db = _firebaseService.GetFirestoreDb();
        var docRef = db.Collection(CollectionName).Document(workspaceId);
        await docRef.SetAsync(MapFromDto(dto));

        _logger.LogInformation("AI Workspace: created '{WorkspaceId}' for user '{UserId}'.", workspaceId, request.UserId);

        return dto;
    }

    public async Task<WorkspaceDto?> SendMessageAsync(string workspaceId, SendMessageRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(workspaceId))
            return null;

        if (request is null || string.IsNullOrWhiteSpace(request.Content))
            throw new ArgumentException("Message content is required.", nameof(request));

        var workspace = await GetAsync(workspaceId, cancellationToken);
        if (workspace is null)
            return null;

        var now = DateTime.UtcNow;

        var userMessage = new WorkspaceMessageDto
        {
            Id = Guid.NewGuid().ToString("N"),
            Role = "user",
            Content = request.Content,
            CreatedAt = now,
            Module = workspace.CurrentModule,
            Context = request.Context ?? new Dictionary<string, string>(),
        };

        workspace.Messages.Add(userMessage);

        var copilotRequest = new AiCopilotRequestDto
        {
            UserMessage = request.Content,
            ConversationId = workspace.Id,
            UserId = workspace.UserId,
            Context = MergeContext(workspace.Context, request.Context),
            CurrentModule = workspace.CurrentModule,
        };

        AiCopilotResponseDto copilotResponse;
        try
        {
            copilotResponse = await _copilotService.AskAsync(copilotRequest, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI Workspace: copilot service failed for workspace '{WorkspaceId}'.", workspaceId);
            copilotResponse = new AiCopilotResponseDto
            {
                Response = "The AI service is currently unavailable. Please try again.",
                RecommendedModule = workspace.CurrentModule,
                ConfidenceScore = 0,
            };
        }

        var aiMessage = new WorkspaceMessageDto
        {
            Id = Guid.NewGuid().ToString("N"),
            Role = "ai",
            Content = copilotResponse.Response,
            CreatedAt = DateTime.UtcNow,
            Module = copilotResponse.RecommendedModule,
            Context = new Dictionary<string, string>
            {
                ["confidence"] = copilotResponse.ConfidenceScore.ToString("F1"),
                ["recommendedModule"] = copilotResponse.RecommendedModule,
            },
        };

        workspace.Messages.Add(aiMessage);

        if (!string.IsNullOrWhiteSpace(copilotResponse.RecommendedModule))
        {
            workspace.CurrentModule = copilotResponse.RecommendedModule;
        }

        workspace.UpdatedAt = DateTime.UtcNow;

        if (workspace.Messages.Count > MaxMessagesPerWorkspace)
        {
            workspace.Messages = workspace.Messages.Skip(workspace.Messages.Count - MaxMessagesPerWorkspace).ToList();
        }

        var db = _firebaseService.GetFirestoreDb();
        var docRef = db.Collection(CollectionName).Document(workspaceId);
        await docRef.SetAsync(MapFromDto(workspace), cancellationToken: cancellationToken);

        _logger.LogInformation(
            "AI Workspace: message sent in '{WorkspaceId}', routed to '{Module}'.",
            workspaceId, copilotResponse.RecommendedModule);

        return workspace;
    }

    public async Task<WorkspaceDto?> UpdateContextAsync(string workspaceId, Dictionary<string, string> context, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(workspaceId))
            return null;

        var workspace = await GetAsync(workspaceId, cancellationToken);
        if (workspace is null)
            return null;

        workspace.Context = context ?? new Dictionary<string, string>();
        workspace.UpdatedAt = DateTime.UtcNow;

        var db = _firebaseService.GetFirestoreDb();
        var docRef = db.Collection(CollectionName).Document(workspaceId);
        await docRef.SetAsync(MapFromDto(workspace), cancellationToken: cancellationToken);

        return workspace;
    }

    public async Task<bool> ArchiveAsync(string workspaceId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(workspaceId))
            return false;

        var workspace = await GetAsync(workspaceId, cancellationToken);
        if (workspace is null)
            return false;

        workspace.Status = "archived";
        workspace.UpdatedAt = DateTime.UtcNow;

        var db = _firebaseService.GetFirestoreDb();
        var docRef = db.Collection(CollectionName).Document(workspaceId);
        await docRef.SetAsync(MapFromDto(workspace), cancellationToken: cancellationToken);

        _logger.LogInformation("AI Workspace: archived '{WorkspaceId}'.", workspaceId);

        return true;
    }

    public async Task<bool> DeleteAsync(string workspaceId, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(workspaceId))
            return false;

        var db = _firebaseService.GetFirestoreDb();
        var docRef = db.Collection(CollectionName).Document(workspaceId);
        var snapshot = await docRef.GetSnapshotAsync(cancellationToken);

        if (!snapshot.Exists)
            return false;

        await docRef.DeleteAsync(cancellationToken: cancellationToken);

        _logger.LogInformation("AI Workspace: deleted '{WorkspaceId}'.", workspaceId);

        return true;
    }

    private static Dictionary<string, string> MergeContext(
        Dictionary<string, string> workspaceContext,
        Dictionary<string, string>? messageContext)
    {
        var merged = new Dictionary<string, string>(workspaceContext);
        if (messageContext is not null)
        {
            foreach (var kvp in messageContext)
            {
                merged[kvp.Key] = kvp.Value;
            }
        }
        return merged;
    }

    private static WorkspaceDto MapToDto(DocumentSnapshot snapshot)
    {
        var messages = snapshot.GetValue<List<FirestoreDocumentMessage>>("Messages")?
            .Select(m => new WorkspaceMessageDto
            {
                Id = m.Id,
                Role = m.Role,
                Content = m.Content,
                CreatedAt = m.CreatedAt,
                Module = m.Module,
                Context = m.Context ?? new Dictionary<string, string>(),
            })
            .ToList() ?? new List<WorkspaceMessageDto>();

        return new WorkspaceDto
        {
            Id = snapshot.Id,
            Name = snapshot.GetValue<string>("Name"),
            UserId = snapshot.GetValue<string>("UserId"),
            Status = snapshot.GetValue<string>("Status"),
            CurrentModule = snapshot.GetValue<string>("CurrentModule"),
            Messages = messages,
            Context = snapshot.GetValue<Dictionary<string, string>>("Context") ?? new Dictionary<string, string>(),
            CreatedAt = snapshot.GetValue<Timestamp>("CreatedAt").ToDateTime(),
            UpdatedAt = snapshot.GetValue<Timestamp>("UpdatedAt").ToDateTime(),
        };
    }

    private static Dictionary<string, object> MapFromDto(WorkspaceDto dto)
    {
        return new Dictionary<string, object>
        {
            ["Name"] = dto.Name,
            ["UserId"] = dto.UserId,
            ["Status"] = dto.Status,
            ["CurrentModule"] = dto.CurrentModule,
            ["Messages"] = dto.Messages.Select(m => new FirestoreDocumentMessage
            {
                Id = m.Id,
                Role = m.Role,
                Content = m.Content,
                CreatedAt = m.CreatedAt,
                Module = m.Module,
                Context = m.Context,
            }).ToList(),
            ["Context"] = dto.Context,
            ["CreatedAt"] = Timestamp.FromDateTime(dto.CreatedAt.ToUniversalTime()),
            ["UpdatedAt"] = Timestamp.FromDateTime(dto.UpdatedAt.ToUniversalTime()),
        };
    }
}

[FirestoreData]
internal class FirestoreDocumentMessage
{
    [FirestoreProperty("Id")]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty("Role")]
    public string Role { get; set; } = string.Empty;

    [FirestoreProperty("Content")]
    public string Content { get; set; } = string.Empty;

    [FirestoreProperty("CreatedAt")]
    public DateTime CreatedAt { get; set; }

    [FirestoreProperty("Module")]
    public string Module { get; set; } = string.Empty;

    [FirestoreProperty("Context")]
    public Dictionary<string, string> Context { get; set; } = new();
}
