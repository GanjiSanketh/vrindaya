using System.ComponentModel.DataAnnotations;
using Vrindaya.Api.Constants;

namespace Vrindaya.Api.DTOs.Inventory;

/// <summary>PATCH /inventory/{productId}/lifecycle — single-product stage transition.</summary>
public class UpdateLifecycleStageRequest
{
    [Required]
    [AllowedValues(LifecycleStage.Draft, LifecycleStage.PhotographyPending, LifecycleStage.PhotographyComplete,
        LifecycleStage.ImageEditingComplete, LifecycleStage.ReadyForWebsite, LifecycleStage.PublishedOnWebsite,
        LifecycleStage.ReadyForFlipkart, LifecycleStage.ListedOnFlipkart, LifecycleStage.SoldOut, LifecycleStage.Archived)]
    public string Stage { get; set; } = string.Empty;
}
