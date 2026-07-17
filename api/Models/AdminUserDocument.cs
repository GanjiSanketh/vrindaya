using Google.Cloud.Firestore;

namespace Vrindaya.Api.Models;

/// <summary>
/// Maps to a document in Firestore's adminUsers collection. The document
/// key is the user's own email address, lowercased/trimmed (see
/// AdminUserRepository.NormalizeEmail) — this is what gives "Email should
/// be unique" for free (CreateAsync throws if a document already exists at
/// that key), the same structural-uniqueness trick CategoryDocument/
/// CollectionDocument already use (doc key = slug). Id is still stored as
/// its own field (a GUID, generated at creation) purely so API responses
/// have a stable identifier that isn't "the email, url-encoded" — nothing
/// internal keys off it; every repository lookup/mutation goes by email.
/// </summary>
[FirestoreData]
public class AdminUserDocument
{
    [FirestoreProperty("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>The Firebase/Google "sub" (uid) claim — unknown until this person's first successful login, so null until then.</summary>
    [FirestoreProperty("googleUserId")]
    public string? GoogleUserId { get; set; }

    [FirestoreProperty("name")]
    public string Name { get; set; } = string.Empty;

    [FirestoreProperty("email")]
    public string Email { get; set; } = string.Empty;

    /// <summary>One of AdminRoles' constants — stored as a plain string (same convention as LifecycleStage), not a Firestore-native enum.</summary>
    [FirestoreProperty("role")]
    public string Role { get; set; } = string.Empty;

    [FirestoreProperty("isActive")]
    public bool IsActive { get; set; }

    [FirestoreProperty("createdAt")]
    public DateTime CreatedAt { get; set; }

    [FirestoreProperty("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;

    [FirestoreProperty("updatedAt")]
    public DateTime UpdatedAt { get; set; }

    [FirestoreProperty("updatedBy")]
    public string UpdatedBy { get; set; } = string.Empty;
}
