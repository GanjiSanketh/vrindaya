using System.ComponentModel.DataAnnotations;
using Vrindaya.Api.Validators;

namespace Vrindaya.Api.DTOs.Brand;

public class AboutUsDto
{
    [MaxLength(200)]
    public string? Heading { get; set; }

    [MaxLength(4000)]
    public string? Body { get; set; }

    [Url]
    public string? ImageUrl { get; set; }

    public string? ImagePublicId { get; set; }
}

public class ContactDto
{
    [EmailAddress]
    public string? Email { get; set; }

    [WhatsAppPhoneNumber]
    public string? Phone { get; set; }

    [WhatsAppPhoneNumber]
    public string? WhatsApp { get; set; }

    [MaxLength(400)]
    public string? Address { get; set; }

    [Url]
    public string? MapEmbedUrl { get; set; }

    [MaxLength(200)]
    public string? BusinessHours { get; set; }
}

public class StoreInformationDto
{
    [MaxLength(200)]
    public string? LegalName { get; set; }

    [MaxLength(20)]
    public string? Gstin { get; set; }

    [MaxLength(400)]
    public string? RegisteredAddress { get; set; }

    [MaxLength(4)]
    public string? EstablishedYear { get; set; }
}

public class SocialLinksDto
{
    [Url]
    public string? Instagram { get; set; }

    [Url]
    public string? Flipkart { get; set; }
}

public class FaqDto
{
    [Required]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(300)]
    public string Question { get; set; } = string.Empty;

    [Required]
    [MaxLength(4000)]
    public string Answer { get; set; } = string.Empty;

    public long DisplayOrder { get; set; }
}

public class PolicyDto
{
    [Required]
    public string Id { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(20000)]
    public string Content { get; set; } = string.Empty;

    public long DisplayOrder { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class FooterDto
{
    public bool ShowSocialLinks { get; set; } = true;
    public bool ShowPolicyLinks { get; set; } = true;
    public string? CopyrightText { get; set; }
}

/// <summary>Public GET + admin PUT shape for the brandConfig/singleton document.</summary>
public class BrandConfigResponse
{
    public AboutUsDto AboutUs { get; set; } = new();
    public ContactDto Contact { get; set; } = new();
    public StoreInformationDto StoreInformation { get; set; } = new();
    public SocialLinksDto SocialLinks { get; set; } = new();
    public List<FaqDto> Faqs { get; set; } = [];
    public List<PolicyDto> Policies { get; set; } = [];
    public FooterDto Footer { get; set; } = new();
    public DateTime UpdatedAt { get; set; }
}

public class UpdateBrandConfigRequest
{
    public AboutUsDto AboutUs { get; set; } = new();
    public ContactDto Contact { get; set; } = new();
    public StoreInformationDto StoreInformation { get; set; } = new();
    public SocialLinksDto SocialLinks { get; set; } = new();
    public List<FaqDto> Faqs { get; set; } = [];
    public List<PolicyDto> Policies { get; set; } = [];
    public FooterDto Footer { get; set; } = new();
}
