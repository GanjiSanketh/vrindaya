using Vrindaya.Api.AI.Workspace.DTOs;

namespace Vrindaya.Api.AI.Workspace.Interfaces;

public interface IWorkspaceService
{
    Task<WorkspaceDto?> GetAsync(string workspaceId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<WorkspaceSummaryDto>> ListAsync(string userId, CancellationToken cancellationToken = default);

    Task<WorkspaceDto> CreateAsync(CreateWorkspaceRequestDto request, CancellationToken cancellationToken = default);

    Task<WorkspaceDto?> SendMessageAsync(string workspaceId, SendMessageRequestDto request, CancellationToken cancellationToken = default);

    Task<WorkspaceDto?> UpdateContextAsync(string workspaceId, Dictionary<string, string> context, CancellationToken cancellationToken = default);

    Task<bool> ArchiveAsync(string workspaceId, CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(string workspaceId, CancellationToken cancellationToken = default);
}
