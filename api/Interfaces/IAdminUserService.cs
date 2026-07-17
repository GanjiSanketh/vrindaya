using Vrindaya.Api.DTOs.Admin;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

public interface IAdminUserService
{
    Task<List<AdminUserResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<AdminUserResponse> CreateAsync(CreateAdminUserRequest request, string createdBy, CancellationToken cancellationToken);

    /// <summary>callerEmail is the authenticated SuperAdmin making the change — needed to enforce "cannot edit own role" and stamped as UpdatedBy.</summary>
    Task<AdminUserResponse> UpdateAsync(string email, UpdateAdminUserRequest request, string callerEmail, CancellationToken cancellationToken);

    Task<AdminUserResponse> SetActiveAsync(string email, bool active, string updatedBy, CancellationToken cancellationToken);

    /// <summary>Raw document lookup for the login flow (AuthController) — needs fields (IsActive, Role, GoogleUserId) the AdminUserResponse DTO also exposes, but this avoids a public-facing DTO leaking into an internal auth decision.</summary>
    Task<AdminUserDocument?> FindByEmailAsync(string email, CancellationToken cancellationToken);

    /// <summary>Called once per successful login — keeps GoogleUserId/Name in sync with whatever Google/Firebase actually reports, without requiring the SuperAdmin to have entered a GoogleUserId manually (they can't; it doesn't exist until that person's first login).</summary>
    Task SyncGoogleProfileAsync(string email, string googleUserId, string name, CancellationToken cancellationToken);
}
