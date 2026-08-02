using Google.Cloud.Firestore;
using Vrindaya.Api.DTOs.Analytics;
using Vrindaya.Api.Interfaces;

namespace Vrindaya.Api.Services;

/// <summary>
/// Website analytics configuration (analyticsSettings/website). Written
/// exclusively from this service (server-side service-account Firestore, no
/// client-side rules involved); the storefront only ever reads the document
/// directly (public read in firestore.rules). updatedAt is stored as an ISO
/// 8601 string so the storefront's cached-settings parser keeps working
/// unchanged.
/// </summary>
public class AnalyticsSettingsService : IAnalyticsSettingsService
{
    private const string CollectionName = "analyticsSettings";
    private const string DocumentId = "website";

    private readonly IFirebaseService _firebase;

    public AnalyticsSettingsService(IFirebaseService firebase)
    {
        _firebase = firebase;
    }

    public async Task<AnalyticsSettingsDto> GetAsync(CancellationToken cancellationToken)
    {
        var snapshot = await Document().GetSnapshotAsync(cancellationToken);
        if (!snapshot.Exists)
        {
            return DefaultDto();
        }

        var data = snapshot.ToDictionary();
        return new AnalyticsSettingsDto
        {
            TrackingEnabled = Bool(data, "trackingEnabled", true),
            HeroClicks = Bool(data, "heroClicks", true),
            ProductClicks = Bool(data, "productClicks", true),
            CategoryClicks = Bool(data, "categoryClicks", true),
            SearchTracking = Bool(data, "searchTracking", true),
            WishlistTracking = Bool(data, "wishlistTracking", true),
            CollectionClicks = Bool(data, "collectionClicks", true),
            PageViews = Bool(data, "pageViews", true),
            ScrollTracking = Bool(data, "scrollTracking", false),
            PerformanceTracking = Bool(data, "performanceTracking", false),
            UpdatedAt = DateTimeValue(data, "updatedAt"),
            UpdatedBy = StringValue(data, "updatedBy"),
        };
    }

    public async Task<AnalyticsSettingsDto> SaveAsync(
        SaveAnalyticsSettingsRequest request,
        string updatedBy,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var data = new Dictionary<string, object>
        {
            ["trackingEnabled"] = request.TrackingEnabled,
            ["heroClicks"] = request.HeroClicks,
            ["productClicks"] = request.ProductClicks,
            ["categoryClicks"] = request.CategoryClicks,
            ["searchTracking"] = request.SearchTracking,
            ["wishlistTracking"] = request.WishlistTracking,
            ["collectionClicks"] = request.CollectionClicks,
            ["pageViews"] = request.PageViews,
            ["scrollTracking"] = request.ScrollTracking,
            ["performanceTracking"] = request.PerformanceTracking,
            ["updatedAt"] = now.ToString("o"),
            ["updatedBy"] = string.IsNullOrWhiteSpace(updatedBy) ? "system" : updatedBy,
        };

        await Document().SetAsync(data, cancellationToken: cancellationToken);

        return new AnalyticsSettingsDto
        {
            TrackingEnabled = request.TrackingEnabled,
            HeroClicks = request.HeroClicks,
            ProductClicks = request.ProductClicks,
            CategoryClicks = request.CategoryClicks,
            SearchTracking = request.SearchTracking,
            WishlistTracking = request.WishlistTracking,
            CollectionClicks = request.CollectionClicks,
            PageViews = request.PageViews,
            ScrollTracking = request.ScrollTracking,
            PerformanceTracking = request.PerformanceTracking,
            UpdatedAt = now,
            UpdatedBy = data["updatedBy"] as string ?? "system",
        };
    }

    private DocumentReference Document()
        => _firebase.GetFirestoreDb().Collection(CollectionName).Document(DocumentId);

    private static AnalyticsSettingsDto DefaultDto() => new();

    private static bool Bool(IReadOnlyDictionary<string, object> data, string field, bool fallback)
        => data.TryGetValue(field, out var value) && value is bool flag ? flag : fallback;

    private static string StringValue(IReadOnlyDictionary<string, object> data, string field)
        => data.TryGetValue(field, out var value) && value is string text ? text : string.Empty;

    private static DateTime DateTimeValue(IReadOnlyDictionary<string, object> data, string field)
    {
        if (data.TryGetValue(field, out var value) && value is not null
            && DateTime.TryParse(value.ToString(), out var parsed))
        {
            return parsed;
        }

        return DateTime.MinValue;
    }
}
