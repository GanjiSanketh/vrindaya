using Vrindaya.Api.AI.Workspace.DTOs;

namespace Vrindaya.Api.AI.Workspace.Interfaces;

public interface IWorkspaceOrchestrator
{
    Task<WorkspaceResponseDto> ProcessAsync(
        WorkspaceRequestDto request,
        CancellationToken cancellationToken = default);
}
