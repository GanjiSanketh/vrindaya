using Vrindaya.Api.Models;

namespace Vrindaya.Api.Interfaces;

/// <summary>A single document at homepageConfig/singleton — see HomepageConfigDocument.</summary>
public interface IHomepageConfigRepository
{
    /// <summary>Null if the singleton has never been saved — callers treat that as an all-defaults config.</summary>
    Task<HomepageConfigDocument?> GetAsync(CancellationToken cancellationToken);

    Task SetAsync(HomepageConfigDocument document, CancellationToken cancellationToken);
}
