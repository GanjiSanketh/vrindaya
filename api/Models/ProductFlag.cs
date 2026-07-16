using System.Text.Json.Serialization;

namespace Vrindaya.Api.Models;

/// <summary>Which boolean flag a bulk operation targets — collapses what would otherwise be six near-identical mark/remove-Featured/NewArrival/BestSeller methods into one parameterized one. Never persisted (the Firestore fields stay the existing plain "featured"/"newArrival"/"bestSeller" booleans) — this only exists as a request-body dispatch value, so a native enum is fine here unlike LifecycleStage.</summary>
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ProductFlag
{
    Featured,
    NewArrival,
    BestSeller,
}
