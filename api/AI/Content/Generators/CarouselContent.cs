namespace Vrindaya.Api.AI.Content.Generators;

/// <summary>
/// A five-slide Instagram carousel produced by the <see cref="CarouselGenerator"/>,
/// with an ordering call-to-action.
/// </summary>
public sealed class CarouselContent
{
    public string Slide1 { get; set; } = string.Empty;

    public string Slide2 { get; set; } = string.Empty;

    public string Slide3 { get; set; } = string.Empty;

    public string Slide4 { get; set; } = string.Empty;

    public string Slide5 { get; set; } = string.Empty;

    public string Cta { get; set; } = string.Empty;
}