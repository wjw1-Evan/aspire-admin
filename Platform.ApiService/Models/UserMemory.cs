using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// AI 助手专用的用户长效记忆实体
/// 用于保存用户的偏好、重点关注事项等，形成跨会话的专属记忆上下文。
/// </summary>
public class UserMemory : MultiTenantEntity
{
    /// <summary>
    /// 所属用户的 ID
    /// </summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 具体的记忆内容/事实描述
    /// </summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// 记忆分类标签（例如：Preference, Project, Summary, Note）
    /// 默认为通用笔记
    /// </summary>
    public string Category { get; set; } = "Note";

    /// <summary>
    /// 权重/重要程度（1-10），用于上下文长度限制时择优选取
    /// </summary>
    public int Importance { get; set; } = 5;
}
