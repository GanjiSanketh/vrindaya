using Microsoft.Extensions.DependencyInjection;
using Vrindaya.Api.Constants;
using Vrindaya.Api.Interfaces;
using Vrindaya.Api.Models;

namespace Vrindaya.Api.Services.Admin;

/// <summary>
/// Runs once at application startup (see Program.cs) — idempotent: if
/// AppConstants.AdminEmail already has an AdminUsers record (which it will
/// on every boot after the first), this is a single Firestore read and a
/// no-op. Only creates a document on a genuinely fresh deployment/database,
/// so the app is never left with zero SuperAdmins and nobody able to sign
/// in — this is the "existing owner email" the spec asks to seed with.
/// </summary>
public static class AdminUserSeeder
{
    public static async Task SeedInitialSuperAdminAsync(IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IAdminUserRepository>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("AdminUserSeeder");

        var normalizedEmail = AdminUserRepository.NormalizeEmail(AppConstants.AdminEmail);
        var existing = await repository.GetByEmailAsync(normalizedEmail, CancellationToken.None);
        if (existing != null)
        {
            return;
        }

        var now = DateTime.UtcNow;
        await repository.CreateAsync(new AdminUserDocument
        {
            Id = Guid.NewGuid().ToString(),
            Name = "Super Admin",
            Email = normalizedEmail,
            Role = AdminRoles.SuperAdmin,
            IsActive = true,
            CreatedAt = now,
            CreatedBy = "system:startup-seed",
            UpdatedAt = now,
            UpdatedBy = "system:startup-seed",
        }, CancellationToken.None);

        logger.LogInformation("Seeded initial Super Admin: {Email}", normalizedEmail);
    }
}
