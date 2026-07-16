using System.ComponentModel.DataAnnotations;

namespace Vrindaya.Api.DTOs.Homepage;

public class HeroBannerResponse
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Subtitle { get; set; }
    public string? ButtonText { get; set; }
    public string? ButtonUrl { get; set; }
    public string BackgroundImageUrl { get; set; } = string.Empty;
    public string BackgroundImagePublicId { get; set; } = string.Empty;
    public string? MobileImageUrl { get; set; }
    public string? MobileImagePublicId { get; set; }
    public long DisplayOrder { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool Active { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public abstract class HeroBannerRequestBase
{
    [Required, StringLength(200, MinimumLength = 1)]
    public string Title { get; set; } = string.Empty;

    public string? Subtitle { get; set; }
    public string? ButtonText { get; set; }

    [Url]
    public string? ButtonUrl { get; set; }

    [Required, Url]
    public string BackgroundImageUrl { get; set; } = string.Empty;

    [Required]
    public string BackgroundImagePublicId { get; set; } = string.Empty;

    [Url]
    public string? MobileImageUrl { get; set; }
    public string? MobileImagePublicId { get; set; }

    public long DisplayOrder { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool Active { get; set; } = true;
}

public class CreateHeroBannerRequest : HeroBannerRequestBase
{
}

public class UpdateHeroBannerRequest : HeroBannerRequestBase
{
}
