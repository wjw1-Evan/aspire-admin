using System;
using System.Diagnostics;
using System.Collections.Generic;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Middleware;

/// <summary>
/// 活动日志中间件 - 自动记录所有 API 请求
/// </summary>
public class ActivityLogMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ActivityLogMiddleware> _logger;
    private readonly IConfiguration _configuration;

    // 排除路径列表
    private static readonly string[] ExcludedPaths =
    {
        "/health",
        "/api/openapi",
        "/scalar/",
        "/metrics",
        "/_framework/",
        "/favicon.ico",
        "/api/chat/sse",  // SSE 端点
        "/chat/sse"  // SSE 端点（直接访问）
    };

    private readonly IUserActivityLogQueue _logQueue;

    /// <summary>
    /// 初始化活动日志中间件
    /// </summary>
    /// <param name="next">下一个中间件委托</param>
    /// <param name="logger">日志记录器</param>
    /// <param name="configuration">配置对象</param>
    /// <param name="logQueue">异步日志队列</param>
    public ActivityLogMiddleware(
        RequestDelegate next,
        ILogger<ActivityLogMiddleware> logger,
        IConfiguration configuration,
        IUserActivityLogQueue logQueue)
    {
        _next = next;
        _logger = logger;
        _configuration = configuration;
        _logQueue = logQueue;
    }

    /// <summary>
    /// 执行中间件逻辑
    /// </summary>
    /// <param name="context">HTTP 上下文</param>
    /// <param name="tenantContext">租户上下文</param>
    public async Task InvokeAsync(HttpContext context, ITenantContext tenantContext)
    {
        // 检查是否启用日志记录
        var enabled = _configuration.GetValue<bool>("ActivityLog:Enabled", true);
        if (!enabled)
        {
            await _next(context);
            return;
        }

        // 检查是否需要排除此路径
        if (ShouldExclude(context.Request.Path))
        {
            await _next(context);
            return;
        }

        // 记录请求开始并计时
        var stopwatch = Stopwatch.StartNew();

        try
        {
            // 执行请求
            await _next(context);
        }
        catch (Exception ex)
        {
            // 记录异常信息
            context.Response.StatusCode = 500;
            _logger.LogError(ex, "ActivityLogMiddleware: 执行请求时发生未捕获异常");
            // 注意：不在这里 throw，因为后面还要记录日志。记录后再 throw。
            // 或者记录完直接 re-throw
            throw;
        }
        finally
        {
            // 停止计时
            stopwatch.Stop();

            // ⚠️ 关键修复：在请求线程中提取所有数据（包括企业 ID），避免在后台线程访问 HttpContext 或丢失 Scoped Context
            var logData = await ExtractLogData(context, tenantContext, stopwatch.ElapsedMilliseconds);

            if (logData.HasValue)
            {
                // ✅ 性能优化：将日志请求发送到异步队列，由后台 Worker 处理
                // 使用 CancellationToken.None 确保即使请求取消，日志也能成功入队
                await _logQueue.EnqueueAsync(ToRequest(logData.Value), CancellationToken.None);
            }
        }
    }

    /// <summary>
    /// 检查是否应该排除此路径
    /// </summary>
    private bool ShouldExclude(PathString path)
    {
        var pathString = path.Value?.ToLower() ?? string.Empty;

        // 检查预定义的排除路径
        if (ExcludedPaths.Any(excludedPath => pathString.Contains(excludedPath.ToLower())))
        {
            return true;
        }

        // 检查配置的排除路径
        var configuredExcludedPaths = _configuration.GetSection("ActivityLog:ExcludedPaths").Get<string[]>();
        if (configuredExcludedPaths != null && configuredExcludedPaths.Any(excludedPath => pathString.Contains(excludedPath.ToLower())))
        {
            return true;
        }

        return false;
    }

    /// <summary>
    /// 在请求线程中提取日志数据（避免后台线程访问 HttpContext）
    /// </summary>
    private async Task<(string? userId, string? companyId, string? username, string httpMethod, string path, string? queryString, string scheme, string host, int statusCode, long durationMs, string? ipAddress, string? userAgent, Dictionary<string, object>? metadata)?> ExtractLogData(HttpContext context, ITenantContext tenantContext, long durationMs)
    {
        // 提取用户信息
        string? userId = null;
        string? username = null;
        string? companyId = null;

        if (context.User?.Identity?.IsAuthenticated == true)
        {
            userId = context.User.FindFirst("userId")?.Value
                    ?? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? context.User.FindFirst("sub")?.Value;

            username = context.User.FindFirst("username")?.Value
                       ?? context.User.FindFirst("name")?.Value
                       ?? context.User.Identity.Name;

            // ⚠️ 核心修复：在请求作用域内提取当前企业 ID
            companyId = await tenantContext.GetCurrentCompanyIdAsync();
        }

        // 检查是否包含匿名用户 (默认开启，确保记录)
        var includeAnonymous = _configuration.GetValue<bool>("ActivityLog:IncludeAnonymous", true);
        if (string.IsNullOrEmpty(userId) && !includeAnonymous)
        {
            return null; // 不记录匿名请求
        }

        // 提取请求信息
        var httpMethod = context.Request.Method;
        var path = context.Request.Path.Value ?? string.Empty;
        var queryString = context.Request.QueryString.Value;

        // 提取 URL 相关信息
        var scheme = context.Request.Scheme; // http 或 https
        var host = context.Request.Host.Value ?? "localhost"; // 包含主机名和端口，例如：localhost:15000

        // 限制查询字符串长度
        var maxQueryStringLength = _configuration.GetValue<int>("ActivityLog:MaxQueryStringLength", 500);
        if (!string.IsNullOrEmpty(queryString) && queryString.Length > maxQueryStringLength)
        {
            queryString = queryString.Substring(0, maxQueryStringLength) + "...";
        }

        // 检查是否包含查询字符串
        var includeQueryString = _configuration.GetValue<bool>("ActivityLog:IncludeQueryString", true);
        if (!includeQueryString)
        {
            queryString = null;
        }

        // 提取IP地址
        var ipAddress = context.Connection.RemoteIpAddress?.ToString();

        // 提取User-Agent
        var userAgent = context.Request.Headers["User-Agent"].ToString();

        // 响应状态码
        var statusCode = context.Response.StatusCode;

        // 提取云存储操作的元数据
        var metadata = ExtractCloudStorageMetadata(context, httpMethod, path);

        return (userId, companyId, username, httpMethod, path, queryString, scheme, host, statusCode, durationMs, ipAddress, userAgent, metadata);
    }

    /// <summary>
    /// 日志数据元组转请求对象的转换方法
    /// </summary>
    private static LogHttpRequestRequest ToRequest((string? userId, string? companyId, string? username, string httpMethod, string path, string? queryString, string scheme, string host, int statusCode, long durationMs, string? ipAddress, string? userAgent, Dictionary<string, object>? metadata) data)
    {
        return new LogHttpRequestRequest
        {
            UserId = data.userId,
            CompanyId = data.companyId,
            Username = data.username,
            HttpMethod = data.httpMethod,
            Path = data.path,
            QueryString = data.queryString,
            Scheme = data.scheme,
            Host = data.host,
            StatusCode = data.statusCode,
            DurationMs = data.durationMs,
            IpAddress = data.ipAddress,
            UserAgent = data.userAgent,
            Metadata = data.metadata ?? new Dictionary<string, object>()
        };
    }



    /// <summary>
    /// 提取云存储操作的元数据
    /// </summary>
    private static Dictionary<string, object>? ExtractCloudStorageMetadata(HttpContext context, string httpMethod, string path)
    {
        var pathLower = path.ToLower();

        // 检查是否是云存储相关的API
        if (!pathLower.StartsWith("/api/cloud-storage") &&
            !pathLower.StartsWith("/api/file-share") &&
            !pathLower.StartsWith("/api/file-version") &&
            !pathLower.StartsWith("/api/storage-quota"))
        {
            return null;
        }

        var metadata = new Dictionary<string, object>
        {
            ["category"] = "cloud_storage",
            ["operation_type"] = DetermineOperationType(httpMethod, pathLower),
            ["is_security_sensitive"] = IsSecuritySensitiveOperation(pathLower),
            ["is_file_operation"] = IsFileOperation(pathLower),
            ["is_share_operation"] = IsShareOperation(pathLower)
        };

        // 提取文件ID（如果存在）
        var fileId = ExtractFileIdFromPath(pathLower);
        if (!string.IsNullOrEmpty(fileId))
        {
            metadata["file_id"] = fileId;
        }

        // 提取操作详情
        var operationDetails = ExtractOperationDetails(httpMethod, pathLower);
        if (operationDetails.Count > 0)
        {
            metadata["operation_details"] = operationDetails;
        }

        // 记录文件大小（如果是上传操作）
        if (pathLower.Contains("/upload") && context.Request.ContentLength.HasValue)
        {
            metadata["file_size"] = context.Request.ContentLength.Value;
        }

        return metadata;
    }

    /// <summary>
    /// 确定操作类型
    /// </summary>
    private static string DetermineOperationType(string httpMethod, string path)
    {
        return (httpMethod.ToUpper(), path) switch
        {
            ("POST", var p) when p.Contains("/upload") => "file_upload",
            ("POST", var p) when p.Contains("/folders") => "folder_create",
            ("POST", var p) when p.Contains("/copy") => "file_copy",
            ("POST", var p) when p.Contains("/restore") => "file_restore",
            ("POST", var p) when p.Contains("/batch") => "batch_operation",
            ("POST", var p) when p.Contains("/file-share") => "share_create",
            ("GET", var p) when p.Contains("/download") => "file_download",
            ("GET", var p) when p.Contains("/preview") => "file_preview",
            ("GET", var p) when p.Contains("/thumbnail") => "file_thumbnail",
            ("GET", var p) when p.Contains("/search") => "file_search",
            ("GET", var p) when p.Contains("/recycle-bin") => "recycle_bin_view",
            ("PUT", var p) when p.Contains("/rename") => "file_rename",
            ("PUT", var p) when p.Contains("/move") => "file_move",
            ("DELETE", var p) when p.Contains("/permanent") => "file_permanent_delete",
            ("DELETE", var p) when p.Contains("/recycle-bin/empty") => "recycle_bin_empty",
            ("DELETE", _) => "file_delete",
            ("GET", _) => "file_view",
            _ => "unknown"
        };
    }

    /// <summary>
    /// 判断是否是安全敏感操作
    /// </summary>
    private static bool IsSecuritySensitiveOperation(string path)
    {
        return path.Contains("/share") ||
               path.Contains("/permanent") ||
               path.Contains("/batch") ||
               path.Contains("/recycle-bin/empty") ||
               path.Contains("/storage-quota");
    }

    /// <summary>
    /// 判断是否是文件操作
    /// </summary>
    private static bool IsFileOperation(string path)
    {
        return path.StartsWith("/api/cloud-storage") ||
               path.StartsWith("/api/file-version");
    }

    /// <summary>
    /// 判断是否是分享操作
    /// </summary>
    private static bool IsShareOperation(string path)
    {
        return path.StartsWith("/api/file-share");
    }

    /// <summary>
    /// 从路径中提取文件ID
    /// </summary>
    private static string? ExtractFileIdFromPath(string path)
    {
        // 匹配路径中的GUID格式ID
        var match = System.Text.RegularExpressions.Regex.Match(
            path,
            @"/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})",
            System.Text.RegularExpressions.RegexOptions.IgnoreCase);

        return match.Success ? match.Groups[1].Value : null;
    }

    /// <summary>
    /// 提取操作详情
    /// </summary>
    private static Dictionary<string, object> ExtractOperationDetails(string httpMethod, string path)
    {
        var details = new Dictionary<string, object>();

        if (path.Contains("/batch/"))
        {
            if (path.Contains("/delete"))
                details["batch_type"] = "delete";
            else if (path.Contains("/move"))
                details["batch_type"] = "move";
            else if (path.Contains("/copy"))
                details["batch_type"] = "copy";
        }

        if (path.Contains("/search"))
        {
            details["search_type"] = path.Contains("/content") ? "content_search" : "metadata_search";
        }

        return details;
    }
}
