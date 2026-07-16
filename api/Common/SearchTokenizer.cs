using System.Text.RegularExpressions;

namespace Vrindaya.Api.Common;

/// <summary>
/// Shared word-splitting used both when writing a product's precomputed
/// SearchKeywords array and when matching a search query against it —
/// keeping both sides of that array-contains-any comparison tokenized
/// identically is what makes the match work at all.
/// </summary>
public static partial class SearchTokenizer
{
    public static List<string> Tokenize(string text) =>
        NonAlphanumericPattern().Split(text.ToLowerInvariant()).Where(t => t.Length > 0).Distinct().ToList();

    [GeneratedRegex(@"[^a-z0-9]+")]
    private static partial Regex NonAlphanumericPattern();
}
