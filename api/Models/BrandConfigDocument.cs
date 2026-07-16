using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

/// <summary>
/// A singleton document (Firestore path brandConfig/singleton) — one
/// record, PUT-replaced as a whole from the admin's "Brand" settings form.
/// Everything about the brand that isn't a Product/Category/Collection/
/// Homepage-CMS concern lives here: About Us, Contact, Store Information,
/// Social Links, FAQs, Policies, and footer display toggles. Mirrors
/// HomepageConfigDocument's shape exactly.
/// </summary>
[FirestoreData]
public class BrandConfigDocument
{
    [FirestoreProperty("aboutUs")]
    public AboutUsSection AboutUs { get; set; } = new();

    [FirestoreProperty("contact")]
    public ContactSection Contact { get; set; } = new();

    [FirestoreProperty("storeInformation")]
    public StoreInformationSection StoreInformation { get; set; } = new();

    [FirestoreProperty("socialLinks")]
    public SocialLinksSection SocialLinks { get; set; } = new();

    [FirestoreProperty("faqs")]
    public List<FaqItem> Faqs { get; set; } = [];

    /// <summary>Id is the admin-set/auto-slugified policy slug — used by the public /policies/:slug route.</summary>
    [FirestoreProperty("policies")]
    public List<PolicyItem> Policies { get; set; } = [];

    [FirestoreProperty("footer")]
    public FooterSection Footer { get; set; } = new();

    [FirestoreProperty("updatedBy")]
    public string UpdatedBy { get; set; } = string.Empty;

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

[FirestoreData]
public class AboutUsSection
{
    [FirestoreProperty("heading")]
    public string? Heading { get; set; }

    [FirestoreProperty("body")]
    public string? Body { get; set; }

    [FirestoreProperty("imageUrl")]
    public string? ImageUrl { get; set; }

    [FirestoreProperty("imagePublicId")]
    public string? ImagePublicId { get; set; }
}

[FirestoreData]
public class ContactSection
{
    [FirestoreProperty("email")]
    public string? Email { get; set; }

    [FirestoreProperty("phone")]
    public string? Phone { get; set; }

    [FirestoreProperty("whatsApp")]
    public string? WhatsApp { get; set; }

    [FirestoreProperty("address")]
    public string? Address { get; set; }

    [FirestoreProperty("mapEmbedUrl")]
    public string? MapEmbedUrl { get; set; }

    [FirestoreProperty("businessHours")]
    public string? BusinessHours { get; set; }
}

[FirestoreData]
public class StoreInformationSection
{
    [FirestoreProperty("legalName")]
    public string? LegalName { get; set; }

    [FirestoreProperty("gstin")]
    public string? Gstin { get; set; }

    [FirestoreProperty("registeredAddress")]
    public string? RegisteredAddress { get; set; }

    [FirestoreProperty("establishedYear")]
    public string? EstablishedYear { get; set; }
}

[FirestoreData]
public class SocialLinksSection
{
    [FirestoreProperty("instagram")]
    public string? Instagram { get; set; }

    [FirestoreProperty("flipkart")]
    public string? Flipkart { get; set; }
}

[FirestoreData]
public class FaqItem
{
    [FirestoreProperty("id")]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty("question")]
    public string Question { get; set; } = string.Empty;

    [FirestoreProperty("answer")]
    public string Answer { get; set; } = string.Empty;

    [FirestoreProperty("displayOrder")]
    public long DisplayOrder { get; set; }
}

[FirestoreData]
public class PolicyItem
{
    /// <summary>The policy slug — used as /policies/{id}.</summary>
    [FirestoreProperty("id")]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty("title")]
    public string Title { get; set; } = string.Empty;

    [FirestoreProperty("content")]
    public string Content { get; set; } = string.Empty;

    [FirestoreProperty("displayOrder")]
    public long DisplayOrder { get; set; }

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}

[FirestoreData]
public class FooterSection
{
    [FirestoreProperty("showSocialLinks")]
    public bool ShowSocialLinks { get; set; } = true;

    [FirestoreProperty("showPolicyLinks")]
    public bool ShowPolicyLinks { get; set; } = true;

    [FirestoreProperty("copyrightText")]
    public string? CopyrightText { get; set; }
}
