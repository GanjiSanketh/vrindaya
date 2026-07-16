using Google.Cloud.Firestore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Scripts;

/// <summary>
/// One-time maintenance tool for the pre-Cloudinary legacy-image cleanup —
/// NOT part of the normal request pipeline (see Program.cs: only runs when
/// the process is started with a "--migrate-legacy-images" argument, and
/// exits immediately afterward without starting the web server). Safe to
/// delete this file and its Program.cs hook once the migration is done and
/// verified; nothing else in the app depends on it.
///
/// Two modes:
///   dotnet run -- migrate-legacy-images scan
///     Read-only. Scans every collection/singleton doc that can hold an
///     image field for any string value starting with "assets/" (the
///     signature of a pre-Cloudinary/pre-Firebase-Storage local asset path)
///     and prints a report. Safe to run anytime, including against
///     production, since it never writes.
///
///   dotnet run -- migrate-legacy-images fix-categories &lt;source-dir&gt; [--apply]
///     Uploads {source-dir}/{categoryId}.png for each of the 4 known
///     legacy categories (long-kurtas, short-kurtas, 2-piece-sets,
///     3-piece-sets) to Cloudinary under categories/, then updates that
///     category's Image/ImagePublicId fields to the resulting Cloudinary
///     secure URL/public id. Without --apply this only validates the
///     source files exist and prints what it WOULD do (dry run) — no
///     network calls, no writes. Only add --apply once you've reviewed the
///     dry-run output.
/// </summary>
public static class LegacyImageMigration
{
    private const string AssetsPrefix = "assets/";

    /// <summary>The only 4 category ids known (as of this migration) to still hold a legacy assets/ path — see the audit that produced this list. Any category NOT in this list is intentionally left untouched by fix-categories.</summary>
    private static readonly string[] KnownLegacyCategoryIds =
    [
        "long-kurtas", "short-kurtas", "2-piece-sets", "3-piece-sets",
    ];

    public static async Task RunAsync(IServiceProvider services, string[] args)
    {
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("LegacyImageMigration");
        var mode = args.Length > 1 ? args[1] : "scan";

        switch (mode)
        {
            case "scan":
                await ScanAsync(services, logger);
                break;

            case "fix-categories":
                var sourceDir = args.Length > 2 ? args[2] : null;
                var apply = args.Contains("--apply");
                if (string.IsNullOrWhiteSpace(sourceDir))
                {
                    logger.LogError("Usage: migrate-legacy-images fix-categories <source-dir> [--apply]");
                    return;
                }
                await FixCategoriesAsync(services, logger, sourceDir, apply);
                break;

            default:
                logger.LogError("Unknown mode '{Mode}'. Use 'scan' or 'fix-categories'.", mode);
                break;
        }
    }

    /// <summary>Read-only audit — no Firestore writes, no Storage calls.</summary>
    private static async Task ScanAsync(IServiceProvider services, ILogger logger)
    {
        var db = services.GetRequiredService<IFirebaseService>().GetFirestoreDb();
        var findings = new List<string>();

        async Task<List<(string Id, T Data)>> LoadAllAsync<T>(string collection) where T : class
        {
            var snapshot = await db.Collection(collection).GetSnapshotAsync();
            return snapshot.Documents.Select(d => (d.Id, d.ConvertTo<T>())).ToList();
        }

        bool IsLegacy(string? value) => !string.IsNullOrEmpty(value) && value.StartsWith(AssetsPrefix, StringComparison.OrdinalIgnoreCase);

        void Flag(string collection, string docId, string field, string? value)
        {
            if (IsLegacy(value)) findings.Add($"{collection}/{docId}.{field} = \"{value}\"");
        }

        foreach (var (id, doc) in await LoadAllAsync<CategoryDocument>("categories"))
        {
            Flag("categories", id, "image", doc.Image);
            Flag("categories", id, "bannerImage", doc.BannerImage);
        }

        foreach (var (id, doc) in await LoadAllAsync<CollectionDocument>("collections"))
        {
            Flag("collections", id, "image", doc.Image);
            Flag("collections", id, "bannerImage", doc.BannerImage);
        }

        foreach (var (id, doc) in await LoadAllAsync<HeroBannerDocument>("heroBanners"))
        {
            Flag("heroBanners", id, "backgroundImageUrl", doc.BackgroundImageUrl);
            Flag("heroBanners", id, "mobileImageUrl", doc.MobileImageUrl);
        }

        foreach (var (id, doc) in await LoadAllAsync<PromotionalBannerDocument>("promotionalBanners"))
        {
            Flag("promotionalBanners", id, "desktopImageUrl", doc.DesktopImageUrl);
            Flag("promotionalBanners", id, "mobileImageUrl", doc.MobileImageUrl);
        }

        foreach (var (id, doc) in await LoadAllAsync<ProductDocument>("products"))
        {
            foreach (var img in doc.Images)
            {
                Flag("products", id, $"images[{img.Order}].url", img.Url);
            }
        }

        var homepageConfigSnap = await db.Collection("homepageConfig").Document("singleton").GetSnapshotAsync();
        if (homepageConfigSnap.Exists)
        {
            var config = homepageConfigSnap.ConvertTo<HomepageConfigDocument>();
            Flag("homepageConfig", "singleton", "footerBanner.imageUrl", config.FooterBanner.ImageUrl);
            foreach (var img in config.Instagram.Images)
            {
                Flag("homepageConfig", "singleton", $"instagram.images[].url", img.Url);
            }
        }

        var brandConfigSnap = await db.Collection("brandConfig").Document("singleton").GetSnapshotAsync();
        if (brandConfigSnap.Exists)
        {
            var brand = brandConfigSnap.ConvertTo<BrandConfigDocument>();
            Flag("brandConfig", "singleton", "aboutUs.imageUrl", brand.AboutUs.ImageUrl);
        }

        if (findings.Count == 0)
        {
            logger.LogInformation("Scan complete — no legacy 'assets/' paths found in any collection.");
            return;
        }

        logger.LogWarning("Scan complete — {Count} legacy 'assets/' value(s) found:", findings.Count);
        foreach (var f in findings)
        {
            logger.LogWarning("  {Finding}", f);
        }
    }

    /// <summary>Targeted fix for the 4 known legacy Category rows. Dry-run unless --apply is passed.</summary>
    private static async Task FixCategoriesAsync(IServiceProvider services, ILogger logger, string sourceDir, bool apply)
    {
        var db = services.GetRequiredService<IFirebaseService>().GetFirestoreDb();
        var cloudinary = services.GetRequiredService<ICloudinaryService>();

        foreach (var categoryId in KnownLegacyCategoryIds)
        {
            var sourcePath = Path.Combine(sourceDir, $"{categoryId}.png");
            if (!File.Exists(sourcePath))
            {
                logger.LogError("Missing source file for '{CategoryId}': {Path}", categoryId, sourcePath);
                continue;
            }

            var docRef = db.Collection("categories").Document(categoryId);
            var snapshot = await docRef.GetSnapshotAsync();
            if (!snapshot.Exists)
            {
                logger.LogError("Category '{CategoryId}' does not exist in Firestore — skipping.", categoryId);
                continue;
            }

            var currentImage = snapshot.ConvertTo<CategoryDocument>().Image;
            if (!currentImage.StartsWith(AssetsPrefix, StringComparison.OrdinalIgnoreCase))
            {
                logger.LogInformation("Category '{CategoryId}' no longer holds a legacy path (current Image = \"{Image}\") — skipping.", categoryId, currentImage);
                continue;
            }

            if (!apply)
            {
                logger.LogInformation("[DRY RUN] Would upload {Path} to Cloudinary under categories/ and update categories/{CategoryId}.image (currently \"{Current}\").", sourcePath, categoryId, currentImage);
                continue;
            }

            var bytes = await File.ReadAllBytesAsync(sourcePath);
            var result = await cloudinary.UploadImageAsync("categories", bytes, "image/png", "png", categoryId, CancellationToken.None);

            await docRef.UpdateAsync(new Dictionary<string, object>
            {
                ["image"] = result.SecureUrl,
                ["imagePublicId"] = result.PublicId,
                ["updatedAt"] = DateTime.UtcNow,
            });

            logger.LogInformation("Category '{CategoryId}' migrated — Image now {Url}", categoryId, result.SecureUrl);
        }
    }
}
