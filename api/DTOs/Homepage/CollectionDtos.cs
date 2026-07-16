using System.ComponentModel.DataAnnotations;
using Vrindaya.Api.DTOs.Products;
using Vrindaya.Api.Validators;

namespace Vrindaya.Api.DTOs.Homepage;

/// <summary>Metadata-only shape — admin list/CRUD and the public GET /collections list (which powers collection search) both use this. No resolved products here; see CollectionLandingResponse for that.</summary>
public class CollectionResponse
{
    public string Id { get; set; } = string.Empty;

    /// <summary>Always equal to Id — same ID/slug conflation as CategoryResponse.Slug, for the same reason.</summary>
    public string Slug { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Image { get; set; }
    public string? ImagePublicId { get; set; }
    public string? BannerImage { get; set; }
    public string? BannerImagePublicId { get; set; }
    public long DisplayOrder { get; set; }
    public bool Featured { get; set; }
    public bool Active { get; set; }
    public List<string> ProductIds { get; set; } = [];
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public List<string> SeoKeywords { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>The public collection landing page's payload — metadata plus resolved, ordered, active-only products. No pagination: a Collection is a bounded, admin-curated list, not a live query.</summary>
public class CollectionLandingResponse
{
    public string Id { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Image { get; set; }
    public string? BannerImage { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public List<string> SeoKeywords { get; set; } = [];
    public List<ProductSummaryResponse> Products { get; set; } = [];
}

public abstract class CollectionRequestBase
{
    [Required, StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Url]
    public string? Image { get; set; }

    public string? ImagePublicId { get; set; }

    [Url]
    public string? BannerImage { get; set; }

    public string? BannerImagePublicId { get; set; }

    public long DisplayOrder { get; set; }
    public bool Featured { get; set; }
    public bool Active { get; set; } = true;

    public List<string> ProductIds { get; set; } = [];

    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public List<string> SeoKeywords { get; set; } = [];
}

/// <summary>Id is admin-supplied on create (the collection slug, e.g. "trending") — same pattern as CreateCategoryRequest.Id.</summary>
public class CreateCollectionRequest : CollectionRequestBase
{
    [Required, SlugFormat]
    public string Id { get; set; } = string.Empty;
}

public class UpdateCollectionRequest : CollectionRequestBase
{
}

public class ReorderCollectionsRequest
{
    [Required, MinLength(1)]
    public List<string> OrderedIds { get; set; } = [];
}
