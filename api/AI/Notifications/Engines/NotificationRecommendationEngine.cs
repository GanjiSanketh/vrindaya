using Vrindaya.Api.AI.Notifications.DTOs;
using Vrindaya.Api.AI.Notifications.Interfaces;
using Vrindaya.Api.AI.Notifications.Models;
using Vrindaya.Api.AI.Suggestions.DTOs;
using Vrindaya.Api.AI.Suggestions.Models;

namespace Vrindaya.Api.AI.Notifications.Engines;

/// <summary>
/// Default <see cref="INotificationRecommendationEngine"/>. Maps each
/// suggestion onto the operation that resolves it, adds the workspace route and
/// button label, and orders the result by urgency. Content notifications
/// (Instagram reel, Flipkart video) are raised for the promotable suggestions
/// where a media asset is the missing piece. Deterministic — no AI provider, no
/// Firestore, no randomness.
/// </summary>
public sealed class NotificationRecommendationEngine : INotificationRecommendationEngine
{
    /// <summary>Impact at or above which a promotable product also warrants a content notification.</summary>
    private const int ContentImpactThreshold = 70;

    /// <summary>Workspace module each action routes to.</summary>
    private static readonly Dictionary<NotificationAction, string> ActionModules = new()
    {
        [NotificationAction.RestockProduct] = "inventory",
        [NotificationAction.ImproveListing] = "flipkart",
        [NotificationAction.IncreaseCampaignBudget] = "campaigns",
        [NotificationAction.CreateInstagramReel] = "content",
        [NotificationAction.GenerateFlipkartVideo] = "content",
        [NotificationAction.AdjustPricing] = "products",
        [NotificationAction.ClearInventory] = "inventory",
    };

    /// <summary>Primary button label for each action.</summary>
    private static readonly Dictionary<NotificationAction, string> ActionLabels = new()
    {
        [NotificationAction.RestockProduct] = "Restock now",
        [NotificationAction.ImproveListing] = "Improve listing",
        [NotificationAction.IncreaseCampaignBudget] = "Increase budget",
        [NotificationAction.CreateInstagramReel] = "Create reel",
        [NotificationAction.GenerateFlipkartVideo] = "Generate video",
        [NotificationAction.AdjustPricing] = "Adjust price",
        [NotificationAction.ClearInventory] = "Start clearance",
    };

    /// <summary>Suggestion category to the operation that resolves it.</summary>
    private static readonly Dictionary<SuggestionCategory, NotificationAction> CategoryActions = new()
    {
        [SuggestionCategory.LowStock] = NotificationAction.RestockProduct,
        [SuggestionCategory.ListingQuality] = NotificationAction.ImproveListing,
        [SuggestionCategory.Campaign] = NotificationAction.IncreaseCampaignBudget,
        [SuggestionCategory.MarginOpportunity] = NotificationAction.CreateInstagramReel,
        [SuggestionCategory.Pricing] = NotificationAction.AdjustPricing,
        [SuggestionCategory.Overstock] = NotificationAction.ClearInventory,
    };

    private readonly ILogger<NotificationRecommendationEngine> _logger;

    public NotificationRecommendationEngine(ILogger<NotificationRecommendationEngine> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public NotificationCollectionDto Generate(AiSuggestionCollectionDto suggestions, int maximumNotifications = 20)
    {
        if (suggestions is null)
            throw new ArgumentNullException(nameof(suggestions));

        var limit = Math.Max(1, maximumNotifications);
        var notifications = new List<NotificationDto>();

        foreach (var suggestion in suggestions.Suggestions)
        {
            notifications.Add(BuildPrimary(suggestion));

            var media = BuildMediaFollowUp(suggestion);
            if (media is not null)
                notifications.Add(media);
        }

        var ordered = notifications
            .OrderBy(n => n.Priority)
            .ThenByDescending(n => n.Impact)
            .Take(limit)
            .ToList();

        var collection = new NotificationCollectionDto
        {
            Notifications = ordered,
            TotalNotifications = ordered.Count,
            UrgentCount = ordered.Count(n => n.Priority is NotificationPriority.Critical or NotificationPriority.High),
            CountByAction = ordered.GroupBy(n => n.Action).ToDictionary(g => g.Key, g => g.Count()),
            CountByPriority = ordered.GroupBy(n => n.Priority).ToDictionary(g => g.Key, g => g.Count()),
            GeneratedAt = DateTime.UtcNow,
        };

        _logger.LogInformation(
            "NotificationRecommendationEngine: {Total} notifications ({Urgent} urgent) from {SuggestionCount} suggestions.",
            collection.TotalNotifications, collection.UrgentCount, suggestions.Suggestions.Count);

        return collection;
    }

    // -------------------------------------------------------------------
    // Primary notification — one per suggestion
    // -------------------------------------------------------------------

    private static NotificationDto BuildPrimary(AiSuggestionDto suggestion)
    {
        var action = CategoryActions.TryGetValue(suggestion.Type, out var mapped)
            ? mapped
            : NotificationAction.ImproveListing;

        return Build(suggestion, action, MapPriority(suggestion.Severity), suggestion.Impact, suggestion.Title, suggestion.Rationale);
    }

    // -------------------------------------------------------------------
    // Media follow-up — content assets for products already worth promoting
    // -------------------------------------------------------------------

    private static NotificationDto? BuildMediaFollowUp(AiSuggestionDto suggestion)
    {
        if (suggestion.Impact < ContentImpactThreshold)
            return null;

        // A high-scoring campaign deserves a marketplace video; a high-margin
        // product already promoted on Instagram deserves the same treatment.
        if (suggestion.Type is not (SuggestionCategory.Campaign or SuggestionCategory.MarginOpportunity))
            return null;

        // The margin rule already emits a reel as its primary notification, so
        // both media follow-ups ask for the marketplace video instead.
        const NotificationAction action = NotificationAction.GenerateFlipkartVideo;

        var title = $"Generate a Flipkart video for {suggestion.ProductName}";

        var message =
            $"{suggestion.ProductName} scores {suggestion.Impact}/100 on the {suggestion.Type} rule — " +
            "a video asset is the remaining gap.";

        return Build(suggestion, action, NotificationPriority.Low, suggestion.Impact, title, message);
    }

    // -------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------

    private static NotificationDto Build(
        AiSuggestionDto suggestion,
        NotificationAction action,
        NotificationPriority priority,
        int impact,
        string title,
        string message) => new()
        {
            Id = $"{action}-{suggestion.ProductId}",
            ProductId = suggestion.ProductId,
            ProductName = suggestion.ProductName,
            Category = suggestion.Category,
            Action = action,
            Priority = priority,
            Title = title,
            Message = string.IsNullOrWhiteSpace(message) ? suggestion.RecommendedAction : message,
            ActionLabel = ActionLabels.TryGetValue(action, out var label) ? label : "Review",
            TargetModule = ActionModules.TryGetValue(action, out var module) ? module : "dashboard",
            Impact = impact,
            Metrics = new Dictionary<string, string>(suggestion.Metrics),
            CreatedAt = DateTime.UtcNow,
        };

    private static NotificationPriority MapPriority(SuggestionSeverity severity) =>
        severity switch
        {
            SuggestionSeverity.Critical => NotificationPriority.Critical,
            SuggestionSeverity.High => NotificationPriority.High,
            SuggestionSeverity.Medium => NotificationPriority.Medium,
            _ => NotificationPriority.Low,
        };
}
