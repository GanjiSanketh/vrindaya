using Vrindaya.Api.DTOs.Analytics;

namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Contract for the website analytics configuration (analyticsSettings/website).
/// Reads are public; writes are admin-only and are the ONLY path that may
/// modify the document — the browser never writes it directly, so the
/// admin-only enforcement lives in the API (AdminOnly policy), not in
/// firestore.rules where the browser would have to present Firebase Auth.
/// </summary>
public interface IAnalyticsSettingsService
{
    /// <summary>Reads the current settings, or the documented defaults when the document does not exist yet.</summary>
    Task<AnalyticsSettingsDto> GetAsync(CancellationToken cancellationToken);

    /// <summary>Overwrites the settings document, stamping updatedAt/updatedBy from the caller's identity.</summary>
    Task<AnalyticsSettingsDto> SaveAsync(SaveAnalyticsSettingsRequest request, string updatedBy, CancellationToken cancellationToken);
}
