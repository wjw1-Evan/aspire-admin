using System.Collections.Generic;

namespace Platform.ApiService.Models;

/// <summary>
/// 切换企业请求
/// </summary>
public class SwitchCompanyRequest
{
    /// <summary>
    /// 目标企业ID
    /// </summary>
    public string TargetCompanyId { get; set; } = string.Empty;
}

/// <summary>
/// 更新成员角色请求
/// </summary>
public class UpdateMemberRolesRequest
{
    /// <summary>
    /// 角色ID列表
    /// </summary>
    public List<string> RoleIds { get; set; } = new();
}

/// <summary>
/// 设置管理员请求
/// </summary>
public class SetAdminRequest
{
    /// <summary>
    /// 是否设置为管理员
    /// </summary>
    public bool IsAdmin { get; set; }
}
