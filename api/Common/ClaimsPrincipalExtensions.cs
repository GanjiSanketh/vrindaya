using System.Security.Claims;
using Vrindaya.Api.Constants;

namespace Vrindaya.Api.Common;

/// <summary>
/// Shared role checks — used by AdminOnlyAuthorizationHandler (to gate the
/// default-scheme, every-endpoint-except-login policy) and ProductService
/// (to decide whether a GET caller sees inactive/draft products or only
/// active ones). As of the RBAC refactor, every request except the one
/// login call carries this app's own AppJwt (see JwtTokenService), which
/// signs a real ClaimTypes.Role claim taken from the caller's AdminUsers
/// record at login time — IsAdmin/IsSuperAdmin are just thin, readable
/// wrappers over the framework's own role-claim check, so the rest of the
/// app doesn't need to know the underlying claim type. IsEmailVerified is
/// only relevant to the ONE request authenticated via the "Firebase"
/// scheme — AuthController.Login itself — since Google's own verification
/// already happened by the time an AppJwt exists.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    /// <summary>True for either role — mirrors the pre-RBAC meaning of "is this caller some kind of authenticated admin," so every existing [Authorize(Policy = AdminOnlyPolicy)] call site keeps its exact prior meaning.</summary>
    public static bool IsAdmin(this ClaimsPrincipal user)
    {
        return user.Identity?.IsAuthenticated == true
            && (user.IsInRole(AdminRoles.SuperAdmin) || user.IsInRole(AdminRoles.Admin));
    }

    public static bool IsSuperAdmin(this ClaimsPrincipal user)
    {
        return user.Identity?.IsAuthenticated == true && user.IsInRole(AdminRoles.SuperAdmin);
    }

    /// <summary>AppJwt always sets the standard ClaimTypes.Email; the Firebase-scheme login request carries either that or a plain "email" claim depending on token/mapping.</summary>
    public static string FindFirstEmail(this ClaimsPrincipal user)
    {
        return user.FindFirstValue(ClaimTypes.Email) ?? user.FindFirstValue("email") ?? string.Empty;
    }

    /// <summary>
    /// Firebase only sets email_verified=true once Google itself has
    /// confirmed the address (every Google Sign-In account satisfies this
    /// by construction) — checked once, at login (AuthController), before
    /// an AdminUsers lookup or AppJwt is ever issued for that email. Not
    /// meaningful for AppJwt-authenticated requests (the claim doesn't
    /// exist on that token — verification already happened at login).
    /// </summary>
    public static bool IsEmailVerified(this ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("email_verified");
        return bool.TryParse(value, out var verified) && verified;
    }
}
