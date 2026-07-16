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
