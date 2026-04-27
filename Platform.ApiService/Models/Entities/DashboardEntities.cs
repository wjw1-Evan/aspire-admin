using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 数据看板实体
/// </summary>
public class Dashboard : MultiTenantEntity
{
    /// <summary>看板名称</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>描述</summary>
    public string? Description { get; set; }

    /// <summary>布局类型：grid-网格布局/waterfall-瀑布流/free-自由布局</summary>
    public string LayoutType { get; set; } = "grid";

    /// <summary>主题：light-浅色/dark-深色/custom-自定义</summary>
    public string Theme { get; set; } = "light";

    /// <summary>分享令牌</summary>
    public string? ShareToken { get; set; }

    /// <summary>是否公开（true: 企业内可见, false: 仅自己可见）</summary>
    public bool IsPublic { get; set; } = false;

    /// <summary>创建者用户ID</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>卡片列表</summary>
    public List<DashboardCard> Cards { get; set; } = new();
}

/// <summary>
/// 数据看板卡片实体
/// </summary>
public class DashboardCard : BaseEntity
{
    /// <summary>所属看板ID</summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string DashboardId { get; set; } = string.Empty;

    /// <summary>卡片类型：statistic-统计/chart-图表/table-表格/progress-进度/text-文本/image-图片</summary>
    public string CardType { get; set; } = string.Empty;

    /// <summary>卡片标题</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>X坐标（网格单位）</summary>
    public int PositionX { get; set; }

    /// <summary>Y坐标（网格单位）</summary>
    public int PositionY { get; set; }

    /// <summary>宽度（网格单位）</summary>
    public int Width { get; set; } = 4;

    /// <summary>高度（网格单位）</summary>
    public int Height { get; set; } = 3;

    /// <summary>数据源配置（JSON）</summary>
    public string DataSource { get; set; } = string.Empty;

    /// <summary>样式配置（JSON）</summary>
    public string StyleConfig { get; set; } = string.Empty;

    /// <summary>刷新间隔（秒）</summary>
    public int RefreshInterval { get; set; } = 300;

    /// <summary>最后刷新时间</summary>
    public DateTime? LastRefreshAt { get; set; }
}

/// <summary>
/// 创建看板请求
/// </summary>
public class CreateDashboardRequest
{
    /// <summary>看板名称</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>描述</summary>
    public string? Description { get; set; }

    /// <summary>布局类型</summary>
    public string LayoutType { get; set; } = "grid";

    /// <summary>主题</summary>
    public string Theme { get; set; } = "light";

    /// <summary>是否公开</summary>
    public bool IsPublic { get; set; } = false;
}

/// <summary>
/// 更新看板请求
/// </summary>
public class UpdateDashboardRequest
{
    /// <summary>看板名称</summary>
    public string? Name { get; set; }

    /// <summary>描述</summary>
    public string? Description { get; set; }

    /// <summary>布局类型</summary>
    public string? LayoutType { get; set; }

    /// <summary>主题</summary>
    public string? Theme { get; set; }

    /// <summary>是否公开</summary>
    public bool? IsPublic { get; set; }
}

/// <summary>
/// 创建卡片请求
/// </summary>
public class CreateDashboardCardRequest
{
    /// <summary>卡片类型</summary>
    public string CardType { get; set; } = string.Empty;

    /// <summary>卡片标题</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>X坐标</summary>
    public int PositionX { get; set; }

    /// <summary>Y坐标</summary>
    public int PositionY { get; set; }

    /// <summary>宽度</summary>
    public int Width { get; set; } = 4;

    /// <summary>高度</summary>
    public int Height { get; set; } = 3;

    /// <summary>数据源配置</summary>
    public string DataSource { get; set; } = string.Empty;

    /// <summary>样式配置</summary>
    public string StyleConfig { get; set; } = string.Empty;

    /// <summary>刷新间隔（秒）</summary>
    public int RefreshInterval { get; set; } = 300;
}

/// <summary>
/// 更新卡片请求
/// </summary>
public class UpdateDashboardCardRequest
{
    /// <summary>卡片标题</summary>
    public string? Title { get; set; }

    /// <summary>X坐标</summary>
    public int? PositionX { get; set; }

    /// <summary>Y坐标</summary>
    public int? PositionY { get; set; }

    /// <summary>宽度</summary>
    public int? Width { get; set; }

    /// <summary>高度</summary>
    public int? Height { get; set; }

    /// <summary>数据源配置</summary>
    public string? DataSource { get; set; }

    /// <summary>样式配置</summary>
    public string? StyleConfig { get; set; }

    /// <summary>刷新间隔（秒）</summary>
    public int? RefreshInterval { get; set; }
}

/// <summary>
/// 批量调整卡片位置请求
/// </summary>
public class ReorderCardsRequest
{
    /// <summary>卡片位置列表</summary>
    public List<CardPosition> Cards { get; set; } = new();
}

/// <summary>
/// 卡片位置
/// </summary>
public class CardPosition
{
    /// <summary>卡片ID</summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>X坐标</summary>
    public int PositionX { get; set; }

    /// <summary>Y坐标</summary>
    public int PositionY { get; set; }

    /// <summary>宽度</summary>
    public int Width { get; set; }

    /// <summary>高度</summary>
    public int Height { get; set; }
}

/// <summary>
/// 看板DTO
/// </summary>
public class DashboardDto
{
    /// <summary>看板ID</summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>看板名称</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>描述</summary>
    public string? Description { get; set; }

    /// <summary>布局类型</summary>
    public string LayoutType { get; set; } = string.Empty;

    /// <summary>主题</summary>
    public string Theme { get; set; } = string.Empty;

    /// <summary>是否公开</summary>
    public bool IsPublic { get; set; }

    /// <summary>创建者用户ID</summary>
    public string UserId { get; set; } = string.Empty;

    /// <summary>卡片列表</summary>
    public List<DashboardCardDto> Cards { get; set; } = new();

    /// <summary>创建时间</summary>
    public DateTime? CreatedAt { get; set; }

    /// <summary>更新时间</summary>
    public DateTime? UpdatedAt { get; set; }
}

/// <summary>
/// 卡片DTO
/// </summary>
public class DashboardCardDto
{
    /// <summary>卡片ID</summary>
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    /// <summary>卡片类型</summary>
    public string CardType { get; set; } = string.Empty;

    /// <summary>卡片标题</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>X坐标</summary>
    public int PositionX { get; set; }

    /// <summary>Y坐标</summary>
    public int PositionY { get; set; }

    /// <summary>宽度</summary>
    public int Width { get; set; }

    /// <summary>高度</summary>
    public int Height { get; set; }

    /// <summary>数据源配置</summary>
    public string DataSource { get; set; } = string.Empty;

    /// <summary>样式配置</summary>
    public string StyleConfig { get; set; } = string.Empty;

    /// <summary>刷新间隔（秒）</summary>
    public int RefreshInterval { get; set; }

    /// <summary>最后刷新时间</summary>
    public DateTime? LastRefreshAt { get; set; }
}

/// <summary>
/// 数据源配置
/// </summary>
public class DataSourceConfig
{
    /// <summary>模块：task/project/iot/workflow/park/document/knowledge/storage</summary>
    public string Module { get; set; } = string.Empty;

    /// <summary>数据类型：count-统计/trend-趋势/list-列表/distribution-分布</summary>
    public string DataType { get; set; } = string.Empty;

    /// <summary>筛选条件</summary>
    public Dictionary<string, object> Filters { get; set; } = new();

    /// <summary>聚合方式：sum/avg/count/max/min</summary>
    public string? Aggregation { get; set; }

    /// <summary>分组字段</summary>
    public string? GroupBy { get; set; }

    /// <summary>时间范围：today/week/month/custom</summary>
    public string TimeRange { get; set; } = "today";

    /// <summary>自定义开始时间</summary>
    public DateTime? StartTime { get; set; }

    /// <summary>自定义结束时间</summary>
    public DateTime? EndTime { get; set; }
}

/// <summary>
/// 卡片数据响应
/// </summary>
public class CardDataResponse
{
    /// <summary>卡片ID</summary>
    public string CardId { get; set; } = string.Empty;

    /// <summary>数据</summary>
    public object Data { get; set; } = new();

    /// <summary>刷新时间</summary>
    public DateTime RefreshedAt { get; set; }
}

/// <summary>
/// 看板统计信息
/// </summary>
public class DashboardStatistics
{
    /// <summary>总看板数</summary>
    public int TotalDashboards { get; set; }

    /// <summary>公开看板数</summary>
    public int PublicDashboards { get; set; }

    /// <summary>私有看板数</summary>
    public int PrivateDashboards { get; set; }

    /// <summary>总卡片数</summary>
    public int TotalCards { get; set; }

    /// <summary>最近创建看板数（7天内）</summary>
    public int RecentCreatedCount { get; set; }
}
