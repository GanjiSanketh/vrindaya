namespace Vrindaya.Api.Common;

/// <summary>Generic cursor-paginated response envelope — Firestore has no cheap offset/skip at scale.</summary>
public class PagedResult<T>
{
    public List<T> Items { get; set; } = [];
    public string? NextCursor { get; set; }
    public int TotalCount { get; set; }
}
