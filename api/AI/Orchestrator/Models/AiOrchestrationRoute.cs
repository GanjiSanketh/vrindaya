namespace Vrindaya.Api.AI.Orchestrator.Models;

/// <summary>
/// A named orchestration path — the ordered list of module keys executed for a
/// given request type, mirroring the hub-and-spoke routing table.
/// </summary>
public sealed record AiOrchestrationRoute(
    string Key,
    string Label,
    IReadOnlyList<AiModuleKey> Path);