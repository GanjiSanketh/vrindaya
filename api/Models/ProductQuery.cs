namespace Vrindaya.Api.Models;

/// <summary>
/// Query parameters for a paged product list. Every filter/sort combination
/// this type can express has a matching composite index in
/// firestore.indexes.json — see that file's comments for the exact list.
///
/// To keep the index count bounded, at most ONE of Category/ActiveStatus/
/// Featured/NewArrival/BestSeller/Search/(MinPrice-or-MaxPrice)/InStockOnly
/// may be set at a time — ProductRepository.GetPagedAsync applies them in
/// that priority order and ignores the rest if more than one is set.
/// Deleted is independent of that list and always applied when set. This
/// mirrors the admin UI's (and the public Shop page's) mutually-exclusive
/// filter chips: picking a new one clears whatever was active before.
/// </summary>
public class ProductQuery
{
    public int PageSize { get; set; } = 24;

    /// <summary>Opaque — the last returned product's ID. Repository re-fetches its snapshot for StartAfter.</summary>
    public string? Cursor { get; set; }

    /// <summary>"displayOrder" (default) | "createdAt" | "price" | "name" | "stock". Forced to "price" when MinPrice/MaxPrice is set — Firestore requires a range filter's field to be the query's primary sort.</summary>
    public string SortBy { get; set; } = "displayOrder";
    public bool SortDescending { get; set; }

    public string? Category { get; set; }
    public bool? Featured { get; set; }
    public bool? NewArrival { get; set; }
    public bool? BestSeller { get; set; }

    /// <summary>Set by ProductService based on caller identity — never trust a client-supplied value directly. Non-admins are always forced to true.</summary>
    public bool ActiveOnly { get; set; } = true;

    /// <summary>Admin-only status filter, independent of ActiveOnly: true = active only, false = inactive only, null = both. (ActiveOnly=true already covers the "active only" case for non-admins; this exists so an admin can specifically ask for "inactive only", which ActiveOnly alone can't express.)</summary>
    public bool? ActiveStatus { get; set; }

    /// <summary>Admin-only — true shows only soft-deleted products (the "Deleted" tab), false shows only non-deleted ones, null applies no filter. The admin list always sends one of true/false explicitly.</summary>
    public bool? Deleted { get; set; }

    /// <summary>Tokenized the same way as GET /products/search and matched against the precomputed SearchKeywords array — whole-word matches only (Firestore has no substring query), admin-only (searches across active and inactive products, unlike the public search endpoint).</summary>
    public string? Search { get; set; }

    public double? MinPrice { get; set; }
    public double? MaxPrice { get; set; }

    /// <summary>Public Shop-page "Availability" filter — stock &gt; 0. A range filter, so (like MinPrice/MaxPrice) it forces its own field to be the primary sort when applied.</summary>
    public bool? InStockOnly { get; set; }
}
