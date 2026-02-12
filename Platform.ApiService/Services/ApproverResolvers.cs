using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System.Linq.Expressions;
using UserCompany = Platform.ApiService.Models.UserCompany;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户审批人解析器
/// </summary>
public class UserApproverResolver : IApproverResolver
{
    private readonly IUserService _userService;
    private readonly IDataFactory<UserCompany> _userCompanyFactory;
    private readonly ILogger<UserApproverResolver> _logger;

    /// <summary>
    /// 初始化用户审批人解析器
    /// </summary>
    /// <param name="userService">用户服务</param>
    /// <param name="userCompanyFactory">用户企业关联数据工厂</param>
    /// <param name="logger">日志</param>
    public UserApproverResolver(
        IUserService userService,
        IDataFactory<UserCompany> userCompanyFactory,
        ILogger<UserApproverResolver> logger)
    {
        _userService = userService;
        _userCompanyFactory = userCompanyFactory;
        _logger = logger;
    }

    /// <summary>
    /// 解析审批人
    /// </summary>
    /// <param name="rule">审批规则</param>
    /// <param name="companyId">企业ID</param>
    /// <param name="instance">流程实例（可选）</param>
    /// <returns>审批人用户ID列表</returns>
    public async Task<List<string>> ResolveAsync(ApproverRule rule, string companyId, WorkflowInstance? instance = null)
    {
        if (rule.Type != ApproverType.User || string.IsNullOrEmpty(rule.UserId))
            return new List<string>();

        var user = await _userService.GetUserByIdAsync(rule.UserId);
        if (user == null)
        {
            _logger.LogWarning("审批人用户不存在: UserId={UserId}", rule.UserId);
            return new List<string>();
        }

        Expression<Func<UserCompany, bool>> filter = uc =>
            uc.UserId == rule.UserId &&
            uc.CompanyId == companyId &&
            uc.Status == "active";

        var userCompanies = await _userCompanyFactory.FindAsync(filter);
        if (userCompanies.Any())
        {
            return new List<string> { rule.UserId };
        }

        _logger.LogWarning("用户不属于当前企业或状态非活跃: UserId={UserId}, CompanyId={CompanyId}",
            rule.UserId, companyId);
        return new List<string>();
    }
}

/// <summary>
/// 角色审批人解析器
/// </summary>
public class RoleApproverResolver : IApproverResolver
{
    private readonly IDataFactory<UserCompany> _userCompanyFactory;
    private readonly ILogger<RoleApproverResolver> _logger;

    /// <summary>
    /// 初始化角色审批人解析器
    /// </summary>
    /// <param name="userCompanyFactory">用户企业关联数据工厂</param>
    /// <param name="logger">日志</param>
    public RoleApproverResolver(
        IDataFactory<UserCompany> userCompanyFactory,
        ILogger<RoleApproverResolver> logger)
    {
        _userCompanyFactory = userCompanyFactory;
        _logger = logger;
    }

    /// <summary>
    /// 解析审批人
    /// </summary>
    /// <param name="rule">审批规则</param>
    /// <param name="companyId">企业ID</param>
    /// <param name="instance">流程实例（可选）</param>
    /// <returns>审批人用户ID列表</returns>
    public async Task<List<string>> ResolveAsync(ApproverRule rule, string companyId, WorkflowInstance? instance = null)
    {
        if (rule.Type != ApproverType.Role || string.IsNullOrEmpty(rule.RoleId))
            return new List<string>();

        Expression<Func<UserCompany, bool>> filter = uc =>
            uc.CompanyId == companyId &&
            uc.Status == "active" &&
            uc.RoleIds != null &&
            uc.RoleIds.Contains(rule.RoleId);

        var userCompanies = await _userCompanyFactory.FindAsync(filter);
        var roleUserIds = userCompanies
            .Select(uc => uc.UserId)
            .Where(id => !string.IsNullOrEmpty(id))
            .ToList();

        if (roleUserIds.Any())
        {
            return roleUserIds;
        }

        _logger.LogWarning("角色下没有找到活跃用户: RoleId={RoleId}, CompanyId={CompanyId}",
            rule.RoleId, companyId);
        return new List<string>();
    }
}

/// <summary>
/// 表单字段审批人解析器
/// </summary>
public class FormFieldApproverResolver : IApproverResolver
{
    private readonly IDataFactory<Document> _documentFactory;
    private readonly ILogger<FormFieldApproverResolver> _logger;

    /// <summary>
    /// 初始化表单字段审批人解析器
    /// </summary>
    /// <param name="documentFactory">公文数据工厂</param>
    /// <param name="logger">日志</param>
    public FormFieldApproverResolver(
        IDataFactory<Document> documentFactory,
        ILogger<FormFieldApproverResolver> logger)
    {
        _documentFactory = documentFactory;
        _logger = logger;
    }

    /// <summary>
    /// 解析审批人
    /// </summary>
    /// <param name="rule">审批规则</param>
    /// <param name="companyId">企业ID</param>
    /// <param name="instance">流程实例（可选）</param>
    /// <returns>审批人用户ID列表</returns>
    public async Task<List<string>> ResolveAsync(ApproverRule rule, string companyId, WorkflowInstance? instance = null)
    {
        if (rule.Type != ApproverType.FormField || string.IsNullOrEmpty(rule.FormFieldKey) || instance == null)
            return new List<string>();

        var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
        if (document == null)
        {
            _logger.LogWarning("未找到关联公文: DocumentId={DocumentId}", instance.DocumentId);
            return new List<string>();
        }

        if (document.FormData.TryGetValue(rule.FormFieldKey, out var value) && value != null)
        {
            var userId = value.ToString();
            if (!string.IsNullOrEmpty(userId))
            {
                return new List<string> { userId };
            }
        }

        _logger.LogWarning("表单字段未找到或值为空: FormFieldKey={FormFieldKey}", rule.FormFieldKey);
        return new List<string>();
    }
}
