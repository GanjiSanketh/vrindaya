namespace Vrindaya.Api.Common.Exceptions;

/// <summary>Generic 404 for the homepage CMS entities (hero banners, promotional banners, categories) — same IHasStatusCode mechanism as ProductNotFoundException, reused instead of one bespoke type per entity.</summary>
public class NotFoundException : Exception, IHasStatusCode
{
    public int StatusCode => StatusCodes.Status404NotFound;

    public NotFoundException(string entityName, string id)
        : base($"{entityName} '{id}' was not found.")
    {
    }
}

/// <summary>Generic 409 for the homepage CMS entities — e.g. a category id (slug) that already exists.</summary>
public class ConflictException : Exception, IHasStatusCode
{
    public int StatusCode => StatusCodes.Status409Conflict;

    public ConflictException(string message) : base(message)
    {
    }
}

/// <summary>Generic 403 — the caller is authenticated but not permitted (e.g. no AdminUsers record, an inactive account, or a role-hierarchy rule like "can't touch the last SuperAdmin"). Distinct from a 401 (not authenticated at all).</summary>
public class ForbiddenException : Exception, IHasStatusCode
{
    public int StatusCode => StatusCodes.Status403Forbidden;

    public ForbiddenException(string message) : base(message)
    {
    }
}

/// <summary>Generic 400 for request-shape validation that can't be expressed via DataAnnotations attributes alone (e.g. "the right one of two mutually-dependent fields must be set"). Named distinctly from System.ComponentModel.DataAnnotations.ValidationException to avoid ambiguity in files that use both namespaces.</summary>
public class RequestValidationException : Exception, IHasStatusCode
{
    public int StatusCode => StatusCodes.Status400BadRequest;

    public RequestValidationException(string message) : base(message)
    {
    }
}
