using System.ComponentModel.DataAnnotations;
using Vrindaya.Api.Validators;

namespace Vrindaya.Api.DTOs.Homepage;

public class CategoryResponse
{
    public string Id { get; set; } = string.Empty;

    /// <summary>Always equal to Id — the doc id is the slug (see CategoryDocument's doc comment). Exposed as its own field for API-shape clarity, not independently editable in this phase.</summary>
    public string Slug { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
    public string? Subtitle { get; set; }
    public string? Description { get; set; }
    public string Image { get; set; } = string.Empty;
    public string? ImagePublicId { get; set; }
    public string? BannerImage { get; set; }
    public string? BannerImagePublicId { get; set; }
    public long DisplayOrder { get; set; }
    public bool Featured { get; set; }
    public bool Active { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public List<string> SeoKeywords { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public abstract class CategoryRequestBase
{
    [Required, StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    public string? Subtitle { get; set; }
    public string? Description { get; set; }

    [Required, Url]
    public string Image { get; set; } = string.Empty;

    public string? ImagePublicId { get; set; }

    [Url]
    public string? BannerImage { get; set; }

    public string? BannerImagePublicId { get; set; }

    public long DisplayOrder { get; set; }
    public bool Featured { get; set; }
    public bool Active { get; set; } = true;

    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public List<string> SeoKeywords { get; set; } = [];
}

/// <summary>Id is admin-supplied on create (the category slug, e.g. "long-kurtas") — it's part of Product.Category's vocabulary, not a generated id.</summary>
public class CreateCategoryRequest : CategoryRequestBase
{
    [Required, SlugFormat]
    public string Id { get; set; } = string.Empty;
}

public class UpdateCategoryRequest : CategoryRequestBase
{
}

public class ReorderCategoriesRequest
{
    [Required, MinLength(1)]
    public List<string> OrderedIds { get; set; } = [];
}
