using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户组织架构服务实现
/// </summary>
public class UserOrganizationService : IUserOrganizationService
{
    private readonly DbContext _context;

    public UserOrganizationService(DbContext context)
    {
        _context = context;
    }

    /// <inheritdoc/>
    public async Task<Dictionary<string, List<UserOrganizationInfo>>> GetUserOrganizationMapAsync(List<string> userIds)
    {
        var result = new Dictionary<string, List<UserOrganizationInfo>>();
        if (userIds == null || !userIds.Any()) return result;

        var mappings = await _context.Set<UserOrganization>()
            .Where(m => userIds.Contains(m.UserId))
            .ToListAsync();
        
        if (mappings == null || !mappings.Any()) return result;

        var organizationIds = mappings.Select(m => m.OrganizationUnitId).Distinct().ToList();
        if (!organizationIds.Any()) return result;

        var orgUnits = await _context.Set<OrganizationUnit>()
            .Where(o => organizationIds.Contains(o.Id))
            .ToListAsync();
        
        var orgMap = orgUnits
            .Where(o => o.Id != null)
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
            if (mapping.OrganizationUnitId == null) continue;

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