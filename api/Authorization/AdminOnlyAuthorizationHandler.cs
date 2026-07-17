using Microsoft.AspNetCore.Authorization;
using Vrindaya.Api.Common;

namespace Vrindaya.Api.Authorization;

/// <summary>
/// Succeeds only when the authenticated principal carries the SuperAdmin
/// or Admin role claim on the app's own AppJwt (see JwtTokenService) —
/// i.e. an active AdminUsers record as of their last /auth/login call.
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
