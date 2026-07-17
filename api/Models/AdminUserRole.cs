using System.Text.Json.Serialization;

namespace Vrindaya.Api.Models;

/// <summary>DTO/API-layer representation of an admin's role — see AdminRoles for the literal string constants used in claims/Firestore/[Authorize] attributes; AdminUserRole.ToString() always matches one of those.</summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AdminUserRole
{
    SuperAdmin,
    Admin,
}
