using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户组织架构服务实现
/// </summary>
/// <param name="organizationFactory">组织架构数据库工厂</param>
/// <param name="userOrgFactory">用户组织关联数据库工厂</param>
public class UserOrganizationService(
    IDataFactory<OrganizationUnit> organizationFactory,
    IDataFactory<UserOrganization> userOrgFactory) : IUserOrganizationService
{
    private readonly IDataFactory<OrganizationUnit> _organizationFactory = organizationFactory;
    private readonly IDataFactory<UserOrganization> _userOrgFactory = userOrgFactory;

    /// <inheritdoc/>
    public async Task<Dictionary<string, List<UserOrganizationInfo>>> GetUserOrganizationMapAsync(List<string> userIds, string companyId)
    {
        var result = new Dictionary<string, List<UserOrganizationInfo>>();
        if (!userIds.Any()) return result;

        var mappings = await _userOrgFactory.FindAsync(
            m => userIds.Contains(m.UserId) && m.CompanyId == companyId);
        if (mappings == null || !mappings.Any()) return result;

        var organizationIds = mappings.Select(m => m.OrganizationUnitId).Distinct().ToList();
        if (!organizationIds.Any()) return result;

        var orgUnits = await _organizationFactory.FindAsync(
            o => organizationIds.Contains(o.Id) && o.CompanyId == companyId);
        
        var orgMap = orgUnits
            .Where(o => !string.IsNullOrEmpty(o.Id))
            .ToDictionary(o => o.Id, o => o);

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
