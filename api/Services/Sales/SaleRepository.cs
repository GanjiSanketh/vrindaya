using Google.Cloud.Firestore;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Sales;

public class SaleRepository : ISaleRepository
{
    private const string Collection = "sales";
    private readonly IFirebaseService _firebaseService;

    public SaleRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    private FirestoreDb Db => _firebaseService.GetFirestoreDb();

    public async Task<List<(string Id, SaleDocument Data)>> GetAllAsync(CancellationToken ct = default)
    {
        var snapshot = await Db.Collection(Collection)
            .OrderByDescending("soldAt")
            .GetSnapshotAsync(ct);

        return snapshot.Documents
            .Select(d => (d.Id, d.ConvertTo<SaleDocument>()))
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
        return docRef.Id;
    }

    public async Task UpdateAsync(string saleId, SaleDocument sale, CancellationToken ct = default)
    {
        sale.CreatedAt = DateTime.UtcNow;
        await Db.Collection(Collection).Document(saleId).SetAsync(sale, cancellationToken: ct);
    }

    public async Task DeleteAsync(string saleId, CancellationToken ct = default)
    {
        await Db.Collection(Collection).Document(saleId).DeleteAsync(cancellationToken: ct);
    }
}
