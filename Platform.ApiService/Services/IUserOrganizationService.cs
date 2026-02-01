using Platform.ApiService.Models;
using Platform.ApiService.Models.Response;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 用户组织架构服务接口
/// </summary>
public interface IUserOrganizationService
{
    /// <summary>
    /// 批量获取用户的组织信息（含层级路径）
    /// </summary>
    Task<Dictionary<string, List<UserOrganizationInfo>>> GetUserOrganizationMapAsync(List<string> userIds, string companyId);
}
