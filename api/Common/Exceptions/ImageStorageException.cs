namespace Vrindaya.Api.Common.Exceptions;

/// <summary>
/// Wraps any Cloudinary SDK/HTTP failure (upload/replace/delete) so
/// controllers/GlobalExceptionMiddleware never see a raw Cloudinary
/// exception type or its message verbatim — the message here is always a
/// generic, safe-to-return description; the real Cloudinary error (which
/// could echo back request details) is logged server-side only via the
/// InnerException, never serialized to the API response.
/// </summary>
public class ImageStorageException : Exception, IHasStatusCode
{
    /// <summary>502 — this app is acting as a client to an upstream service (Cloudinary) that failed or was unreachable, not a fault in the request itself.</summary>
    public int StatusCode => StatusCodes.Status502BadGateway;

    public ImageStorageException(string message) : base(message)
    {
    }

    public ImageStorageException(string message, Exception innerException) : base(message, innerException)
    {
    }
}
