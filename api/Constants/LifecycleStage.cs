namespace Vrindaya.Api.Constants;

/// <summary>
/// The 10-stage Product Lifecycle (Product.LifecycleStage) — the full
/// catalog-readiness journey from first draft through photography,
/// website publish, Flipkart listing, sale, and archival. Exact spelling
/// — including spaces/capitalization — is load-bearing: it round-trips
/// verbatim to/from Firestore and the admin UI's dropdown options, so
/// renaming a value here is a data migration, not a refactor.
/// </summary>
public static class LifecycleStage
{
    public const string Draft = "Draft";
    public const string PhotographyPending = "Photography Pending";
    public const string PhotographyComplete = "Photography Complete";
    public const string ImageEditingComplete = "Image Editing Complete";
    public const string ReadyForWebsite = "Ready For Website";
    public const string PublishedOnWebsite = "Published On Website";
    public const string ReadyForFlipkart = "Ready For Flipkart";
    public const string ListedOnFlipkart = "Listed On Flipkart";
    public const string SoldOut = "Sold Out";
    public const string Archived = "Archived";

    public static readonly string[] All =
    [
        Draft, PhotographyPending, PhotographyComplete, ImageEditingComplete,
        ReadyForWebsite, PublishedOnWebsite, ReadyForFlipkart, ListedOnFlipkart,
        SoldOut, Archived,
    ];
}
