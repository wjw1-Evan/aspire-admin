using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using UserCompany = Platform.ApiService.Models.UserCompany;

namespace Platform.ApiService.Services;

/// <summary>
/// 基于指定用户的审批人解析器
/// </summary>
public class UserApproverResolver : IApproverResolver
{
    private readonly IUserService _userService;
    private readonly IDatabaseOperationFactory<UserCompany> _userCompanyFactory;
    private readonly ILogger<UserApproverResolver> _logger;

    /// <summary>
    /// 初始化用户审批人解析器
    /// </summary>
    /// <param name="userService">用户服务</param>
    /// <param name="userCompanyFactory">用户企业关系数据工厂</param>
    /// <param name="logger">日志记录器</param>
    public UserApproverResolver(
        IUserService userService,
        IDatabaseOperationFactory<UserCompany> userCompanyFactory,
        ILogger<UserApproverResolver> logger)
    {
        _userService = userService;
        _userCompanyFactory = userCompanyFactory;
        _logger = logger;
    }

    /// <summary>
    /// 按用户规则解析审批人
    /// </summary>
    /// <param name="rule">审批规则（类型为 User）</param>
    /// <param name="companyId">企业（租户）ID</param>
    /// <returns>匹配到的用户ID列表</returns>
    public async Task<List<string>> ResolveAsync(ApproverRule rule, string companyId)
    {
        if (rule.Type != ApproverType.User || string.IsNullOrEmpty(rule.UserId))
            return new List<string>();

        var user = await _userService.GetUserByIdAsync(rule.UserId);
        if (user == null)
        {
            _logger.LogWarning("审批人用户不存在: UserId={UserId}", rule.UserId);
            return new List<string>();
        }

        var filter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.UserId, rule.UserId)
            .Equal(uc => uc.CompanyId, companyId)
            .Equal(uc => uc.Status, "active")
            .Build();

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
/// 基于角色的审批人解析器
/// </summary>
public class RoleApproverResolver : IApproverResolver
{
    private readonly IDatabaseOperationFactory<UserCompany> _userCompanyFactory;
    private readonly ILogger<RoleApproverResolver> _logger;

    /// <summary>
    /// 初始化角色审批人解析器
    /// </summary>
    /// <param name="userCompanyFactory">用户企业关系数据工厂</param>
    /// <param name="logger">日志记录器</param>
    public RoleApproverResolver(
        IDatabaseOperationFactory<UserCompany> userCompanyFactory,
        ILogger<RoleApproverResolver> logger)
    {
        _userCompanyFactory = userCompanyFactory;
        _logger = logger;
    }

    /// <summary>
    /// 按角色规则解析审批人
    /// </summary>
    /// <param name="rule">审批规则（类型为 Role）</param>
    /// <param name="companyId">企业（租户）ID</param>
    /// <returns>匹配到的用户ID列表</returns>
    public async Task<List<string>> ResolveAsync(ApproverRule rule, string companyId)
    {
        if (rule.Type != ApproverType.Role || string.IsNullOrEmpty(rule.RoleId))
            return new List<string>();

        var filter = _userCompanyFactory.CreateFilterBuilder()
            .Equal(uc => uc.CompanyId, companyId)
            .Equal(uc => uc.Status, "active")
            .Build();

        var additionalFilter = Builders<UserCompany>.Filter.AnyEq(uc => uc.RoleIds, rule.RoleId);
        var combinedFilter = Builders<UserCompany>.Filter.And(filter, additionalFilter);

        var userCompanies = await _userCompanyFactory.FindAsync(combinedFilter);
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
