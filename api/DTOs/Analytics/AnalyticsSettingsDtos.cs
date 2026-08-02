namespace Vrindaya.Api.DTOs.Analytics;

/// <summary>
/// Read/write shape for the website analytics configuration
/// (analyticsSettings/website). Field names mirror the Firestore document and
/// the storefront's cached AnalyticsSettings so there is no mapping
/// ambiguity. Served by GET and returned by PUT so the admin UI always has
/// the authoritative persisted state (including updatedAt/updatedBy).
/// </summary>
public class AnalyticsSettingsDto
{
    public bool TrackingEnabled { get; set; } = true;
    public bool HeroClicks { get; set; } = true;
    public bool ProductClicks { get; set; } = true;
    public bool CategoryClicks { get; set; } = true;
    public bool SearchTracking { get; set; } = true;
    public bool WishlistTracking { get; set; } = true;
    public bool CollectionClicks { get; set; } = true;
    public bool PageViews { get; set; } = true;
    public bool ScrollTracking { get; set; }
    public bool PerformanceTracking { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string UpdatedBy { get; set; } = string.Empty;
}

/// <summary>
/// Full-state, idempotent save of the analytics settings (PUT). The client
/// always sends every toggle; the server stamps updatedAt/updatedBy from the
/// authenticated admin's AppJwt — never from the request body.
/// </summary>
public class SaveAnalyticsSettingsRequest
{
    public bool TrackingEnabled { get; set; }
    public bool HeroClicks { get; set; }
    public bool ProductClicks { get; set; }
    public bool CategoryClicks { get; set; }
    public bool SearchTracking { get; set; }
    public bool WishlistTracking { get; set; }
    public bool CollectionClicks { get; set; }
    public bool PageViews { get; set; }
    public bool ScrollTracking { get; set; }
    public bool PerformanceTracking { get; set; }
}
