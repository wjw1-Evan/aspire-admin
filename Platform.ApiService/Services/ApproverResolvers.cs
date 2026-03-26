using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models.Workflow;
using Platform.ServiceDefaults.Services;
using UserCompany = Platform.ApiService.Models.UserCompany;
using UserOrganization = Platform.ApiService.Models.UserOrganization;
using OrganizationUnit = Platform.ApiService.Models.OrganizationUnit;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户审批人解析器
/// </summary>
public class UserApproverResolver : IApproverResolver
{
    private readonly DbContext _context;
    private readonly IUserService _userService;
    private readonly ILogger<UserApproverResolver> _logger;

    public UserApproverResolver(DbContext context, IUserService userService, ILogger<UserApproverResolver> logger)
    {
        _context = context;
        _userService = userService;
        _logger = logger;
    }

    public async Task<List<string>> ResolveAsync(ApproverRule rule, string companyId, WorkflowInstance? instance = null)
    {
        if (rule.Type != ApproverType.User || string.IsNullOrEmpty(rule.UserId)) return new List<string>();
        var user = await _userService.GetUserByIdAsync(rule.UserId);
        if (user == null) { _logger.LogWarning("审批人用户不存在: {UserId}", rule.UserId); return new List<string>(); }

        var uc = await _context.Set<UserCompany>().FirstOrDefaultAsync(x => x.UserId == rule.UserId && x.CompanyId == companyId && x.Status == "active");
        if (uc != null) return new List<string> { rule.UserId };

        var anyUc = await _context.Set<UserCompany>().IgnoreQueryFilters().FirstOrDefaultAsync(x => x.UserId == rule.UserId && x.Status == "active");
        if (anyUc != null) return new List<string> { rule.UserId };

        return new List<string>();
    }
}

/// <summary>
/// 角色审批人解析器
/// </summary>
public class RoleApproverResolver : IApproverResolver
{
    private readonly DbContext _context;
    private readonly ILogger<RoleApproverResolver> _logger;

    public RoleApproverResolver(DbContext context, ILogger<RoleApproverResolver> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<string>> ResolveAsync(ApproverRule rule, string companyId, WorkflowInstance? instance = null)
    {
        if (rule.Type != ApproverType.Role || string.IsNullOrEmpty(rule.RoleId)) return new List<string>();
        var ucs = await _context.Set<UserCompany>().Where(uc => uc.CompanyId == companyId && uc.Status == "active" && uc.RoleIds != null && uc.RoleIds.Contains(rule.RoleId)).ToListAsync();
        var ids = ucs.Select(uc => uc.UserId).Where(id => !string.IsNullOrEmpty(id)).ToList();
        if (!ids.Any()) _logger.LogWarning("角色下没有找到活跃用户: {RoleId}", rule.RoleId);
        return ids;
    }
}

/// <summary>
/// 表单字段审批人解析器
/// </summary>
public class FormFieldApproverResolver : IApproverResolver
{
    private readonly DbContext _context;
    private readonly ILogger<FormFieldApproverResolver> _logger;

    public FormFieldApproverResolver(DbContext context, ILogger<FormFieldApproverResolver> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<string>> ResolveAsync(ApproverRule rule, string companyId, WorkflowInstance? instance = null)
    {
        if (rule.Type != ApproverType.FormField || string.IsNullOrEmpty(rule.FormFieldKey) || instance == null || string.IsNullOrEmpty(instance.DocumentId)) return new List<string>();
        var doc = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == instance.DocumentId);
        if (doc?.FormData != null && doc.FormData.TryGetValue(rule.FormFieldKey, out var val) && val != null)
        {
            var uid = val.ToString();
            if (!string.IsNullOrEmpty(uid)) return new List<string> { uid };
        }
        return new List<string>();
    }
}

/// <summary>
/// 部门审批人解析器
/// </summary>
public class DepartmentApproverResolver : IApproverResolver
{
    private readonly DbContext _context;
    private readonly ILogger<DepartmentApproverResolver> _logger;

    public DepartmentApproverResolver(DbContext context, ILogger<DepartmentApproverResolver> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<string>> ResolveAsync(ApproverRule rule, string companyId, WorkflowInstance? instance = null)
    {
        if (rule.Type != ApproverType.Department || string.IsNullOrEmpty(rule.DepartmentId)) return new List<string>();
        var org = await _context.Set<OrganizationUnit>().FirstOrDefaultAsync(x => x.Id == rule.DepartmentId);
        if (org == null) return new List<string>();

        var orgIds = new List<string> { org.Id };
        var cur = org;
        for (int i = 0; i < 3 && !string.IsNullOrEmpty(cur?.ParentId); i++)
        {
            cur = await _context.Set<OrganizationUnit>().FirstOrDefaultAsync(x => x.Id == cur.ParentId);
            if (cur != null) orgIds.Add(cur.Id);
        }

        var uos = await _context.Set<UserOrganization>().Where(uo => orgIds.Contains(uo.OrganizationUnitId)).ToListAsync();
        return uos.Select(uo => uo.UserId).Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();
    }
}

/// <summary>
/// 主管审批人解析器
/// </summary>
public class SupervisorApproverResolver : IApproverResolver
{
    private readonly DbContext _context;
    private readonly ILogger<SupervisorApproverResolver> _logger;

    public SupervisorApproverResolver(DbContext context, ILogger<SupervisorApproverResolver> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<string>> ResolveAsync(ApproverRule rule, string companyId, WorkflowInstance? instance = null)
    {
        if (rule.Type != ApproverType.Supervisor || instance == null || string.IsNullOrEmpty(instance.StartedBy)) return new List<string>();
        var uos = await _context.Set<UserOrganization>().Where(uo => uo.UserId == instance.StartedBy).ToListAsync();
        if (!uos.Any()) return new List<string>();

        var primary = uos.FirstOrDefault(uo => uo.IsPrimary) ?? uos.First();
        var curOrg = await _context.Set<OrganizationUnit>().FirstOrDefaultAsync(x => x.Id == primary.OrganizationUnitId);
        if (curOrg == null) return new List<string>();

        var level = rule.SupervisorLevel ?? 1;
        for (int i = 0; i < level && !string.IsNullOrEmpty(curOrg.ParentId); i++)
        {
            var parent = await _context.Set<OrganizationUnit>().FirstOrDefaultAsync(x => x.Id == curOrg.ParentId);
            if (parent == null) break;
            curOrg = parent;
        }

        return !string.IsNullOrEmpty(curOrg.ManagerUserId) ? new List<string> { curOrg.ManagerUserId } : new List<string>();
    }
}