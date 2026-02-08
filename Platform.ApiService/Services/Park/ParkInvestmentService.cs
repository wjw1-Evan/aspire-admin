using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 园区招商管理服务实现
/// </summary>
public class ParkInvestmentService : IParkInvestmentService
{
    private readonly IDatabaseOperationFactory<InvestmentLead> _leadFactory;
    private readonly IDatabaseOperationFactory<InvestmentProject> _projectFactory;
    private readonly IDatabaseOperationFactory<InvestmentFollowUp> _followUpFactory;
    private readonly ILogger<ParkInvestmentService> _logger;

    /// <summary>
    /// 初始化园区招商管理服务
    /// </summary>
    public ParkInvestmentService(
        IDatabaseOperationFactory<InvestmentLead> leadFactory,
        IDatabaseOperationFactory<InvestmentProject> projectFactory,
        IDatabaseOperationFactory<InvestmentFollowUp> followUpFactory,
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
        var filterBuilder = Builders<InvestmentLead>.Filter;
        var filter = filterBuilder.Empty;

        if (!string.IsNullOrEmpty(request.Search))
        {
            var search = request.Search.ToLower();
            filter &= filterBuilder.Or(
                filterBuilder.Regex(l => l.CompanyName, new MongoDB.Bson.BsonRegularExpression(search, "i")),
                filterBuilder.Regex(l => l.ContactPerson!, new MongoDB.Bson.BsonRegularExpression(search, "i"))
            );
        }

        if (!string.IsNullOrEmpty(request.Status))
            filter &= filterBuilder.Eq(l => l.Status, request.Status);

        if (!string.IsNullOrEmpty(request.Source))
            filter &= filterBuilder.Eq(l => l.Source, request.Source);

        if (!string.IsNullOrEmpty(request.Priority))
            filter &= filterBuilder.Eq(l => l.Priority, request.Priority);

        if (!string.IsNullOrEmpty(request.AssignedTo))
            filter &= filterBuilder.Eq(l => l.AssignedTo!, request.AssignedTo);

        var sortBuilder = _leadFactory.CreateSortBuilder();
        var sort = request.SortOrder?.ToLower() == "asc"
            ? sortBuilder.Ascending(l => l.CreatedAt)
            : sortBuilder.Descending(l => l.CreatedAt);

        var (items, total) = await _leadFactory.FindPagedAsync(filter, sort.Build(), request.Page, request.PageSize);

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
        var lead = await _leadFactory.GetByIdAsync(id);
        if (lead == null) return null;

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

        await _leadFactory.FindOneAndReplaceAsync(Builders<InvestmentLead>.Filter.Eq(l => l.Id, id), lead);
        return MapToLeadDto(lead);
    }

    /// <summary>
    /// 删除线索
    /// </summary>
    public async Task<bool> DeleteLeadAsync(string id)
    {
        var result = await _leadFactory.FindOneAndSoftDeleteAsync(Builders<InvestmentLead>.Filter.Eq(l => l.Id, id));
        return result != null;
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

        lead.Status = "Qualified";
        await _leadFactory.FindOneAndReplaceAsync(Builders<InvestmentLead>.Filter.Eq(l => l.Id, leadId), lead);

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
        var filterBuilder = Builders<InvestmentProject>.Filter;
        var filter = filterBuilder.Empty;

        if (!string.IsNullOrEmpty(request.Search))
        {
            var search = request.Search.ToLower();
            filter &= filterBuilder.Or(
                filterBuilder.Regex(p => p.ProjectName, new MongoDB.Bson.BsonRegularExpression(search, "i")),
                filterBuilder.Regex(p => p.CompanyName, new MongoDB.Bson.BsonRegularExpression(search, "i"))
            );
        }

        if (!string.IsNullOrEmpty(request.Stage))
            filter &= filterBuilder.Eq(p => p.Stage, request.Stage);

        if (!string.IsNullOrEmpty(request.AssignedTo))
            filter &= filterBuilder.Eq(p => p.AssignedTo!, request.AssignedTo);

        var sortBuilder = _projectFactory.CreateSortBuilder();
        var sort = request.SortOrder?.ToLower() == "asc"
            ? sortBuilder.Ascending(p => p.CreatedAt)
            : sortBuilder.Descending(p => p.CreatedAt);

        var (items, total) = await _projectFactory.FindPagedAsync(filter, sort.Build(), request.Page, request.PageSize);

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
        var project = await _projectFactory.GetByIdAsync(id);
        if (project == null) return null;

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

        await _projectFactory.FindOneAndReplaceAsync(Builders<InvestmentProject>.Filter.Eq(p => p.Id, id), project);
        return MapToProjectDto(project);
    }

    /// <summary>
    /// 删除项目
    /// </summary>
    public async Task<bool> DeleteProjectAsync(string id)
    {
        var result = await _projectFactory.FindOneAndSoftDeleteAsync(Builders<InvestmentProject>.Filter.Eq(p => p.Id, id));
        return result != null;
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
    public async Task<InvestmentStatisticsResponse> GetStatisticsAsync(StatisticsPeriod period = StatisticsPeriod.Month, DateTime? startDate = null, DateTime? endDate = null)
    {
        var leads = await _leadFactory.FindAsync();
        var projects = await _projectFactory.FindAsync();

        DateTime start;
        DateTime end = endDate ?? DateTime.UtcNow;

        if (period == StatisticsPeriod.Custom && startDate.HasValue)
        {
            start = startDate.Value;
        }
        else
        {
            start = period switch
            {
                StatisticsPeriod.Day => DateTime.UtcNow.Date,
                StatisticsPeriod.Week => DateTime.UtcNow.Date.AddDays(-(int)DateTime.UtcNow.DayOfWeek),
                StatisticsPeriod.Month => new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1),
                StatisticsPeriod.Year => new DateTime(DateTime.UtcNow.Year, 1, 1),
                _ => new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1)
            };
        }

        var leadsInPeriod = leads.Where(l => l.CreatedAt >= start && l.CreatedAt <= end).ToList();
        var projectsInPeriod = projects.Where(p => p.CreatedAt >= start && p.CreatedAt <= end).ToList();

        // Stock metrics (State at 'end' date)
        var totalLeadsAtEnd = leads.Count(l => l.CreatedAt <= end);
        var totalProjectsAtEnd = projects.Count(p => p.CreatedAt <= end);
        var qualifiedLeads = leads.Count(l => l.CreatedAt <= end && l.Status == "Qualified");
        var signedProjectsTotal = projects.Count(p => p.CreatedAt <= end && p.Stage == "Completed");

        // Flow metrics (Activity during period)
        var newLeadsInPeriod = leadsInPeriod.Count;
        var signedProjectsInPeriod = projects.Count(p => p.Stage == "Completed" && p.ExpectedSignDate >= start && p.ExpectedSignDate <= end); // Using ExpectedSignDate as proxy for SignDate

        // Helper to calculate flow metrics in a specific period
        (int NewLeads, int SignedProjects) CalculateFlowMetrics(DateTime pStart, DateTime pEnd)
        {
            var newLeads = leads.Count(l => l.CreatedAt >= pStart && l.CreatedAt <= pEnd);
            var signedProjects = projects.Count(p => p.Stage == "Completed" && p.ExpectedSignDate >= pStart && p.ExpectedSignDate <= pEnd); // Using ExpectedSignDate as proxy
            return (newLeads, signedProjects);
        }

        var (currentNewLeads, currentSignedProjects) = (newLeadsInPeriod, signedProjectsInPeriod);

        // Conversion Rate: Signed Projects / Total Leads (Lead-to-signing effectiveness)
        var conversionRate = totalLeadsAtEnd > 0 ? Math.Round((decimal)signedProjectsTotal / totalLeadsAtEnd * 100, 2) : 0;

        // MoM Comparison (Previous Period - shift by 1 stats period unit if standard, or same duration)
        // Assuming -1 Month for simplicity as per previous logic
        var momStart = start.AddMonths(-1);
        var momEnd = end.AddMonths(-1);
        var (momNewLeads, momSignedProjects) = CalculateFlowMetrics(momStart, momEnd);

        // YoY Comparison (Same period last year)
        var yoyStart = start.AddYears(-1);
        var yoyEnd = end.AddYears(-1);
        var (yoyNewLeads, yoySignedProjects) = CalculateFlowMetrics(yoyStart, yoyEnd);

        double? CalculateGrowth(decimal current, decimal previous)
        {
            if (previous == 0) return current > 0 ? 100 : 0;
            return (double)Math.Round((current - previous) / previous * 100, 2);
        }

        return new InvestmentStatisticsResponse
        {
            TotalLeads = totalLeadsAtEnd,
            NewLeadsThisMonth = newLeadsInPeriod,
            TotalProjects = totalProjectsAtEnd,
            ProjectsInNegotiation = projects.Count(p => p.Stage == "Negotiation" && p.CreatedAt <= end),
            SignedProjects = signedProjectsTotal,
            ConversionRate = conversionRate,
            LeadsByStatus = leads.Where(l => l.CreatedAt <= end).GroupBy(l => l.Status).ToDictionary(g => g.Key, g => g.Count()),
            ProjectsByStage = projects.Where(p => p.CreatedAt <= end).GroupBy(p => p.Stage).ToDictionary(g => g.Key, g => g.Count()),
            NewLeadsYoY = CalculateGrowth(currentNewLeads, yoyNewLeads),
            NewLeadsMoM = CalculateGrowth(currentNewLeads, momNewLeads),
            SignedProjectsYoY = CalculateGrowth(currentSignedProjects, yoySignedProjects),
            SignedProjectsMoM = CalculateGrowth(currentSignedProjects, momSignedProjects)
        };
    }

    #endregion
}
