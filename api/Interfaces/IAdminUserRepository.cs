using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

public interface IAdminUserRepository
{
    /// <summary>All admin users, ordered by CreatedAt — the collection is small (a handful of rows), so no pagination and no composite index needed anywhere in this repository.</summary>
    Task<List<AdminUserDocument>> GetAllAsync(CancellationToken cancellationToken);

    /// <summary>Email is normalized (trimmed/lowercased) before lookup — see AdminUserRepository.NormalizeEmail. Null if no admin user exists for that email.</summary>
    Task<AdminUserDocument?> GetByEmailAsync(string email, CancellationToken cancellationToken);

    /// <summary>Throws if a document already exists at this (normalized) email — the structural uniqueness guarantee.</summary>
    Task CreateAsync(AdminUserDocument document, CancellationToken cancellationToken);

    Task UpdateAsync(string email, AdminUserDocument document, CancellationToken cancellationToken);
}
