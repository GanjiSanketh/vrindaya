using Google.Cloud.Firestore;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;
using Vrindaya.Api.Services.Interfaces;

namespace Vrindaya.Api.Services.Sales;

public class SaleRepository : ISaleRepository
{
    private const string Collection = "sales";
    private readonly IFirebaseService _firebaseService;
    private readonly IRequestScopedCache _requestCache;

    public SaleRepository(IFirebaseService firebaseService, IRequestScopedCache requestCache)
    {
        _firebaseService = firebaseService;
        _requestCache = requestCache;
    }

    private FirestoreDb Db => _firebaseService.GetFirestoreDb();

    public async Task<List<(string Id, SaleDocument Data)>> GetAllAsync(CancellationToken ct = default)
    {
        // Whole-collection load via the request-scoped cache so repeated reads
        // of the sales collection within one request share a single snapshot.
        // The snapshot is unordered; soldAt ordering is applied here to match
        // the previous OrderByDescending("soldAt") query.
        var snapshot = await _requestCache.GetWholeCollectionSnapshotAsync(Collection, ct);

        return snapshot.Documents
            .Select(d => (Id: d.Id, Data: d.ConvertTo<SaleDocument>()))
            .OrderByDescending(x => x.Data.SoldAt)
            .ToList();
    }

    /// <summary>
    /// Exactly the fields the dashboard (and the BI layer that reuses its raw
    /// snapshot) reads from each sale — a Firestore field-mask projection so
    /// cost breakdowns, customer PII, invoice numbers and notes are never
    /// transferred. Anything absent is left at its default value; soldAt
    /// ordering matches the full read.
    /// </summary>
    private static readonly string[] DashboardSalesFields =
    [
        "productId", "productName", "productImage", "category", "quantity",
        "saleChannel", "paymentMethod", "amountReceived", "profit", "soldAt",
    ];

    public async Task<List<(string Id, SaleDocument Data)>> GetDashboardSalesAsync(CancellationToken ct = default)
    {
        var snapshot = await _requestCache.GetWholeCollectionSnapshotAsync(Collection, DashboardSalesFields, ct);

        return snapshot.Documents
            .Select(d => (Id: d.Id, Data: d.ConvertTo<SaleDocument>()))
            .OrderByDescending(x => x.Data.SoldAt)
            .ToList();
    }

    public async Task<SaleDocument?> GetByIdAsync(string saleId, CancellationToken ct = default)
    {
        var doc = await Db.Collection(Collection).Document(saleId).GetSnapshotAsync(ct);
        if (doc?.Exists != true) return null;
        return doc.ConvertTo<SaleDocument>();
    }

    public async Task<string> CreateAsync(SaleDocument sale, CancellationToken ct = default)
    {
        var docRef = Db.Collection(Collection).Document();
        sale.CreatedAt = DateTime.UtcNow;
        await docRef.CreateAsync(sale, ct);
        _requestCache.Invalidate(Collection);
        return docRef.Id;
    }

    public async Task UpdateAsync(string saleId, SaleDocument sale, CancellationToken ct = default)
    {
        sale.CreatedAt = DateTime.UtcNow;
        await Db.Collection(Collection).Document(saleId).SetAsync(sale, cancellationToken: ct);
        _requestCache.Invalidate(Collection);
    }

    public async Task DeleteAsync(string saleId, CancellationToken ct = default)
    {
        await Db.Collection(Collection).Document(saleId).DeleteAsync(cancellationToken: ct);
        _requestCache.Invalidate(Collection);
    }
}
