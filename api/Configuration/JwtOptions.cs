namespace Vrindaya.Api.Configuration;

/// <summary>
/// Strongly typed binding for the "Jwt" configuration section — the app's
/// OWN signing key for the JWT it mints after a successful login (see
/// JwtTokenService/AuthController.Login), distinct from Firebase's token
/// (which this app only ever validates, never signs). Real values are
/// supplied via environment variables (Jwt__SigningKey, Jwt__Issuer,
/// Jwt__Audience — see docs/setup/environment-variables.md), never
/// committed to appsettings.*.json. SigningKey must never be logged or
/// returned in any API response.
/// </summary>
public class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = string.Empty;
    public string Audience { get; set; } = string.Empty;

    /// <summary>HMAC-SHA256 signing secret — must be at least 32 bytes/256 bits once UTF8-encoded (SymmetricSecurityKey's minimum for HS256).</summary>
    public string SigningKey { get; set; } = string.Empty;

    public int ExpiryMinutes { get; set; } = 720;
}
