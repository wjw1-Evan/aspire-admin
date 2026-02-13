using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 园区招商管理服务实现
/// </summary>
public class ParkInvestmentService : IParkInvestmentService
{
    private readonly IDataFactory<InvestmentLead> _leadFactory;
    private readonly IDataFactory<InvestmentProject> _projectFactory;
    private readonly IDataFactory<InvestmentFollowUp> _followUpFactory;
    private readonly ILogger<ParkInvestmentService> _logger;

    /// <summary>
    /// 初始化园区招商管理服务
    /// </summary>
    public ParkInvestmentService(
        IDataFactory<InvestmentLead> leadFactory,
        IDataFactory<InvestmentProject> projectFactory,
        IDataFactory<InvestmentFollowUp> followUpFactory,
        ILogger<ParkInvestmentService> logger)
    {
        _leadFactory = leadFactory;
        _projectFactory = projectFactory;
        _followUpFactory = followUpFactory;
        _logger = logger;
    }

    #region 线索管理

    /// <summary>
    /// 获取线索列表
    /// </summary>
    public async Task<InvestmentLeadListResponse> GetLeadsAsync(InvestmentLeadListRequest request)
    {
        var search = request.Search?.ToLower();
        var status = request.Status;
        var source = request.Source;
        var priority = request.Priority;
        var assignedTo = request.AssignedTo;

        var (items, total) = await _leadFactory.FindPagedAsync(
            l => (string.IsNullOrEmpty(search) || l.CompanyName.ToLower().Contains(search)) &&
                 (string.IsNullOrEmpty(status) || l.Status == status) &&
                 (string.IsNullOrEmpty(source) || l.Source == source) &&
                 (string.IsNullOrEmpty(priority) || l.Priority == priority) &&
                 (string.IsNullOrEmpty(assignedTo) || l.AssignedTo == assignedTo),
            q => request.SortOrder?.ToLower() == "asc"
                ? q.OrderBy(l => l.CreatedAt)
                : q.OrderByDescending(l => l.CreatedAt),
            request.Page,
            request.PageSize);

        return new InvestmentLeadListResponse
        {
            Leads = items.Select(MapToLeadDto).ToList(),
            Total = (int)total
        };
    }

    /// <summary>
    /// 获取线索详情
    /// </summary>
    public async Task<InvestmentLeadDto?> GetLeadByIdAsync(string id)
    {
        var lead = await _leadFactory.GetByIdAsync(id);
        return lead != null ? MapToLeadDto(lead) : null;
    }

    /// <summary>
    /// 创建线索
    /// </summary>
    public async Task<InvestmentLeadDto> CreateLeadAsync(CreateInvestmentLeadRequest request)
    {
        var lead = new InvestmentLead
        {
            CompanyName = request.CompanyName,
            ContactPerson = request.ContactPerson,
            Phone = request.Phone,
            Email = request.Email,
            Industry = request.Industry,
            Source = request.Source ?? "Direct",
            IntendedArea = request.IntendedArea,
            Budget = request.Budget,
            Priority = request.Priority ?? "Medium",
            Requirements = request.Requirements,
            Notes = request.Notes,
            AssignedTo = request.AssignedTo,
            NextFollowUpDate = request.NextFollowUpDate,
            Status = "New"
        };

        await _leadFactory.CreateAsync(lead);
        return MapToLeadDto(lead);
    }

    /// <summary>
    /// 更新线索
    /// </summary>
    public async Task<InvestmentLeadDto?> UpdateLeadAsync(string id, CreateInvestmentLeadRequest request)
    {
        var updatedLead = await _leadFactory.UpdateAsync(id, lead =>
        {
            lead.CompanyName = request.CompanyName;
            lead.ContactPerson = request.ContactPerson;
            lead.Phone = request.Phone;
            lead.Email = request.Email;
            lead.Industry = request.Industry;
            lead.Source = request.Source ?? lead.Source;
            lead.IntendedArea = request.IntendedArea;
            lead.Budget = request.Budget;
            lead.Priority = request.Priority ?? lead.Priority;
            lead.Requirements = request.Requirements;
            lead.Notes = request.Notes;
            lead.AssignedTo = request.AssignedTo;
            lead.NextFollowUpDate = request.NextFollowUpDate;
        });

        return updatedLead != null ? MapToLeadDto(updatedLead) : null;
    }

    /// <summary>
    /// 删除线索
    /// </summary>
    public async Task<bool> DeleteLeadAsync(string id)
    {
        return await _leadFactory.SoftDeleteAsync(id);
    }

    /// <summary>
    /// 线索转化为项目
    /// </summary>
    public async Task<InvestmentProjectDto?> ConvertLeadToProjectAsync(string leadId)
    {
        var lead = await _leadFactory.GetByIdAsync(leadId);
        if (lead == null || lead.Status == "Lost") return null;

        var project = new InvestmentProject
        {
            LeadId = leadId,
            ProjectName = $"{lead.CompanyName} - 招商项目",
            CompanyName = lead.CompanyName,
            ContactPerson = lead.ContactPerson,
            Phone = lead.Phone,
            IntendedArea = lead.IntendedArea,
            AssignedTo = lead.AssignedTo,
            Stage = "Initial"
        };

        await _projectFactory.CreateAsync(project);

        await _leadFactory.UpdateAsync(leadId, l => l.Status = "Qualified");

        return MapToProjectDto(project);
    }

    private InvestmentLeadDto MapToLeadDto(InvestmentLead lead) => new()
    {
        Id = lead.Id,
        CompanyName = lead.CompanyName,
        ContactPerson = lead.ContactPerson,
        Phone = lead.Phone,
        Email = lead.Email,
        Industry = lead.Industry,
        Source = lead.Source,
        IntendedArea = lead.IntendedArea,
        Status = lead.Status,
        Priority = lead.Priority,
        AssignedTo = lead.AssignedTo,
        NextFollowUpDate = lead.NextFollowUpDate,
        CreatedAt = lead.CreatedAt
    };

    #endregion

    #region 项目管理

    /// <summary>
    /// 获取项目列表
    /// </summary>
    public async Task<InvestmentProjectListResponse> GetProjectsAsync(InvestmentProjectListRequest request)
    {
        var search = request.Search?.ToLower();
        var stage = request.Stage;
        var assignedTo = request.AssignedTo;

        var (items, total) = await _projectFactory.FindPagedAsync(
            p => (string.IsNullOrEmpty(search) || p.ProjectName.ToLower().Contains(search)) &&
                 (string.IsNullOrEmpty(stage) || p.Stage == stage) &&
                 (string.IsNullOrEmpty(assignedTo) || p.AssignedTo == assignedTo),
            q => request.SortOrder?.ToLower() == "asc"
                ? q.OrderBy(p => p.CreatedAt)
                : q.OrderByDescending(p => p.CreatedAt),
            request.Page,
            request.PageSize);

        return new InvestmentProjectListResponse
        {
            Projects = items.Select(MapToProjectDto).ToList(),
            Total = (int)total
        };
    }

    /// <summary>
    /// 获取项目详情
    /// </summary>
    public async Task<InvestmentProjectDto?> GetProjectByIdAsync(string id)
    {
        var project = await _projectFactory.GetByIdAsync(id);
        return project != null ? MapToProjectDto(project) : null;
    }

    /// <summary>
    /// 创建项目
    /// </summary>
    public async Task<InvestmentProjectDto> CreateProjectAsync(CreateInvestmentProjectRequest request)
    {
        var project = new InvestmentProject
        {
            LeadId = request.LeadId,
            ProjectName = request.ProjectName,
            CompanyName = request.CompanyName,
            ContactPerson = request.ContactPerson,
            Phone = request.Phone,
            IntendedUnitIds = request.IntendedUnitIds,
            IntendedArea = request.IntendedArea,
            ProposedRent = request.ProposedRent,
            Stage = request.Stage ?? "Initial",
            ExpectedSignDate = request.ExpectedSignDate,
            Probability = request.Probability,
            Notes = request.Notes,
            AssignedTo = request.AssignedTo
        };

        await _projectFactory.CreateAsync(project);
        return MapToProjectDto(project);
    }

    /// <summary>
    /// 更新项目
    /// </summary>
    public async Task<InvestmentProjectDto?> UpdateProjectAsync(string id, CreateInvestmentProjectRequest request)
    {
        var updatedProject = await _projectFactory.UpdateAsync(id, project =>
        {
            project.ProjectName = request.ProjectName;
            project.CompanyName = request.CompanyName;
            project.ContactPerson = request.ContactPerson;
            project.Phone = request.Phone;
            project.IntendedUnitIds = request.IntendedUnitIds;
            project.IntendedArea = request.IntendedArea;
            project.ProposedRent = request.ProposedRent;
            project.Stage = request.Stage ?? project.Stage;
            project.ExpectedSignDate = request.ExpectedSignDate;
            project.Probability = request.Probability;
            project.Notes = request.Notes;
            project.AssignedTo = request.AssignedTo;
        });

        return updatedProject != null ? MapToProjectDto(updatedProject) : null;
    }

    /// <summary>
    /// 删除项目
    /// </summary>
    public async Task<bool> DeleteProjectAsync(string id)
    {
        return await _projectFactory.SoftDeleteAsync(id);
    }

    private InvestmentProjectDto MapToProjectDto(InvestmentProject project) => new()
    {
        Id = project.Id,
        LeadId = project.LeadId,
        ProjectName = project.ProjectName,
        CompanyName = project.CompanyName,
        ContactPerson = project.ContactPerson,
        Phone = project.Phone,
        IntendedArea = project.IntendedArea,
        ProposedRent = project.ProposedRent,
        Stage = project.Stage,
        ExpectedSignDate = project.ExpectedSignDate,
        Probability = project.Probability,
        AssignedTo = project.AssignedTo,
        CreatedAt = project.CreatedAt
    };

    #endregion

    #region 统计

    /// <summary>
    /// 获取招商统计数据
    /// </summary>
    public async Task<InvestmentStatisticsResponse> GetStatisticsAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        DateTime start = startDate ?? new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        DateTime end = endDate ?? DateTime.UtcNow;

        // Stock metrics (State at 'end' date)
        var totalLeadsAtEnd = await _leadFactory.CountAsync(l => l.CreatedAt <= end);
        var totalProjectsAtEnd = await _projectFactory.CountAsync(p => p.CreatedAt <= end);
        var signedProjectsTotal = await _projectFactory.CountAsync(p => p.CreatedAt <= end && p.Stage == "Completed");

        // Flow metrics (Activity during period)
        var newLeadsInPeriod = await _leadFactory.CountAsync(l => l.CreatedAt >= start && l.CreatedAt <= end);
        var signedProjectsInPeriod = await _projectFactory.CountAsync(p => p.Stage == "Completed" && p.ExpectedSignDate >= start && p.ExpectedSignDate <= end);

        // Conversion Rate
        var conversionRate = totalLeadsAtEnd > 0 ? Math.Round((decimal)signedProjectsTotal / totalLeadsAtEnd * 100, 2) : 0;

        // Comparisons
        var momStart = start.AddMonths(-1);
        var momEnd = end.AddMonths(-1);
        var momNewLeads = await _leadFactory.CountAsync(l => l.CreatedAt >= momStart && l.CreatedAt <= momEnd);
        var momSignedProjects = await _projectFactory.CountAsync(p => p.Stage == "Completed" && p.ExpectedSignDate >= momStart && p.ExpectedSignDate <= momEnd);

        var yoyStart = start.AddYears(-1);
        var yoyEnd = end.AddYears(-1);
        var yoyNewLeads = await _leadFactory.CountAsync(l => l.CreatedAt >= yoyStart && l.CreatedAt <= yoyEnd);
        var yoySignedProjects = await _projectFactory.CountAsync(p => p.Stage == "Completed" && p.ExpectedSignDate >= yoyStart && p.ExpectedSignDate <= yoyEnd);

        double? CalculateGrowth(long current, long previous)
        {
            if (previous == 0) return current > 0 ? 100 : 0;
            return (double)Math.Round((decimal)(current - previous) / previous * 100, 2);
        }

        var leads = await _leadFactory.FindAsync(l => l.CreatedAt <= end);
        var projects = await _projectFactory.FindAsync(p => p.CreatedAt <= end);

        return new InvestmentStatisticsResponse
        {
            TotalLeads = (int)totalLeadsAtEnd,
            NewLeadsThisMonth = (int)newLeadsInPeriod,
            TotalProjects = (int)totalProjectsAtEnd,
            ProjectsInNegotiation = projects.Count(p => p.Stage == "Negotiation"),
            SignedProjects = (int)signedProjectsTotal,
            ConversionRate = conversionRate,
            LeadsByStatus = leads.GroupBy(l => l.Status).ToDictionary(g => g.Key, g => g.Count()),
            ProjectsByStage = projects.GroupBy(p => p.Stage).ToDictionary(g => g.Key, g => g.Count()),
            NewLeadsYoY = CalculateGrowth(newLeadsInPeriod, yoyNewLeads),
            NewLeadsMoM = CalculateGrowth(newLeadsInPeriod, momNewLeads),
            SignedProjectsYoY = CalculateGrowth(signedProjectsInPeriod, yoySignedProjects),
            SignedProjectsMoM = CalculateGrowth(signedProjectsInPeriod, momSignedProjects)
        };
    }

    #endregion
}
