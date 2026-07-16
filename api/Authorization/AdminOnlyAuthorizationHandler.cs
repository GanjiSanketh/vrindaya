using Microsoft.AspNetCore.Authorization;
using Vrindaya.Api.Common;

namespace Vrindaya.Api.Authorization;

/// <summary>
/// Succeeds only when the authenticated Firebase ID token's email claim
/// matches AppConstants.AdminEmail — the same trust boundary as
/// firestore.rules'/storage.rules' isAdminUser().
/// </summary>
public class AdminOnlyAuthorizationHandler : AuthorizationHandler<AdminOnlyRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, AdminOnlyRequirement requirement)
    {
        if (context.User.IsAdmin())
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
