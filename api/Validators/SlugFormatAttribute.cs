using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace Vrindaya.Api.Validators;

/// <summary>Validates kebab-case slug format: lowercase letters, numbers, and single hyphens only.</summary>
public partial class SlugFormatAttribute : ValidationAttribute
{
    public SlugFormatAttribute()
        : base("Slug must be lowercase letters, numbers, and hyphens only (e.g. wine-mandala-kurta).")
    {
    }

    public override bool IsValid(object? value)
    {
        return value is string slug && SlugPattern().IsMatch(slug);
    }

    [GeneratedRegex(@"^[a-z0-9]+(?:-[a-z0-9]+)*$")]
    private static partial Regex SlugPattern();
}
