using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

/// <summary>A single document at brandConfig/singleton — see BrandConfigDocument.</summary>
public interface IBrandConfigRepository
{
    /// <summary>Null if the singleton has never been saved — callers treat that as an all-defaults config.</summary>
    Task<BrandConfigDocument?> GetAsync(CancellationToken cancellationToken);

    Task SetAsync(BrandConfigDocument document, CancellationToken cancellationToken);
}
