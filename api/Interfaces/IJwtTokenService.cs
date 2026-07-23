namespace Vrindaya.Api.Interfaces;

public interface IJwtTokenService
{
    (string Token, DateTime ExpiresAt) CreateToken(string email, string name);
}
