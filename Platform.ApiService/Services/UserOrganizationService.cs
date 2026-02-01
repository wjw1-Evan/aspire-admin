using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Response;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户组织架构服务实现
/// </summary>
/// <param name="organizationFactory">组织架构数据库工厂</param>
/// <param name="userOrgFactory">用户组织关联数据库工厂</param>
public class UserOrganizationService(
    IDatabaseOperationFactory<OrganizationUnit> organizationFactory,
    IDatabaseOperationFactory<UserOrganization> userOrgFactory) : IUserOrganizationService
{
    private readonly IDatabaseOperationFactory<OrganizationUnit> _organizationFactory = organizationFactory;
    private readonly IDatabaseOperationFactory<UserOrganization> _userOrgFactory = userOrgFactory;

    /// <inheritdoc/>
    public async Task<Dictionary<string, List<UserOrganizationInfo>>> GetUserOrganizationMapAsync(List<string> userIds, string companyId)
    {
        var result = new Dictionary<string, List<UserOrganizationInfo>>();
        if (!userIds.Any()) return result;

        var mappingFilter = _userOrgFactory.CreateFilterBuilder()
            .In(m => m.UserId, userIds)
            .Equal(m => m.CompanyId, companyId)
            .Build();
        var mappings = await _userOrgFactory.FindAsync(mappingFilter);
        if (mappings == null || !mappings.Any()) return result;

        var organizationIds = mappings.Select(m => m.OrganizationUnitId).Distinct().ToList();
        if (!organizationIds.Any()) return result;

        var orgFilter = _organizationFactory.CreateFilterBuilder()
            .In(o => o.Id, organizationIds)
            .Equal(o => o.CompanyId, companyId)
            .Build();

        // 优化：使用字段投影，只返回需要的字段
        var orgProjection = _organizationFactory.CreateProjectionBuilder()
            .Include(o => o.Id)
            .Include(o => o.Name)
            .Include(o => o.ParentId)
            .Build();

        var orgUnits = await _organizationFactory.FindAsync(orgFilter, projection: orgProjection);
        var orgMap = orgUnits
            .Where(o => !string.IsNullOrEmpty(o.Id))
            .ToDictionary(o => o.Id!, o => o);

        string BuildFullPath(string? orgId)
        {
            if (string.IsNullOrEmpty(orgId) || !orgMap.TryGetValue(orgId, out _))
            {
                return string.Empty;
            }

            var segments = new List<string>();
            var currentId = orgId;
            var guard = 0;

            // 限制层级深度，防止死循环
            while (!string.IsNullOrEmpty(currentId) && guard < 64 && orgMap.TryGetValue(currentId, out var node))
            {
                segments.Add(node.Name);
                currentId = node.ParentId;
                guard++;
            }

            segments.Reverse();
            return string.Join(" / ", segments);
        }

        foreach (var mapping in mappings)
        {
            var info = new UserOrganizationInfo
            {
                OrganizationUnitId = mapping.OrganizationUnitId,
                OrganizationUnitName = orgMap.TryGetValue(mapping.OrganizationUnitId, out var unit) ? unit.Name : null,
                FullPath = BuildFullPath(mapping.OrganizationUnitId),
                IsPrimary = mapping.IsPrimary
            };

            if (!result.TryGetValue(mapping.UserId, out var list))
            {
                list = new List<UserOrganizationInfo>();
                result[mapping.UserId] = list;
            }
            list.Add(info);
        }

        return result;
    }
}
