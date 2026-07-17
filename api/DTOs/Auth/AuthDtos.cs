using Vrindaya.Api.Models;

namespace Vrindaya.Api.DTOs.Auth;

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public AdminUserSummary User { get; set; } = new();
}

/// <summary>The minimal profile Angular needs after login — a narrower view than AdminUserResponse (no GoogleUserId/CreatedBy/audit fields), matching what the spec asks the frontend to store: Name, Email, Role.</summary>
public class AdminUserSummary
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public AdminUserRole Role { get; set; }
}
