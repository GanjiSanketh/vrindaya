namespace Vrindaya.Api.Interfaces;

/// <summary>
/// Pure, stateless image processing — no Firestore/Storage dependency at
/// all, fully unit-testable in isolation.
/// </summary>
public interface IImageCompressionService
{
    /// <summary>Validates, decodes, resizes (longest edge capped), and re-encodes as WebP.</summary>
    Task<CompressedImageResult> CompressAsync(Stream input, CancellationToken cancellationToken);
}

public record CompressedImageResult(byte[] Bytes, string ContentType, string Extension);
