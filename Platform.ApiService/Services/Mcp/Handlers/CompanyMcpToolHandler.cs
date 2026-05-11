using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services.Mcp.Handlers;

public class CompanyMcpToolHandler : McpToolHandlerBase
{
    private readonly ICompanyService _companyService;
    private readonly IUserCompanyService _userCompanyService;
    private readonly IUserService _userService;
    private readonly DbContext _context;

    public CompanyMcpToolHandler(
        ICompanyService companyService,
        IUserCompanyService userCompanyService,
        IUserService userService,
        DbContext context)
    {
        _companyService = companyService;
        _userCompanyService = userCompanyService;
        _userService = userService;
        _context = context;

        RegisterTool("get_current_company", "获取当前登录用户所属企业的详细信息，包括企业名称、代码、行业、状态等。关键词：当前企业,我的企业,企业信息",
            HandleGetCurrentCompanyAsync);

        RegisterTool("get_company_members", "获取指定企业的成员列表（需管理员权限）。关键词：企业成员,公司成员,团队成员,员工列表",
            ObjectSchema(new Dictionary<string, object>
            {
                ["companyId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "企业ID" }
            }, ["companyId"]),
            HandleGetCompanyMembersAsync);

        RegisterTool("get_my_companies", "获取当前用户加入的所有企业列表。关键词：我的企业,企业列表,所属企业",
            HandleGetMyCompaniesAsync);

        RegisterTool("search_companies", "搜索企业。关键词：搜索企业,查找公司,企业查询",
            ObjectSchema(new Dictionary<string, object>
            {
                ["keyword"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" }
            }, ["keyword"]),
            HandleSearchCompaniesAsync);

        RegisterTool("get_company_statistics", "获取当前企业的统计数据。关键词：企业统计,公司统计,企业数据",
            HandleGetCompanyStatisticsAsync);

        RegisterTool("check_company_code", "检查企业代码是否已被注册。关键词：检查企业代码,企业代码可用性",
            ObjectSchema(new Dictionary<string, object>
            {
                ["code"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "企业代码" }
            }, ["code"]),
            HandleCheckCompanyCodeAsync);

        RegisterTool("create_company", "创建新企业，当前用户自动成为管理员。关键词：创建企业,新建公司,注册企业",
            ObjectSchema(new Dictionary<string, object>
            {
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "企业名称" },
                ["code"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "企业代码" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "企业描述" },
                ["industry"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "所属行业" }
            }, ["name"]),
            HandleCreateCompanyAsync);

        RegisterTool("switch_company", "切换当前活跃企业。关键词：切换企业,更换公司,企业切换",
            ObjectSchema(new Dictionary<string, object>
            {
                ["companyId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "目标企业ID" }
            }, ["companyId"]),
            HandleSwitchCompanyAsync);

        RegisterTool("update_company", "更新当前企业信息。关键词：更新企业,修改企业信息",
            ObjectSchema(new Dictionary<string, object>
            {
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "企业名称" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "企业描述" },
                ["industry"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "行业" }
            }),
            HandleUpdateCompanyAsync);
    }

    private async Task<object?> HandleGetCurrentCompanyAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var user = await _userService.GetUserByIdWithoutTenantFilterAsync(currentUserId);
        if (user == null) return new { error = "用户不存在" };

        string? companyId = user.CurrentCompanyId;
        if (string.IsNullOrEmpty(companyId))
            companyId = user.PersonalCompanyId;

        if (string.IsNullOrEmpty(companyId))
        {
            var myCompanies = await _userCompanyService.GetUserCompaniesAsync(currentUserId);
            var first = myCompanies.FirstOrDefault();
            if (first == null) return new { error = "未找到所属企业" };
            companyId = first.CompanyId;
        }

        var company = await _companyService.GetCompanyByIdAsync(companyId);
        if (company == null) return new { error = "企业信息不存在" };

        return new
        {
            company.Id,
            company.Name,
            company.Code,
            company.Description,
            company.Industry,
            company.IsActive,
            company.CreatedAt
        };
    }

    private async Task<object?> HandleGetCompanyMembersAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var companyId = arguments.GetValueOrDefault("companyId")?.ToString();
        if (string.IsNullOrEmpty(companyId)) return new { error = "companyId 必填" };

        var isAdmin = await _userCompanyService.IsUserAdminInCompanyAsync(currentUserId, companyId);
        if (!isAdmin) return new { error = "只有企业管理员可以查看成员列表" };

        var members = await _userCompanyService.GetCompanyMembersAsync(companyId);
        return new { members };
    }

    private async Task<object?> HandleGetMyCompaniesAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var companies = await _userCompanyService.GetUserCompaniesAsync(currentUserId);
        return new { items = companies };
    }

    private async Task<object?> HandleSearchCompaniesAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var keyword = arguments.GetValueOrDefault("keyword")?.ToString();
        if (string.IsNullOrEmpty(keyword)) return new { error = "keyword 必填" };

        var results = await _companyService.SearchCompaniesAsync(keyword);
        return new { items = results };
    }

    private async Task<object?> HandleGetCompanyStatisticsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var user = await _userService.GetUserByIdWithoutTenantFilterAsync(currentUserId);
        if (user == null || string.IsNullOrEmpty(user.CurrentCompanyId))
            return new { error = "未找到企业信息" };

        var statistics = await _companyService.GetCompanyStatisticsAsync(user.CurrentCompanyId);
        return statistics;
    }

    private async Task<object?> HandleCheckCompanyCodeAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var code = arguments.GetValueOrDefault("code")?.ToString();
        if (string.IsNullOrEmpty(code)) return new { error = "code 必填" };

        var company = await _companyService.GetCompanyByCodeAsync(code);
        var available = company == null;
        return new { code, available, message = available ? "企业代码可用" : "企业代码已被使用" };
    }

    private async Task<object?> HandleCreateCompanyAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var name = arguments.GetValueOrDefault("name")?.ToString();
        if (string.IsNullOrEmpty(name)) return new { error = "企业名称必填" };

        var request = new CreateCompanyRequest
        {
            Name = name,
            Code = arguments.GetValueOrDefault("code")?.ToString(),
            Description = arguments.GetValueOrDefault("description")?.ToString(),
            Industry = arguments.GetValueOrDefault("industry")?.ToString()
        };

        var company = await _companyService.CreateCompanyAsync(request, currentUserId);
        return new { company.Id, company.Name, company.Code, message = "企业创建成功" };
    }

    private async Task<object?> HandleSwitchCompanyAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var companyId = arguments.GetValueOrDefault("companyId")?.ToString();
        if (string.IsNullOrEmpty(companyId)) return new { error = "companyId 必填" };

        var result = await _userCompanyService.SwitchCompanyAsync(companyId);
        return new { success = true, message = "企业切换成功" };
    }

    private async Task<object?> HandleUpdateCompanyAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var user = await _userService.GetUserByIdWithoutTenantFilterAsync(currentUserId);
        if (user == null || string.IsNullOrEmpty(user.CurrentCompanyId))
            return new { error = "未找到企业信息" };

        var request = new UpdateCompanyRequest
        {
            Name = arguments.GetValueOrDefault("name")?.ToString(),
            Description = arguments.GetValueOrDefault("description")?.ToString(),
            Industry = arguments.GetValueOrDefault("industry")?.ToString()
        };

        var success = await _companyService.UpdateCompanyAsync(user.CurrentCompanyId, request);
        return new { success, message = "企业信息更新成功" };
    }
}
