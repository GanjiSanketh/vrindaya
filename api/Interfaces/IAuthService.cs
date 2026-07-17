using Vrindaya.Api.DTOs.Auth;

namespace Vrindaya.Api.Interfaces;

public interface IAuthService
{
    /// <summary>
    /// The one login step: given an already Firebase-verified caller's
    /// email/googleUserId/name/emailVerified, decides whether they may
    /// enter the Admin Portal and, if so, mints their AppJwt. Throws
    /// ForbiddenException (translated to 403 by GlobalExceptionMiddleware)
    /// for every rejection case — unverified email, no AdminUsers record,
    /// or an inactive one.
    /// </summary>
    Task<LoginResponse> LoginAsync(string email, string googleUserId, string name, bool emailVerified, CancellationToken cancellationToken);
}
