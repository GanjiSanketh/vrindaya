using Vrindaya.Api.AI.Notifications.Models;

namespace Vrindaya.Api.AI.Notifications.DTOs;

/// <summary>
/// A single actionable notification. Derived deterministically from an existing
/// suggestion — the notification layer adds routing and urgency, never new
/// analysis.
/// </summary>
public sealed class NotificationDto
{
    /// <summary>Stable identifier for this notification within the batch.</summary>
    public string Id { get; set; } = string.Empty;

    public string ProductId { get; set; } = string.Empty;

    public string ProductName { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    /// <summary>The operation the operator should perform.</summary>
    public NotificationAction Action { get; set; }

    /// <summary>Urgency band used for ordering.</summary>
    public NotificationPriority Priority { get; set; }

    /// <summary>Short headline shown in the notification list.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Body text explaining why the notification was raised.</summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>Label for the notification's primary button.</summary>
    public string ActionLabel { get; set; } = string.Empty;

    /// <summary>Workspace module the action button navigates to.</summary>
    public string TargetModule { get; set; } = string.Empty;

    /// <summary>Ranking signal (0-100). Higher means act sooner.</summary>
    public int Impact { get; set; }

    /// <summary>Engine metrics behind the notification, for inline display.</summary>
    public Dictionary<string, string> Metrics { get; set; } = [];

    public DateTime CreatedAt { get; set; }
}
