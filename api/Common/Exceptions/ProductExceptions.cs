namespace Vrindaya.Api.Common.Exceptions;

/// <summary>
/// Marker for exceptions that carry their own intended HTTP status code.
/// GlobalExceptionMiddleware checks for this before falling back to its
/// generic 500, so Product (and any future) endpoints can surface real
/// 404/409 semantics without any controller needing its own try/catch —
/// the "no try/catch in repositories/services" convention stays intact.
/// </summary>
public interface IHasStatusCode
{
    int StatusCode { get; }
}

public class ProductNotFoundException : Exception, IHasStatusCode
{
    public int StatusCode => StatusCodes.Status404NotFound;

    public ProductNotFoundException(string productId)
        : base($"Product '{productId}' was not found.")
    {
    }
}

public class DuplicateSlugException : Exception, IHasStatusCode
{
    public int StatusCode => StatusCodes.Status409Conflict;

    public DuplicateSlugException(string slug)
        : base($"A product with slug '{slug}' already exists.")
    {
    }
}

public class DuplicateSkuException : Exception, IHasStatusCode
{
    public int StatusCode => StatusCodes.Status409Conflict;

    public DuplicateSkuException(string sku)
        : base($"A product with SKU '{sku}' already exists.")
    {
    }
}
