using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models.Workflow;
using Platform.ServiceDefaults.Services;
using System.Linq.Expressions;
using UserCompany = Platform.ApiService.Models.UserCompany;
using UserOrganization = Platform.ApiService.Models.UserOrganization;
using OrganizationUnit = Platform.ApiService.Models.OrganizationUnit;

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

            // 如果用户在当前企业没有关联记录，检查是否有任何活跃的企业关联
            // 如果用户存在于任何企业且状态正常，也允许其作为审批人
            Expression<Func<UserCompany, bool>> anyActiveFilter = uc =>
                uc.UserId == rule.UserId &&
                uc.Status == "active";
            var anyActiveCompanies = await _userCompanyFactory.FindWithoutTenantFilterAsync(anyActiveFilter);
            if (anyActiveCompanies.Any())
            {
                _logger.LogInformation("用户 {UserId} 在企业 {CompanyId} 没有直接关联，但其存在于企业 {OtherCompany}，允许作为审批人",
                    rule.UserId, companyId, anyActiveCompanies.First().CompanyId);
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
        if (rule.Type != ApproverType.FormField || string.IsNullOrEmpty(rule.FormFieldKey) || instance == null || string.IsNullOrEmpty(instance.DocumentId))
            return new List<string>();

        var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
        if (document == null)
        {
            _logger.LogWarning("未找到关联公文: DocumentId={DocumentId}", instance.DocumentId);
            return new List<string>();
        }

        if (document.FormData != null && document.FormData.TryGetValue(rule.FormFieldKey, out var value) && value != null)
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

/// <summary>
/// 部门审批人解析器
/// 根据部门ID解析该部门下的所有成员用户
/// </summary>
public class DepartmentApproverResolver : IApproverResolver
{
    private readonly IDataFactory<UserOrganization> _userOrgFactory;
    private readonly IDataFactory<OrganizationUnit> _orgFactory;
    private readonly ILogger<DepartmentApproverResolver> _logger;

    public DepartmentApproverResolver(
        IDataFactory<UserOrganization> userOrgFactory,
        IDataFactory<OrganizationUnit> orgFactory,
        ILogger<DepartmentApproverResolver> logger)
    {
        _userOrgFactory = userOrgFactory;
        _orgFactory = orgFactory;
        _logger = logger;
    }

    public async Task<List<string>> ResolveAsync(ApproverRule rule, string companyId, WorkflowInstance? instance = null)
    {
        if (rule.Type != ApproverType.Department || string.IsNullOrEmpty(rule.DepartmentId))
            return new List<string>();

        var org = await _orgFactory.GetByIdAsync(rule.DepartmentId);
        if (org == null)
        {
            _logger.LogWarning("部门不存在: DepartmentId={DepartmentId}", rule.DepartmentId);
            return new List<string>();
        }

        var orgIds = await CollectOrgAndDescendantIdsAsync(org);
        Expression<Func<UserOrganization, bool>> filter = uo => orgIds.Contains(uo.OrganizationUnitId);
        var userOrgs = await _userOrgFactory.FindAsync(filter);
        var userIds = userOrgs
            .Select(uo => uo.UserId)
            .Where(id => !string.IsNullOrEmpty(id))
            .Distinct()
            .ToList();

        if (userIds.Count > 0)
        {
            _logger.LogInformation("部门 {DepartmentId}({DepartmentName}) 找到 {Count} 个成员作为审批人",
                rule.DepartmentId, org.Name, userIds.Count);
            return userIds;
        }

        _logger.LogWarning("部门下没有找到成员: DepartmentId={DepartmentId}", rule.DepartmentId);
        return new List<string>();
    }

    private async Task<List<string>> CollectOrgAndDescendantIdsAsync(OrganizationUnit rootOrg)
    {
        var result = new List<string> { rootOrg.Id };
        if (!string.IsNullOrEmpty(rootOrg.ParentId))
        {
            var parent = await _orgFactory.GetByIdAsync(rootOrg.ParentId);
            if (parent != null)
            {
                result.Add(parent.Id);
                if (!string.IsNullOrEmpty(parent.ParentId))
                {
                    var grandParent = await _orgFactory.GetByIdAsync(parent.ParentId);
                    if (grandParent != null)
                    {
                        result.Add(grandParent.Id);
                    }
                }
            }
        }
        return result;
    }
}

/// <summary>
/// 主管审批人解析器
/// 根据主管级别解析发起人的上级主管
/// SupervisorLevel=1 表示直接主管，2 表示上级的上级，以此类推
/// </summary>
public class SupervisorApproverResolver : IApproverResolver
{
    private readonly IDataFactory<UserOrganization> _userOrgFactory;
    private readonly IDataFactory<OrganizationUnit> _orgFactory;
    private readonly ILogger<SupervisorApproverResolver> _logger;

    public SupervisorApproverResolver(
        IDataFactory<UserOrganization> userOrgFactory,
        IDataFactory<OrganizationUnit> orgFactory,
        ILogger<SupervisorApproverResolver> logger)
    {
        _userOrgFactory = userOrgFactory;
        _orgFactory = orgFactory;
        _logger = logger;
    }

    public async Task<List<string>> ResolveAsync(ApproverRule rule, string companyId, WorkflowInstance? instance = null)
    {
        if (rule.Type != ApproverType.Supervisor)
            return new List<string>();

        if (instance == null || string.IsNullOrEmpty(instance.StartedBy))
        {
            _logger.LogWarning("主管审批人解析失败：流程实例或发起人为空");
            return new List<string>();
        }

        var level = rule.SupervisorLevel ?? 1;

        var userOrgs = await _userOrgFactory.FindAsync(uo => uo.UserId == instance.StartedBy);
        if (!userOrgs.Any())
        {
            _logger.LogWarning("用户 {UserId} 不在任何组织中", instance.StartedBy);
            return new List<string>();
        }

        var primaryOrg = userOrgs.FirstOrDefault(uo => uo.IsPrimary) ?? userOrgs.First();
        var currentOrg = await _orgFactory.GetByIdAsync(primaryOrg.OrganizationUnitId);
        if (currentOrg == null)
        {
            _logger.LogWarning("组织 {OrgId} 不存在", primaryOrg.OrganizationUnitId);
            return new List<string>();
        }

        for (int i = 0; i < level; i++)
        {
            if (string.IsNullOrEmpty(currentOrg.ParentId))
                break;

            var parentOrg = await _orgFactory.GetByIdAsync(currentOrg.ParentId);
            if (parentOrg == null)
                break;

            currentOrg = parentOrg;
        }

        if (!string.IsNullOrEmpty(currentOrg.ManagerUserId))
        {
            _logger.LogInformation("用户 {UserId} 的第 {Level} 级主管: {ManagerId}",
                instance.StartedBy, level, currentOrg.ManagerUserId);
            return new List<string> { currentOrg.ManagerUserId };
        }

        _logger.LogWarning("组织 {OrgId}({OrgName}) 未设置主管",
            currentOrg.Id, currentOrg.Name);
        return new List<string>();
    }
}
