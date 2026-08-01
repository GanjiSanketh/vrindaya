using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

/// <summary>
/// Maps to the single "active" document in Firestore's homepageConfig
/// collection — the CMS record for the homepage. Each homepage section
/// (hero showcase today; featured/trending overrides, announcement,
/// Instagram, SEO later) nests its own configuration object under here, so
/// the homepage stays one document instead of a growing family of
/// half-empty singleton collections.
/// </summary>
[FirestoreData]
public class HomepageConfigDocument
{
    /// <summary>The CMS-driven hero showcase (null until it is first saved).</summary>
    [FirestoreProperty("heroShowcase")]
    public HeroShowcaseDocument? HeroShowcase { get; set; }

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }

    [FirestoreProperty("updatedBy")]
    public string UpdatedBy { get; set; } = string.Empty;
}
