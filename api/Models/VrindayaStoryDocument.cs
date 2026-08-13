using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

/// <summary>
/// Maps to the nested <c>vrindayaStory</c> object inside the single
/// "active" document of the homepageConfig collection — the same CMS
/// record that already hosts heroShowcase. The story is an ordered list
/// of brand-story beats (heritage, fabric, silhouette...), each with its
/// own image (Cloudinary), alt text, object-position, and copy.
/// </summary>
[FirestoreData]
public class VrindayaStoryDocument
{
    /// <summary>Ordered story beats. Order follows DisplayOrder, kept in sync by the admin save.</summary>
    [FirestoreProperty("items")]
    public List<VrindayaStoryItemDocument> Items { get; set; } = new();

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }

    [FirestoreProperty("updatedBy")]
    public string UpdatedBy { get; set; } = string.Empty;
}

/// <summary>One beat in the brand story (nested map inside vrindayaStory.items).</summary>
[FirestoreData]
public class VrindayaStoryItemDocument
{
    /// <summary>Stable client-generated id (story-1, story-2, ...) used as the Angular track key and the defaults-lookup key on the storefront.</summary>
    [FirestoreProperty("storyId")]
    public string StoryId { get; set; } = string.Empty;

    /// <summary>Display number, e.g. "01" — shown as the editorial index on the public site.</summary>
    [FirestoreProperty("storyNumber")]
    public string StoryNumber { get; set; } = string.Empty;

    /// <summary>Editorial title, e.g. "Rooted in heritage".</summary>
    [FirestoreProperty("title")]
    public string Title { get; set; } = string.Empty;

    /// <summary>Supporting description shown beneath the title.</summary>
    [FirestoreProperty("description")]
    public string Description { get; set; } = string.Empty;

    /// <summary>Cloudinary secure URL of the story image.</summary>
    [FirestoreProperty("imageUrl")]
    public string ImageUrl { get; set; } = string.Empty;

    /// <summary>Accessible description of the image.</summary>
    [FirestoreProperty("imageAlt")]
    public string ImageAlt { get; set; } = string.Empty;

    /// <summary>
    /// CSS object-position keyword: "top" | "center" | "bottom" | "left" |
    /// "right". Drives where the model sits inside the frame on the public
    /// site — an admin concern, never a CSS edit.
    /// </summary>
    [FirestoreProperty("imagePosition")]
    public string ImagePosition { get; set; } = "center";

    /// <summary>1-based position within the story; reassigned on every save.</summary>
    [FirestoreProperty("displayOrder")]
    public int DisplayOrder { get; set; }

    /// <summary>Inactive beats are kept in the config but never rendered by the storefront.</summary>
    [FirestoreProperty("isActive")]
    public bool IsActive { get; set; } = true;

    /// <summary>Cloudinary public id (vrindaya-story/items/...) — used to delete/replace the stored asset.</summary>
    [FirestoreProperty("storagePath")]
    public string StoragePath { get; set; } = string.Empty;

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }
}
