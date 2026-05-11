using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

public class DashboardMcpToolHandler : McpToolHandlerBase
{
    private readonly DbContext _context;
    private readonly IDashboardService _dashboardService;
    private readonly ILogger<DashboardMcpToolHandler> _logger;

    public DashboardMcpToolHandler(
        DbContext context,
        IDashboardService dashboardService,
        ILogger<DashboardMcpToolHandler> logger)
    {
        _context = context;
        _dashboardService = dashboardService;
        _logger = logger;

        #region 看板工具

        RegisterTool("get_dashboards", "获取数据看板列表，支持分页和关键词搜索。关键词：看板,数据看板,仪表盘,数据面板",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object>
                {
                    ["keyword"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" }
                },
                PaginationSchema()
            )),
            HandleGetDashboardsAsync);

        RegisterTool("get_dashboard_detail", "获取看板的详细信息，包含所有卡片。支持 ID 或名称查询。关键词：看板详情,查看看板,仪表盘详情",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "看板ID" },
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "看板名称" }
            }),
            HandleGetDashboardDetailAsync);

        RegisterTool("create_dashboard", "创建新的数据看板。关键词：新建看板,创建看板,新增仪表盘",
            ObjectSchema(new Dictionary<string, object>
            {
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "看板名称" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "看板描述" },
                ["layoutType"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "布局类型: grid(网格)/waterfall(瀑布流)/free(自由)" },
                ["theme"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "主题: light(浅色)/dark(深色)/custom(自定义)" },
                ["isPublic"] = new Dictionary<string, object> { ["type"] = "boolean", ["description"] = "是否对企业内公开" }
            }, ["name"]),
            HandleCreateDashboardAsync);

        RegisterTool("update_dashboard", "更新看板信息。关键词：修改看板,编辑看板,重命名看板",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "看板ID" },
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "看板名称" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "看板描述" },
                ["layoutType"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "布局类型" },
                ["theme"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "主题" },
                ["isPublic"] = new Dictionary<string, object> { ["type"] = "boolean", ["description"] = "是否公开" }
            }, ["id"]),
            HandleUpdateDashboardAsync);

        RegisterTool("delete_dashboard", "删除指定的数据看板。关键词：删除看板,移除看板",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "看板ID" } }, ["id"]),
            HandleDeleteDashboardAsync);

        RegisterTool("copy_dashboard", "复制指定的数据看板，包含其所有卡片。关键词：复制看板,克隆看板",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "看板ID" } }, ["id"]),
            HandleCopyDashboardAsync);

        RegisterTool("get_dashboard_statistics", "获取数据看板的统计概览。关键词：看板统计,仪表盘统计,数据看板概览",
            HandleGetDashboardStatisticsAsync);

        #endregion

        #region 卡片工具

        RegisterTool("add_card", "在看板中添加新卡片。关键词：添加卡片,新增卡片,添加图表",
            ObjectSchema(new Dictionary<string, object>
            {
                ["dashboardId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "所属看板ID" },
                ["cardType"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "卡片类型: statistic统计/chart图表/table表格/progress进度/text文本/image图片" },
                ["title"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "卡片标题" },
                ["dataSource"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "数据源配置(JSON格式)" },
                ["width"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "宽度(网格单位)" },
                ["height"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "高度(网格单位)" }
            }, ["dashboardId", "cardType", "title"]),
            HandleAddCardAsync);

        RegisterTool("update_card", "更新看板中的卡片。关键词：修改卡片,编辑卡片,更新图表",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "卡片ID" },
                ["title"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "卡片标题" },
                ["dataSource"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "数据源配置(JSON)" },
                ["width"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "宽度" },
                ["height"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "高度" },
                ["refreshInterval"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "刷新间隔(秒)" }
            }, ["id"]),
            HandleUpdateCardAsync);

        RegisterTool("delete_card", "删除看板中的指定卡片。关键词：删除卡片,移除图表",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "卡片ID" } }, ["id"]),
            HandleDeleteCardAsync);

        RegisterTool("get_card_data", "获取卡片的数据内容。关键词：卡片数据,查看数据",
            ObjectSchema(new Dictionary<string, object> { ["cardId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "卡片ID" } }, ["cardId"]),
            HandleGetCardDataAsync);

        RegisterTool("get_data_sources", "获取可用的数据源模块列表。关键词：数据源,可用数据源,数据模块",
            async (args, uid) => await _dashboardService.GetAvailableDataSourcesAsync());

        #endregion
    }

    private async Task<object?> HandleGetDashboardsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var currentUser = await _context.Set<AppUser>().FirstOrDefaultAsync(x => x.Id == currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
            return new { error = "无法确定当前企业" };

        var (Current, PageSize) = ParsePaginationArgs(arguments, defaultPageSize: 20, maxPageSize: 100);
        var result = await _dashboardService.GetDashboardsAsync(
            new Platform.ServiceDefaults.Models.ProTableRequest
            {
                Current = Current,
                PageSize = PageSize,
                Search = arguments.GetValueOrDefault("keyword")?.ToString()
            },
            currentUserId, currentUser.CurrentCompanyId);

        var items = await result.Queryable.ToListAsync();
        return new
        {
            items = items.Select(d => new { d.Id, d.Name, d.Description, d.LayoutType, d.Theme, d.IsPublic, d.CreatedAt, d.UpdatedAt }).ToList(),
            rowCount = result.RowCount,
            currentPage = result.CurrentPage,
            pageSize = result.PageSize,
            pageCount = result.PageCount
        };
    }

    private async Task<object?> HandleGetDashboardDetailAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var id = arguments.GetValueOrDefault("id")?.ToString();
        var name = arguments.GetValueOrDefault("name")?.ToString();

        if (string.IsNullOrEmpty(id))
        {
            if (string.IsNullOrEmpty(name)) return new { error = "请提供看板ID或名称" };
            var currentUser = await _context.Set<AppUser>().FirstOrDefaultAsync(x => x.Id == currentUserId);
            if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
                return new { error = "无法确定当前企业" };

            var searchResult = await _dashboardService.GetDashboardsAsync(
                new Platform.ServiceDefaults.Models.ProTableRequest { Search = name, Current = 1, PageSize = 1 },
                currentUserId, currentUser.CurrentCompanyId);
            var searchItems = await searchResult.Queryable.ToListAsync();
            if (searchItems.Any()) id = searchItems.First().Id;
            else return new { error = "未找到该看板" };
        }

        if (string.IsNullOrEmpty(id)) return new { error = "看板不存在" };
        var dashboard = await _dashboardService.GetDashboardByIdAsync(id, currentUserId);
        if (dashboard == null) return new { error = "看板不存在" };

        return new
        {
            dashboard.Id, dashboard.Name, dashboard.Description, dashboard.LayoutType,
            dashboard.Theme, dashboard.IsPublic, dashboard.CreatedAt, dashboard.UpdatedAt,
            cards = dashboard.Cards?.Select(c => new
            {
                c.Id, c.CardType, c.Title, c.PositionX, c.PositionY,
                c.Width, c.Height, c.RefreshInterval, c.LastRefreshAt
            }).ToList()
        };
    }

    private async Task<object?> HandleCreateDashboardAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var name = arguments.GetValueOrDefault("name")?.ToString();
        if (string.IsNullOrEmpty(name)) return new { error = "看板名称必填" };

        var currentUser = await _context.Set<AppUser>().FirstOrDefaultAsync(x => x.Id == currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
            return new { error = "无法确定当前企业" };

        var request = new CreateDashboardRequest
        {
            Name = name,
            Description = arguments.GetValueOrDefault("description")?.ToString(),
            LayoutType = arguments.GetValueOrDefault("layoutType")?.ToString() ?? "grid",
            Theme = arguments.GetValueOrDefault("theme")?.ToString() ?? "light",
            IsPublic = arguments.TryGetValue("isPublic", out var pub) && bool.TryParse(pub?.ToString(), out var isPub) && isPub
        };

        var dashboard = await _dashboardService.CreateDashboardAsync(request, currentUserId, currentUser.CurrentCompanyId);
        return new { dashboard.Id, dashboard.Name, dashboard.Description, dashboard.LayoutType, dashboard.Theme, dashboard.IsPublic, message = "看板创建成功" };
    }

    private async Task<object?> HandleUpdateDashboardAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var id = arguments.GetValueOrDefault("id")?.ToString();
        if (string.IsNullOrEmpty(id)) return new { error = "看板ID必填" };

        var request = new UpdateDashboardRequest
        {
            Name = arguments.GetValueOrDefault("name")?.ToString(),
            Description = arguments.GetValueOrDefault("description")?.ToString(),
            LayoutType = arguments.GetValueOrDefault("layoutType")?.ToString(),
            Theme = arguments.GetValueOrDefault("theme")?.ToString(),
            IsPublic = arguments.TryGetValue("isPublic", out var pub) && bool.TryParse(pub?.ToString(), out var isPub) ? isPub : null
        };

        var dashboard = await _dashboardService.UpdateDashboardAsync(id, request, currentUserId);
        if (dashboard == null) return new { error = "看板不存在或无权修改" };

        return new { dashboard.Id, dashboard.Name, message = "看板更新成功" };
    }

    private async Task<object?> HandleDeleteDashboardAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var id = arguments.GetValueOrDefault("id")?.ToString();
        if (string.IsNullOrEmpty(id)) return new { error = "看板ID必填" };

        var result = await _dashboardService.DeleteDashboardAsync(id, currentUserId);
        if (!result) return new { error = "看板不存在或无权删除" };

        return new { message = "看板删除成功" };
    }

    private async Task<object?> HandleCopyDashboardAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var id = arguments.GetValueOrDefault("id")?.ToString();
        if (string.IsNullOrEmpty(id)) return new { error = "看板ID必填" };

        var dashboard = await _dashboardService.CopyDashboardAsync(id, currentUserId);
        if (dashboard == null) return new { error = "看板不存在或无权复制" };

        return new { dashboard.Id, dashboard.Name, message = "看板复制成功" };
    }

    private async Task<object?> HandleGetDashboardStatisticsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var currentUser = await _context.Set<AppUser>().FirstOrDefaultAsync(x => x.Id == currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
            return new { error = "无法确定当前企业" };

        return await _dashboardService.GetStatisticsAsync(currentUserId, currentUser.CurrentCompanyId);
    }

    private async Task<object?> HandleAddCardAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var dashboardId = arguments.GetValueOrDefault("dashboardId")?.ToString();
        var cardType = arguments.GetValueOrDefault("cardType")?.ToString();
        var title = arguments.GetValueOrDefault("title")?.ToString();
        if (string.IsNullOrEmpty(dashboardId) || string.IsNullOrEmpty(cardType) || string.IsNullOrEmpty(title))
            return new { error = "dashboardId, cardType 和 title 必填" };

        var request = new CreateDashboardCardRequest
        {
            CardType = cardType,
            Title = title,
            PositionX = arguments.TryGetValue("positionX", out var px) && int.TryParse(px?.ToString(), out var posX) ? posX : 0,
            PositionY = arguments.TryGetValue("positionY", out var py) && int.TryParse(py?.ToString(), out var posY) ? posY : 0,
            Width = arguments.TryGetValue("width", out var w) && int.TryParse(w?.ToString(), out var width) ? width : 4,
            Height = arguments.TryGetValue("height", out var h) && int.TryParse(h?.ToString(), out var height) ? height : 3,
            DataSource = arguments.GetValueOrDefault("dataSource")?.ToString() ?? "",
            RefreshInterval = arguments.TryGetValue("refreshInterval", out var ri) && int.TryParse(ri?.ToString(), out var interval) ? interval : 300
        };

        var card = await _dashboardService.AddCardAsync(dashboardId, request, currentUserId);
        return new { card.Id, card.DashboardId, card.CardType, card.Title, card.Width, card.Height, message = "卡片添加成功" };
    }

    private async Task<object?> HandleUpdateCardAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var id = arguments.GetValueOrDefault("id")?.ToString();
        if (string.IsNullOrEmpty(id)) return new { error = "卡片ID必填" };

        var request = new UpdateDashboardCardRequest
        {
            Title = arguments.GetValueOrDefault("title")?.ToString(),
            DataSource = arguments.GetValueOrDefault("dataSource")?.ToString(),
            Width = arguments.TryGetValue("width", out var w) && int.TryParse(w?.ToString(), out var width) ? width : null,
            Height = arguments.TryGetValue("height", out var h) && int.TryParse(h?.ToString(), out var height) ? height : null,
            RefreshInterval = arguments.TryGetValue("refreshInterval", out var ri) && int.TryParse(ri?.ToString(), out var interval) ? interval : null
        };

        var card = await _dashboardService.UpdateCardAsync(id, request, currentUserId);
        if (card == null) return new { error = "卡片不存在或无权修改" };

        return new { card.Id, card.Title, message = "卡片更新成功" };
    }

    private async Task<object?> HandleDeleteCardAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var id = arguments.GetValueOrDefault("id")?.ToString();
        if (string.IsNullOrEmpty(id)) return new { error = "卡片ID必填" };

        var result = await _dashboardService.DeleteCardAsync(id, currentUserId);
        if (!result) return new { error = "卡片不存在或无权删除" };

        return new { message = "卡片删除成功" };
    }

    private async Task<object?> HandleGetCardDataAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var cardId = arguments.GetValueOrDefault("cardId")?.ToString();
        if (string.IsNullOrEmpty(cardId)) return new { error = "cardId 必填" };

        var currentUser = await _context.Set<AppUser>().FirstOrDefaultAsync(x => x.Id == currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
            return new { error = "无法确定当前企业" };

        var data = await _dashboardService.GetCardDataAsync(cardId, currentUserId, currentUser.CurrentCompanyId);
        if (data == null) return new { error = "卡片不存在" };

        return data;
    }
}
