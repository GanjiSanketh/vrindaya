using Vrindaya.Api.AI.Notifications.DTOs;
using Vrindaya.Api.AI.Suggestions.DTOs;

namespace Vrindaya.Api.AI.Notifications.Interfaces;

/// <summary>
/// Turns business suggestions into actionable notifications — restock a
/// product, improve a listing, increase a campaign budget, create an Instagram
/// reel, generate a Flipkart video. The engine adds routing and urgency only;
/// all underlying analysis comes from the suggestion layer.
/// </summary>
public interface INotificationRecommendationEngine
{
    /// <summary>
    /// Maps a suggestion collection onto actionable notifications.
    /// </summary>
    /// <param name="suggestions">Suggestions produced by the suggestion service.</param>
    /// <param name="maximumNotifications">Upper bound on the returned list.</param>
    /// <returns>A <see cref="NotificationCollectionDto"/> ordered by priority then impact.</returns>
    /// <exception cref="ArgumentNullException">Thrown when <paramref name="suggestions"/> is null.</exception>
    NotificationCollectionDto Generate(AiSuggestionCollectionDto suggestions, int maximumNotifications = 20);
}
