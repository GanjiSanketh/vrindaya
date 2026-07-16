using System.ComponentModel.DataAnnotations;
using Vrindaya.Api.Constants;

namespace Vrindaya.Api.DTOs.Inventory;

/// <summary>PATCH /inventory/bulk-lifecycle — shared-value batched stage transition, powers both "Bulk Status Update" (free choice) and "Bulk Archive" (a UI preset of this same call with Stage=Archived).</summary>
public class BulkLifecycleStageRequest
{
    [Required, MinLength(1)]
    public List<string> Ids { get; set; } = [];

    [Required]
    [AllowedValues(LifecycleStage.Draft, LifecycleStage.PhotographyPending, LifecycleStage.PhotographyComplete,
        LifecycleStage.ImageEditingComplete, LifecycleStage.ReadyForWebsite, LifecycleStage.PublishedOnWebsite,
        LifecycleStage.ReadyForFlipkart, LifecycleStage.ListedOnFlipkart, LifecycleStage.SoldOut, LifecycleStage.Archived)]
    public string Stage { get; set; } = string.Empty;
}
