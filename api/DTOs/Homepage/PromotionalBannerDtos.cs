using System.ComponentModel.DataAnnotations;

namespace Vrindaya.Api.DTOs.Homepage;

public class PromotionalBannerResponse
{
    public string Id { get; set; } = string.Empty;
    public string DesktopImageUrl { get; set; } = string.Empty;
    public string DesktopImagePublicId { get; set; } = string.Empty;
    public string? MobileImageUrl { get; set; }
    public string? MobileImagePublicId { get; set; }
    public string? ButtonText { get; set; }
    public string? ButtonUrl { get; set; }
    public long DisplayOrder { get; set; }
    public bool Active { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public abstract class PromotionalBannerRequestBase
{
    [Required, Url]
    public string DesktopImageUrl { get; set; } = string.Empty;

    [Required]
    public string DesktopImagePublicId { get; set; } = string.Empty;

    [Url]
    public string? MobileImageUrl { get; set; }
    public string? MobileImagePublicId { get; set; }
    public string? ButtonText { get; set; }

    [Url]
    public string? ButtonUrl { get; set; }

    public long DisplayOrder { get; set; }
    public bool Active { get; set; } = true;
}

public class CreatePromotionalBannerRequest : PromotionalBannerRequestBase
{
}

public class UpdatePromotionalBannerRequest : PromotionalBannerRequestBase
{
}
