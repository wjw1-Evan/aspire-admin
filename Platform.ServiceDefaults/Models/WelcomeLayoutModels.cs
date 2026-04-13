using MongoDB.Bson.Serialization.Attributes;

namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 欢迎页面布局配置 - 用户自定义卡片位置
/// </summary>
public class WelcomeLayout : MultiTenantEntity
{
    /// <summary>
    /// 用户ID
    /// </summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>
    /// 布局配置 - JSON 格式存储
    /// </summary>
    public string LayoutConfig { get; set; } = string.Empty;

    /// <summary>
    /// 是否为默认布局
    /// </summary>
    public bool IsDefault { get; set; } = false;
}

/// <summary>
/// 卡片布局配置项
/// </summary>
public class CardLayoutConfig
{
    /// <summary>
    /// 卡片ID
    /// </summary>
    public string CardId { get; set; } = string.Empty;

    /// <summary>
    /// 排序顺序
    /// </summary>
    public int Order { get; set; }

    /// <summary>
    /// 所在列 (left/right)
    /// </summary>
    public string Column { get; set; } = "left";

    /// <summary>
    /// 是否可见
    /// </summary>
    public bool Visible { get; set; } = true;
}

/// <summary>
/// 保存欢迎页面布局请求
/// </summary>
public class SaveWelcomeLayoutRequest
{
    /// <summary>
    /// 布局配置列表
    /// </summary>
    public List<CardLayoutConfig> Layouts { get; set; } = new();

    /// <summary>
    /// 更新时间
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// 获取欢迎页面布局响应
/// </summary>
public class WelcomeLayoutResponse
{
    /// <summary>
    /// 布局配置列表
    /// </summary>
    public List<CardLayoutConfig> Layouts { get; set; } = new();

    /// <summary>
    /// 最后更新时间
    /// </summary>
    public DateTime UpdatedAt { get; set; }
}
