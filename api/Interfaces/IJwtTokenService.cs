using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

public interface IJwtTokenService
{
    /// <summary>Mints the app's own signed JWT (HS256) — carries UserId (the AdminUsers doc's Id), Email, Name, and a role claim (ClaimTypes.Role) set to one of AdminRoles' constants, so [Authorize(Roles = ...)] works natively everywhere else in the app.</summary>
    (string Token, DateTime ExpiresAt) CreateToken(AdminUserDocument adminUser);
}
