using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using System.Text.Json;

namespace Platform.ApiService.Services;

/// <summary>
/// 数据查询服务实现
/// </summary>
public class DataQueryService : IDataQueryService
{
    private readonly DbContext _context;
    private readonly ILogger<DataQueryService> _logger;

    public DataQueryService(
        DbContext context,
        ILogger<DataQueryService> logger)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// 查询数据
    /// </summary>
    public async Task<object> QueryDataAsync(DataSourceConfig config, string userId, string companyId)
    {
        if (config == null)
            throw new ArgumentNullException(nameof(config));
        if (string.IsNullOrEmpty(config.Module))
            throw new ArgumentException("模块不能为空", nameof(config));
        if (string.IsNullOrEmpty(config.DataType))
            throw new ArgumentException("数据类型不能为空", nameof(config));

        _logger.LogInformation("查询数据: Module={Module}, DataType={DataType}, UserId={UserId}", config.Module, config.DataType, userId);

        return config.Module.ToLower() switch
        {
            "task" => await QueryTaskDataAsync(config, userId, companyId),
            "project" => await QueryProjectDataAsync(config, userId, companyId),
            "iot" => await QueryIoTDataAsync(config, userId, companyId),
            "workflow" => await QueryWorkflowDataAsync(config, userId, companyId),
            "park" => await QueryParkDataAsync(config, userId, companyId),
            "document" => await QueryDocumentDataAsync(config, userId, companyId),
            "knowledge" => await QueryKnowledgeDataAsync(config, userId, companyId),
            "storage" => await QueryStorageDataAsync(config, userId, companyId),
            _ => throw new ArgumentException($"不支持的模块: {config.Module}", nameof(config))
        };
    }

    /// <summary>
    /// 查询任务数据
    /// </summary>
    private async Task<object> QueryTaskDataAsync(DataSourceConfig config, string userId, string companyId)
    {
        var timeRange = GetTimeRange(config.TimeRange, config.StartTime, config.EndTime);

        return config.DataType.ToLower() switch
        {
            "count" => await QueryTaskCountAsync(config, userId, companyId, timeRange),
            "trend" => await QueryTaskTrendAsync(config, userId, companyId, timeRange),
            "list" => await QueryTaskListAsync(config, userId, companyId, timeRange),
            "distribution" => await QueryTaskDistributionAsync(config, userId, companyId, timeRange),
            _ => throw new ArgumentException($"不支持的数据类型: {config.DataType}", nameof(config))
        };
    }

    /// <summary>
    /// 查询项目数据
    /// </summary>
    private async Task<object> QueryProjectDataAsync(DataSourceConfig config, string userId, string companyId)
    {
        var timeRange = GetTimeRange(config.TimeRange, config.StartTime, config.EndTime);

        return config.DataType.ToLower() switch
        {
            "count" => await QueryProjectCountAsync(config, userId, companyId, timeRange),
            "trend" => await QueryProjectTrendAsync(config, userId, companyId, timeRange),
            "list" => await QueryProjectListAsync(config, userId, companyId, timeRange),
            "distribution" => await QueryProjectDistributionAsync(config, userId, companyId, timeRange),
            _ => throw new ArgumentException($"不支持的数据类型: {config.DataType}", nameof(config))
        };
    }

    /// <summary>
    /// 查询IoT数据
    /// </summary>
    private async Task<object> QueryIoTDataAsync(DataSourceConfig config, string userId, string companyId)
    {
        var timeRange = GetTimeRange(config.TimeRange, config.StartTime, config.EndTime);

        return config.DataType.ToLower() switch
        {
            "count" => await QueryIoTCountAsync(config, userId, companyId, timeRange),
            "trend" => await QueryIoTTrendAsync(config, userId, companyId, timeRange),
            "list" => await QueryIoTListAsync(config, userId, companyId, timeRange),
            "distribution" => await QueryIoTDistributionAsync(config, userId, companyId, timeRange),
            _ => throw new ArgumentException($"不支持的数据类型: {config.DataType}", nameof(config))
        };
    }

    /// <summary>
    /// 查询工作流数据
    /// </summary>
    private async Task<object> QueryWorkflowDataAsync(DataSourceConfig config, string userId, string companyId)
    {
        var timeRange = GetTimeRange(config.TimeRange, config.StartTime, config.EndTime);

        return config.DataType.ToLower() switch
        {
            "count" => await QueryWorkflowCountAsync(config, userId, companyId, timeRange),
            "trend" => await QueryWorkflowTrendAsync(config, userId, companyId, timeRange),
            "list" => await QueryWorkflowListAsync(config, userId, companyId, timeRange),
            "distribution" => await QueryWorkflowDistributionAsync(config, userId, companyId, timeRange),
            _ => throw new ArgumentException($"不支持的数据类型: {config.DataType}", nameof(config))
        };
    }

    /// <summary>
    /// 查询园区数据
    /// </summary>
    private async Task<object> QueryParkDataAsync(DataSourceConfig config, string userId, string companyId)
    {
        var timeRange = GetTimeRange(config.TimeRange, config.StartTime, config.EndTime);

        return config.DataType.ToLower() switch
        {
            "count" => await QueryParkCountAsync(config, userId, companyId, timeRange),
            "trend" => await QueryParkTrendAsync(config, userId, companyId, timeRange),
            "list" => await QueryParkListAsync(config, userId, companyId, timeRange),
            "distribution" => await QueryParkDistributionAsync(config, userId, companyId, timeRange),
            _ => throw new ArgumentException($"不支持的数据类型: {config.DataType}", nameof(config))
        };
    }

    /// <summary>
    /// 查询公文数据
    /// </summary>
    private async Task<object> QueryDocumentDataAsync(DataSourceConfig config, string userId, string companyId)
    {
        var timeRange = GetTimeRange(config.TimeRange, config.StartTime, config.EndTime);

        return config.DataType.ToLower() switch
        {
            "count" => await QueryDocumentCountAsync(config, userId, companyId, timeRange),
            "trend" => await QueryDocumentTrendAsync(config, userId, companyId, timeRange),
            "list" => await QueryDocumentListAsync(config, userId, companyId, timeRange),
            "distribution" => await QueryDocumentDistributionAsync(config, userId, companyId, timeRange),
            _ => throw new ArgumentException($"不支持的数据类型: {config.DataType}", nameof(config))
        };
    }

    /// <summary>
    /// 查询知识库数据
    /// </summary>
    private async Task<object> QueryKnowledgeDataAsync(DataSourceConfig config, string userId, string companyId)
    {
        var timeRange = GetTimeRange(config.TimeRange, config.StartTime, config.EndTime);

        return config.DataType.ToLower() switch
        {
            "count" => await QueryKnowledgeCountAsync(config, userId, companyId, timeRange),
            "trend" => await QueryKnowledgeTrendAsync(config, userId, companyId, timeRange),
            "list" => await QueryKnowledgeListAsync(config, userId, companyId, timeRange),
            "distribution" => await QueryKnowledgeDistributionAsync(config, userId, companyId, timeRange),
            _ => throw new ArgumentException($"不支持的数据类型: {config.DataType}", nameof(config))
        };
    }

    /// <summary>
    /// 查询存储数据
    /// </summary>
    private async Task<object> QueryStorageDataAsync(DataSourceConfig config, string userId, string companyId)
    {
        var timeRange = GetTimeRange(config.TimeRange, config.StartTime, config.EndTime);

        return config.DataType.ToLower() switch
        {
            "count" => await QueryStorageCountAsync(config, userId, companyId, timeRange),
            "trend" => await QueryStorageTrendAsync(config, userId, companyId, timeRange),
            "list" => await QueryStorageListAsync(config, userId, companyId, timeRange),
            "distribution" => await QueryStorageDistributionAsync(config, userId, companyId, timeRange),
            _ => throw new ArgumentException($"不支持的数据类型: {config.DataType}", nameof(config))
        };
    }

    #region 任务数据查询

    private async Task<object> QueryTaskCountAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var total = await _context.Set<object>()
            .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
            .CountAsync();

        return new { total, timeRange };
    }

    private async Task<object> QueryTaskTrendAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var trend = new List<object>();
        var current = timeRange.start;

        while (current <= timeRange.end)
        {
            var next = current.AddDays(1);
            var count = await _context.Set<object>()
                .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
                .CountAsync();

            trend.Add(new { date = current.ToString("yyyy-MM-dd"), count });
            current = next;
        }

        return trend;
    }

    private async Task<object> QueryTaskListAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var list = await _context.Set<object>()
            .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
            .Take(10)
            .ToListAsync();

        return list;
    }

    private async Task<object> QueryTaskDistributionAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var distribution = new List<object>
        {
            new { name = "进行中", value = 10 },
            new { name = "已完成", value = 20 },
            new { name = "已逾期", value = 5 }
        };

        return distribution;
    }

    #endregion

    #region 项目数据查询

    private async Task<object> QueryProjectCountAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var total = await _context.Set<object>()
            .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
            .CountAsync();

        return new { total, timeRange };
    }

    private async Task<object> QueryProjectTrendAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var trend = new List<object>();
        var current = timeRange.start;

        while (current <= timeRange.end)
        {
            var next = current.AddDays(1);
            var count = await _context.Set<object>()
                .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
                .CountAsync();

            trend.Add(new { date = current.ToString("yyyy-MM-dd"), count });
            current = next;
        }

        return trend;
    }

    private async Task<object> QueryProjectListAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var list = await _context.Set<object>()
            .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
            .Take(10)
            .ToListAsync();

        return list;
    }

    private async Task<object> QueryProjectDistributionAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var distribution = new List<object>
        {
            new { name = "进行中", value = 5 },
            new { name = "已完成", value = 8 },
            new { name = "已暂停", value = 2 }
        };

        return distribution;
    }

    #endregion

    #region IoT数据查询

    private async Task<object> QueryIoTCountAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var total = await _context.Set<object>()
            .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
            .CountAsync();

        return new { total, timeRange };
    }

    private async Task<object> QueryIoTTrendAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var trend = new List<object>();
        var current = timeRange.start;

        while (current <= timeRange.end)
        {
            var next = current.AddDays(1);
            var count = await _context.Set<object>()
                .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
                .CountAsync();

            trend.Add(new { date = current.ToString("yyyy-MM-dd"), count });
            current = next;
        }

        return trend;
    }

    private async Task<object> QueryIoTListAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var list = await _context.Set<object>()
            .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
            .Take(10)
            .ToListAsync();

        return list;
    }

    private async Task<object> QueryIoTDistributionAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var distribution = new List<object>
        {
            new { name = "在线", value = 15 },
            new { name = "离线", value = 3 },
            new { name = "告警", value = 2 }
        };

        return distribution;
    }

    #endregion

    #region 工作流数据查询

    private async Task<object> QueryWorkflowCountAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var total = await _context.Set<object>()
            .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
            .CountAsync();

        return new { total, timeRange };
    }

    private async Task<object> QueryWorkflowTrendAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var trend = new List<object>();
        var current = timeRange.start;

        while (current <= timeRange.end)
        {
            var next = current.AddDays(1);
            var count = await _context.Set<object>()
                .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
                .CountAsync();

            trend.Add(new { date = current.ToString("yyyy-MM-dd"), count });
            current = next;
        }

        return trend;
    }

    private async Task<object> QueryWorkflowListAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var list = await _context.Set<object>()
            .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
            .Take(10)
            .ToListAsync();

        return list;
    }

    private async Task<object> QueryWorkflowDistributionAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var distribution = new List<object>
        {
            new { name = "进行中", value = 8 },
            new { name = "已完成", value = 12 },
            new { name = "已驳回", value = 3 }
        };

        return distribution;
    }

    #endregion

    #region 园区数据查询

    private async Task<object> QueryParkCountAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var total = await _context.Set<object>()
            .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
            .CountAsync();

        return new { total, timeRange };
    }

    private async Task<object> QueryParkTrendAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var trend = new List<object>();
        var current = timeRange.start;

        while (current <= timeRange.end)
        {
            var next = current.AddDays(1);
            var count = await _context.Set<object>()
                .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
                .CountAsync();

            trend.Add(new { date = current.ToString("yyyy-MM-dd"), count });
            current = next;
        }

        return trend;
    }

    private async Task<object> QueryParkListAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var list = await _context.Set<object>()
            .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
            .Take(10)
            .ToListAsync();

        return list;
    }

    private async Task<object> QueryParkDistributionAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var distribution = new List<object>
        {
            new { name = "资产", value = 50 },
            new { name = "租户", value = 20 },
            new { name = "招商", value = 10 }
        };

        return distribution;
    }

    #endregion

    #region 公文数据查询

    private async Task<object> QueryDocumentCountAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var total = await _context.Set<object>()
            .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
            .CountAsync();

        return new { total, timeRange };
    }

    private async Task<object> QueryDocumentTrendAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var trend = new List<object>();
        var current = timeRange.start;

        while (current <= timeRange.end)
        {
            var next = current.AddDays(1);
            var count = await _context.Set<object>()
                .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
                .CountAsync();

            trend.Add(new { date = current.ToString("yyyy-MM-dd"), count });
            current = next;
        }

        return trend;
    }

    private async Task<object> QueryDocumentListAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var list = await _context.Set<object>()
            .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
            .Take(10)
            .ToListAsync();

        return list;
    }

    private async Task<object> QueryDocumentDistributionAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var distribution = new List<object>
        {
            new { name = "待审批", value = 5 },
            new { name = "已审批", value = 15 },
            new { name = "已归档", value = 30 }
        };

        return distribution;
    }

    #endregion

    #region 知识库数据查询

    private async Task<object> QueryKnowledgeCountAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var total = await _context.Set<object>()
            .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
            .CountAsync();

        return new { total, timeRange };
    }

    private async Task<object> QueryKnowledgeTrendAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var trend = new List<object>();
        var current = timeRange.start;

        while (current <= timeRange.end)
        {
            var next = current.AddDays(1);
            var count = await _context.Set<object>()
                .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
                .CountAsync();

            trend.Add(new { date = current.ToString("yyyy-MM-dd"), count });
            current = next;
        }

        return trend;
    }

    private async Task<object> QueryKnowledgeListAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var list = await _context.Set<object>()
            .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
            .Take(10)
            .ToListAsync();

        return list;
    }

    private async Task<object> QueryKnowledgeDistributionAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var distribution = new List<object>
        {
            new { name = "技术文档", value = 20 },
            new { name = "业务文档", value = 15 },
            new { name = "其他", value = 10 }
        };

        return distribution;
    }

    #endregion

    #region 存储数据查询

    private async Task<object> QueryStorageCountAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var total = await _context.Set<object>()
            .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
            .CountAsync();

        return new { total, timeRange };
    }

    private async Task<object> QueryStorageTrendAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var trend = new List<object>();
        var current = timeRange.start;

        while (current <= timeRange.end)
        {
            var next = current.AddDays(1);
            var count = await _context.Set<object>()
                .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
                .CountAsync();

            trend.Add(new { date = current.ToString("yyyy-MM-dd"), count });
            current = next;
        }

        return trend;
    }

    private async Task<object> QueryStorageListAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var list = await _context.Set<object>()
            .Where(x => EF.Property<string>(x, "CompanyId") == companyId)
            .Take(10)
            .ToListAsync();

        return list;
    }

    private async Task<object> QueryStorageDistributionAsync(DataSourceConfig config, string userId, string companyId, (DateTime start, DateTime end) timeRange)
    {
        var distribution = new List<object>
        {
            new { name = "文档", value = 100 },
            new { name = "图片", value = 50 },
            new { name = "视频", value = 20 }
        };

        return distribution;
    }

    #endregion

    /// <summary>
    /// 获取可用模块列表
    /// </summary>
    public async Task<List<string>> GetAvailableModulesAsync()
    {
        return new List<string>
        {
            "task",
            "project",
            "iot",
            "workflow",
            "park",
            "document",
            "knowledge",
            "storage"
        };
    }

    /// <summary>
    /// 获取模块可用字段
    /// </summary>
    public async Task<List<string>> GetModuleFieldsAsync(string module)
    {
        return module.ToLower() switch
        {
            "task" => new List<string> { "id", "name", "status", "priority", "assignedTo", "createdAt", "updatedAt" },
            "project" => new List<string> { "id", "name", "status", "progress", "manager", "createdAt", "updatedAt" },
            "iot" => new List<string> { "id", "name", "type", "status", "location", "createdAt", "updatedAt" },
            "workflow" => new List<string> { "id", "name", "status", "currentStep", "initiator", "createdAt", "updatedAt" },
            "park" => new List<string> { "id", "name", "type", "value", "location", "createdAt", "updatedAt" },
            "document" => new List<string> { "id", "title", "type", "status", "sender", "createdAt", "updatedAt" },
            "knowledge" => new List<string> { "id", "title", "category", "author", "views", "createdAt", "updatedAt" },
            "storage" => new List<string> { "id", "name", "type", "size", "uploader", "createdAt", "updatedAt" },
            _ => new List<string>()
        };
    }

    /// <summary>
    /// 获取时间范围
    /// </summary>
    private (DateTime start, DateTime end) GetTimeRange(string timeRange, DateTime? startTime, DateTime? endTime)
    {
        var now = DateTime.UtcNow;

        if (timeRange == "custom" && startTime.HasValue && endTime.HasValue)
        {
            return (startTime.Value, endTime.Value);
        }

        return timeRange.ToLower() switch
        {
            "today" => (now.Date, now.Date.AddDays(1).AddTicks(-1)),
            "week" => (now.AddDays(-7), now),
            "month" => (now.AddMonths(-1), now),
            _ => (now.AddDays(-30), now)
        };
    }
}
