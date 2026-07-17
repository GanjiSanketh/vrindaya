using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Vrindaya.Api.Configuration;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services;

/// <summary>
/// Mints the app's own JWT after AuthController.Login has already verified
/// the caller's Firebase ID token and confirmed they're an active
/// AdminUsers record — this is the ONE place in the app that signs a
/// token; every other request only ever validates one (see
/// AddAdminAuthentication's two schemes). Uses the same
/// JwtSecurityTokenHandler/HS256 approach ASP.NET Core's own JwtBearer
/// validation expects, so the "AppJwt" scheme (the default scheme,
/// covering every endpoint except the login action itself) can verify
/// what this class signs with zero custom validation code.
/// </summary>
public class JwtTokenService : IJwtTokenService
{
    private readonly JwtOptions _options;

    public JwtTokenService(IOptions<JwtOptions> options)
    {
        _options = options.Value;
    }

    public (string Token, DateTime ExpiresAt) CreateToken(AdminUserDocument adminUser)
    {
        var expiresAt = DateTime.UtcNow.AddMinutes(_options.ExpiryMinutes);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, adminUser.Id),
            new Claim(ClaimTypes.NameIdentifier, adminUser.Id),
            new Claim(ClaimTypes.Email, adminUser.Email),
            new Claim(ClaimTypes.Name, adminUser.Name),
            new Claim(ClaimTypes.Role, adminUser.Role),
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials);

        return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
    }
}
