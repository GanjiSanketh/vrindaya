using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Admin;

/// <summary>
/// Firestore access for the adminUsers collection. The document key is
/// always the normalized (trimmed, lowercased) email — this is what makes
/// "Email should be unique" a structural guarantee rather than a query
/// someone could forget to run, the same pattern CategoryRepository/
/// CollectionRepository use with their own slug-as-key documents.
/// </summary>
public class AdminUserRepository : IAdminUserRepository
{
    private const string Collection = "adminUsers";

    private readonly IFirebaseService _firebaseService;

    public AdminUserRepository(IFirebaseService firebaseService)
    {
        _firebaseService = firebaseService;
    }

    public async Task<List<AdminUserDocument>> GetAllAsync(CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).OrderBy("createdAt").GetSnapshotAsync(cancellationToken);
        return snapshot.Documents.Select(d => d.ConvertTo<AdminUserDocument>()).ToList();
    }

    public async Task<AdminUserDocument?> GetByEmailAsync(string email, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        var snapshot = await db.Collection(Collection).Document(NormalizeEmail(email)).GetSnapshotAsync(cancellationToken);
        return snapshot.Exists ? snapshot.ConvertTo<AdminUserDocument>() : null;
    }

    public async Task CreateAsync(AdminUserDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(NormalizeEmail(document.Email)).CreateAsync(document, cancellationToken);
    }

    public async Task UpdateAsync(string email, AdminUserDocument document, CancellationToken cancellationToken)
    {
        var db = _firebaseService.GetFirestoreDb();
        await db.Collection(Collection).Document(NormalizeEmail(email)).SetAsync(document, cancellationToken: cancellationToken);
    }

    /// <summary>Trims and lowercases so "Admin@X.com " and "admin@x.com" are always the same document — matches the case-insensitive email compare already used everywhere else in this app (AppConstants.AdminEmail, ClaimsPrincipalExtensions).</summary>
    public static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}
