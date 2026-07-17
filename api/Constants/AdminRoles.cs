namespace Vrindaya.Api.Constants;

/// <summary>
/// The two role names, as literal strings — this is what actually gets
/// signed into the AppJwt's role claim and compared against Firestore's
/// "role" field, so it exists independent of AdminUserRole (the DTO-layer
/// enum) for use in [Authorize(Roles = ...)] attributes, which need a
/// compile-time constant, not an enum reference. Keep in sync with
/// AdminUserRole — AdminUserRole.ToString() must always equal one of these.
/// </summary>
public static class AdminRoles
{
    public const string SuperAdmin = "SuperAdmin";
    public const string Admin = "Admin";
}
