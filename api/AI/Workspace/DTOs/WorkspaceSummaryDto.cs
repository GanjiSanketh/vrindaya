namespace Vrindaya.Api.AI.Workspace.DTOs;

public class WorkspaceSummaryDto
{
    public string Id { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Status { get; set; } = "active";

    public string CurrentModule { get; set; } = string.Empty;

    public int MessageCount { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}
