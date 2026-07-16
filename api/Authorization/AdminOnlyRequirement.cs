using Microsoft.AspNetCore.Authorization;

namespace Vrindaya.Api.Authorization;

/// <summary>Marker requirement for the "AdminOnly" policy — see AdminOnlyAuthorizationHandler.</summary>
public class AdminOnlyRequirement : IAuthorizationRequirement
{
}
