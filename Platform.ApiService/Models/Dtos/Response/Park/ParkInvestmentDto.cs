using System.ComponentModel.DataAnnotations;
using Platform.ApiService.Models;

namespace Platform.ApiService.Models;

public class InvestmentLeadDto
{
    public string Id { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Industry { get; set; }
    public string Source { get; set; } = string.Empty;
    public decimal? IntendedArea { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string? AssignedTo { get; set; }
    public string? AssignedToName { get; set; }
    public DateTime? NextFollowUpDate { get; set; }
}

public class CreateInvestmentLeadRequest
{
    [Required]
    public string CompanyName { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Industry { get; set; }
    public string? Source { get; set; }
    public decimal? IntendedArea { get; set; }
    public decimal? Budget { get; set; }
    public string? Priority { get; set; }
    public string? Requirements { get; set; }
    public string? Notes { get; set; }
    public string? AssignedTo { get; set; }
    public DateTime? NextFollowUpDate { get; set; }
}

public class InvestmentProjectDto
{
    public string Id { get; set; } = string.Empty;
    public string? LeadId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public decimal? IntendedArea { get; set; }
    public decimal? ProposedRent { get; set; }
    public string Stage { get; set; } = string.Empty;
    public DateTime? ExpectedSignDate { get; set; }
    public decimal? Probability { get; set; }
    public string? AssignedTo { get; set; }
    public string? AssignedToName { get; set; }
}

public class CreateInvestmentProjectRequest
{
    public string? LeadId { get; set; }
    [Required]
    public string ProjectName { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public string? Phone { get; set; }
    public List<string>? IntendedUnitIds { get; set; }
    public decimal? IntendedArea { get; set; }
    public decimal? ProposedRent { get; set; }
    public string? Stage { get; set; }
    public DateTime? ExpectedSignDate { get; set; }
    public decimal? Probability { get; set; }
    public string? Notes { get; set; }
    public string? AssignedTo { get; set; }
}

public class InvestmentStatisticsResponse
{
    public int TotalLeads { get; set; }
    public int NewLeadsThisMonth { get; set; }
    public int TotalProjects { get; set; }
    public int ProjectsInNegotiation { get; set; }
    public int SignedProjects { get; set; }
    public decimal ConversionRate { get; set; }
    public Dictionary<string, int> LeadsByStatus { get; set; } = new();
    public Dictionary<string, int> ProjectsByStage { get; set; } = new();
    public double? NewLeadsYoY { get; set; }
    public double? NewLeadsMoM { get; set; }
    public double? SignedProjectsYoY { get; set; }
    public double? SignedProjectsMoM { get; set; }
}
