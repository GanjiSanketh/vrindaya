using System.Security.Claims;

namespace Vrindaya.Api.Common;

public static class ClaimsPrincipalExtensions
{
    public static bool IsAdmin(this ClaimsPrincipal user)
    {
        return user.Identity?.IsAuthenticated == true
            && (user.IsInRole("Admin") || user.IsInRole("SuperAdmin"));
    }

    public static bool IsSuperAdmin(this ClaimsPrincipal user)
    {
        return user.Identity?.IsAuthenticated == true && user.IsInRole("SuperAdmin");
    }

    public static string FindFirstEmail(this ClaimsPrincipal user)
    {
        return user.FindFirstValue(ClaimTypes.Email) ?? user.FindFirstValue("email") ?? string.Empty;
    }

    public static bool IsEmailVerified(this ClaimsPrincipal user)
    {
        var value = user.FindFirstValue("email_verified");
        return bool.TryParse(value, out var verified) && verified;
    }
}
