using Vrindaya.Api.AI.Core.Models;

namespace Vrindaya.Api.AI.Core.Interfaces;

public interface IAiDiagnosticsDashboardService
{
    AiDiagnosticsSummary GetSummary();
}
