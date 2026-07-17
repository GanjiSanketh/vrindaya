using System.ComponentModel.DataAnnotations;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.DTOs.Admin;

public class AdminUserResponse
{
    public string Id { get; set; } = string.Empty;
    public string? GoogleUserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public AdminUserRole Role { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; }
    public string UpdatedBy { get; set; } = string.Empty;
}

/// <summary>No password field — this app has no credential of its own to set. Access is granted the moment this record exists; the named Google account logs in via the existing Google Sign-In flow and is matched by Email.</summary>
public class CreateAdminUserRequest
{
    [Required, StringLength(200, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public AdminUserRole Role { get; set; }
}

/// <summary>Email is intentionally not editable — it's the record's identity (Firestore document key) and the join key Google Sign-In matches against; changing it would silently detach access from whichever Google account the admin actually expected.</summary>
public class UpdateAdminUserRequest
{
    [Required, StringLength(200, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public AdminUserRole Role { get; set; }

    public bool IsActive { get; set; }
}
