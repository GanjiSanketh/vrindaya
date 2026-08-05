using System;

namespace Vrindaya.Api.DTOs.Marketing;

public class DashboardResponse
{
    public double TotalRevenue { get; set; }
    public double RevenueGrowth { get; set; }
    public int Orders { get; set; }
    public int Visitors { get; set; }
    public double ConversionRate { get; set; }
    public string TopProduct { get; set; } = string.Empty;

    // Mapped from the mock OpenRouter provider response
    public string Id { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}

