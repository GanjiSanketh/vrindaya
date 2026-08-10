using Vrindaya.Api.AI.Notifications.Models;

namespace Vrindaya.Api.AI.Notifications.DTOs;

/// <summary>
/// Aggregate notification result — the ordered notification list plus
/// per-action and per-priority counts.
/// </summary>
public sealed class NotificationCollectionDto
{
    /// <summary>Notifications ordered by priority, then impact descending.</summary>
    public List<NotificationDto> Notifications { get; set; } = [];

    public int TotalNotifications { get; set; }

    /// <summary>Notifications in the Critical or High bands.</summary>
    public int UrgentCount { get; set; }

    /// <summary>Notification count per action type.</summary>
    public Dictionary<NotificationAction, int> CountByAction { get; set; } = [];

    /// <summary>Notification count per urgency band.</summary>
    public Dictionary<NotificationPriority, int> CountByPriority { get; set; } = [];

    public DateTime GeneratedAt { get; set; }
}
