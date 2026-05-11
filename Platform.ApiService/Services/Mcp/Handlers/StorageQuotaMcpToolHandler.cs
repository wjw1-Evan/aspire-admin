using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 存储配额 MCP 工具处理器
/// </summary>
public class StorageQuotaMcpToolHandler : McpToolHandlerBase
{
    private readonly IStorageQuotaService _storageQuotaService;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<StorageQuotaMcpToolHandler> _logger;

    public StorageQuotaMcpToolHandler(
        IStorageQuotaService storageQuotaService,
        ITenantContext tenantContext,
        ILogger<StorageQuotaMcpToolHandler> logger)
    {
        _storageQuotaService = storageQuotaService;
        _tenantContext = tenantContext;
        _logger = logger;

        RegisterTool("get_my_quota", "获取当前用户的存储配额信息，包含配额总量、使用量和文件数。关键词：我的配额,我的存储,存储配额,我的云盘",
            async (args, uid) => await _storageQuotaService.GetUserQuotaAsync());

        RegisterTool("get_user_quota", "获取指定用户的存储配额信息。关键词：用户配额,用户存储,存储配额查看",
            ObjectSchema(new Dictionary<string, object> { ["userId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "用户ID（可选，默认当前用户）" } }),
            async (args, uid) =>
            {
                var userId = args.GetValueOrDefault("userId")?.ToString();
                return await _storageQuotaService.GetUserQuotaAsync(userId);
            });

        RegisterTool("get_storage_quota_list", "获取存储配额列表，支持分页、按企业筛选和启用状态筛选。关键词：配额列表,存储配额列表,配额管理",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object>
                {
                    ["companyId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "企业ID（可选）" },
                    ["isEnabled"] = new Dictionary<string, object> { ["type"] = "boolean", ["description"] = "启用状态筛选（可选）" },
                    ["keyword"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" }
                },
                PaginationSchema()
            )),
            async (args, uid) =>
            {
                var (Current, PageSize) = ParsePaginationArgs(args);
                var companyId = args.GetValueOrDefault("companyId")?.ToString();
                bool? isEnabled = args.TryGetValue("isEnabled", out var e) && bool.TryParse(e?.ToString(), out var ie) ? ie : null;
                var request = new Platform.ServiceDefaults.Models.ProTableRequest { Current = Current, PageSize = PageSize, Search = args.GetValueOrDefault("keyword")?.ToString() };
                var result = await _storageQuotaService.GetStorageQuotaListAsync(request, companyId, isEnabled);
                var items = await result.Queryable.ToListAsync();
                return new { items, rowCount = result.RowCount, currentPage = result.CurrentPage, pageSize = result.PageSize, pageCount = result.PageCount };
            });

        RegisterTool("get_storage_usage_stats", "获取存储使用统计信息，包括总配额、总使用量、平均值、分布情况和 Top 用户。关键词：使用统计,存储统计,存储分析",
            ObjectSchema(new Dictionary<string, object> { ["userId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "用户ID（可选，统计所有用户）" } }),
            async (args, uid) =>
            {
                var userId = args.GetValueOrDefault("userId")?.ToString();
                return await _storageQuotaService.GetStorageUsageStatsAsync(userId);
            });

        RegisterTool("get_company_storage_usage", "获取企业存储统计信息，包括企业总配额、使用量、文件类型分布和用户使用情况。关键词：企业存储,企业配额,公司存储统计",
            async (args, uid) => await _storageQuotaService.GetCompanyStorageStatisticsAsync());

        RegisterTool("get_storage_usage_ranking", "获取存储使用量排行榜。关键词：存储排行,使用排行,存储排名,用量排行",
            ObjectSchema(new Dictionary<string, object> { ["topCount"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "返回数量，默认10，最大100" } }),
            async (args, uid) =>
            {
                var topCount = int.TryParse(args.GetValueOrDefault("topCount")?.ToString(), out var t) ? Math.Clamp(t, 1, 100) : 10;
                return await _storageQuotaService.GetStorageUsageRankingAsync(topCount);
            });

        RegisterTool("get_quota_warnings", "获取存储配额警告列表，显示配额使用率超阈值的用户。关键词：配额警告,存储警告,配额预警,超出配额",
            ObjectSchema(new Dictionary<string, object>
            {
                ["warningThreshold"] = new Dictionary<string, object> { ["type"] = "number", ["description"] = "警告阈值（0.1-1.0），默认0.8，表示使用率超过80%" }
            }),
            async (args, uid) =>
            {
                var threshold = double.TryParse(args.GetValueOrDefault("warningThreshold")?.ToString(), out var wt) ? Math.Clamp(wt, 0.1, 1.0) : 0.8;
                return await _storageQuotaService.GetQuotaWarningsAsync(threshold);
            });

        RegisterTool("check_storage_availability", "检查用户是否有足够的存储空间。关键词：检查空间,存储检查,空间是否充足,可用空间",
            ObjectSchema(new Dictionary<string, object>
            {
                ["userId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "用户ID" },
                ["requiredSize"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "需要的空间大小（字节）" }
            }, ["userId", "requiredSize"]),
            async (args, uid) =>
            {
                var userId = args.GetValueOrDefault("userId")?.ToString();
                var requiredSize = long.TryParse(args.GetValueOrDefault("requiredSize")?.ToString(), out var rs) ? rs : 0;
                if (string.IsNullOrEmpty(userId)) return new { error = "用户ID必填" };
                var isAvailable = await _storageQuotaService.CheckStorageAvailabilityAsync(userId, requiredSize);
                return new { userId, requiredSize, isAvailable, message = isAvailable ? "存储空间充足" : "存储空间不足或未分配配额" };
            });
    }
}
