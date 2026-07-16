using System.Security.Claims;
using Vrindaya.Api.Constants;

namespace Vrindaya.Api.Common;

/// <summary>
/// Shared admin check — used by both AdminOnlyAuthorizationHandler (to gate
/// mutating endpoints) and ProductService (to decide whether a GET caller
/// sees inactive/draft products or only active ones). Firebase ID tokens
/// don't carry an "is admin" claim of their own — the trust boundary is
/// "signed in with this exact email," same as firestore.rules'/storage.rules'
/// isAdminUser().
/// </summary>
public static class ClaimsPrincipalExtensions
{
    public static bool IsAdmin(this ClaimsPrincipal user)
    {
        if (user.Identity?.IsAuthenticated != true)
        {
            return false;
        }

        var email = user.FindFirstEmail();
        return !string.IsNullOrWhiteSpace(email)
            && string.Equals(email, AppConstants.AdminEmail, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>Firebase ID tokens carry the email claim as either the standard ClaimTypes.Email or a plain "email" claim, depending on the token/mapping in use.</summary>
    public static string FindFirstEmail(this ClaimsPrincipal user)
    {
        return user.FindFirstValue(ClaimTypes.Email) ?? user.FindFirstValue("email") ?? string.Empty;
    }
}
