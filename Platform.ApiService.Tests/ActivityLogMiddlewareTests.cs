// 文件说明：
// 本测试覆盖 ActivityLogMiddleware 的关键行为，包括：
// 1) 匿名请求是否记录；
// 2) 查询字符串的包含/截断策略；
// 3) 健康检查等排除路径；
// 4) 共享/上传等操作类型的元数据；
// 5) 响应体中的敏感信息过滤；
// 6) 中间件禁用时不记录。
using System;
using System.IO;
using System.Security.Claims;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Middleware;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Xunit;

namespace Platform.ApiService.Tests;

public class ActivityLogMiddlewareTests
{
    private sealed class CapturingActivityLogService : IUserActivityLogService
    {
        public TaskCompletionSource<LogHttpRequestRequest> Tcs { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public Task<List<UserActivityLog>> GetUserActivityLogsAsync(string userId, int limit = 50) => Task.FromResult(new List<UserActivityLog>());
        public Task<UserActivityLogPagedResponse> GetActivityLogsAsync(GetUserActivityLogsRequest request) => Task.FromResult(new UserActivityLogPagedResponse { Data = new List<UserActivityLog>(), Total = 0, Page = request.Page, PageSize = request.PageSize, TotalPages = 0 });
        public Task LogHttpRequestAsync(LogHttpRequestRequest request)
        {
            Tcs.TrySetResult(request);
            return Task.CompletedTask;
        }
    }

    private sealed class TestLogger<T> : ILogger<T>
    {
        public IDisposable BeginScope<TState>(TState state) => new Noop();
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) { }
        private sealed class Noop : IDisposable { public void Dispose() { } }
    }

    private static IConfiguration CreateConfiguration(bool enabled = true, bool includeAnonymous = true, bool includeQueryString = true)
    {
        var dict = new Dictionary<string, string?>
        {
            {"ActivityLog:Enabled", enabled ? "true" : "false"},
            {"ActivityLog:IncludeAnonymous", includeAnonymous ? "true" : "false"},
            {"ActivityLog:IncludeQueryString", includeQueryString ? "true" : "false"},
            {"ActivityLog:MaxQueryStringLength", "500"}
        };
        return new ConfigurationBuilder().AddInMemoryCollection(dict!).Build();
    }

    private static (HttpContext ctx, CapturingActivityLogService service, IServiceProvider sp) CreateContextAndServices(string path, string method = "GET", string? query = null, string? userId = null)
    {
        var ctx = new DefaultHttpContext();
        ctx.Request.Path = path;
        ctx.Request.Method = method;
        if (!string.IsNullOrEmpty(query)) ctx.Request.QueryString = new QueryString(query);
        ctx.Response.Body = new MemoryStream();
        ctx.Response.StatusCode = 200;
        ctx.Request.Scheme = "http";
        ctx.Request.Host = new HostString("localhost", 15000);
        ctx.Request.Headers["User-Agent"] = "UnitTest-UA";

        if (!string.IsNullOrEmpty(userId))
        {
            var identity = new ClaimsIdentity(new[]
            {
                new Claim("userId", userId),
                new Claim("username", "test-user")
            }, "TestAuth");
            ctx.User = new ClaimsPrincipal(identity);
        }

        var services = new ServiceCollection();
        var capturing = new CapturingActivityLogService();
        services.AddSingleton<IUserActivityLogService>(capturing);
        var sp = services.BuildServiceProvider();
        return (ctx, capturing, sp);
    }

    [Fact]
    public async Task Should_Log_Anonymous_When_Enabled()
    {
        // 场景：启用记录且为匿名请求，应生成日志但不包含用户信息
        var (ctx, capturing, sp) = CreateContextAndServices("/api/cloud-storage/upload", "POST", "?q=x");
        // 模拟响应体供中间件读取（非密码路径）
        ctx.Items["__FormattedResponseBody"] = "{\"ok\":true}";
        // 模拟上传大小
        ctx.Request.ContentLength = 1234;

        RequestDelegate next = async (c) => await Task.CompletedTask;
        var logger = new TestLogger<ActivityLogMiddleware>();
        var middleware = new ActivityLogMiddleware(next, logger, CreateConfiguration(), sp);

        await middleware.InvokeAsync(ctx);

        // 等待异步记录完成
        var logged = await capturing.Tcs.Task.WaitAsync(TimeSpan.FromSeconds(2));

        // 对于匿名请求，提取阶段不会填充 userId/username
        Assert.Null(logged.UserId);
        Assert.Null(logged.Username);
        Assert.Equal("POST", logged.HttpMethod);
        Assert.Contains("/api/cloud-storage/upload", logged.Path);
        // FullUrl 由服务实现生成，此处请求模型不包含该字段，校验其组成字段
        Assert.Equal("http", logged.Scheme);
        Assert.Equal("localhost:15000", logged.Host);
        Assert.NotNull(logged.Metadata);
        Assert.Equal("file_upload", logged.Metadata!["operation_type"]);
        Assert.Equal(1234L, logged.Metadata!["file_size"]);
    }

    [Fact]
    public async Task Should_Respect_IncludeQueryString_False()
    {
        // 场景：配置禁止包含查询字符串，应在日志中不出现 QueryString
        var (ctx, capturing, sp) = CreateContextAndServices("/api/cloud-storage/download", "GET", "?q=" + new string('a', 100));
        ctx.Items["__FormattedResponseBody"] = "{\"ok\":true}";

        RequestDelegate next = async (c) => await Task.CompletedTask;
        var logger = new TestLogger<ActivityLogMiddleware>();
        var middleware = new ActivityLogMiddleware(next, logger, CreateConfiguration(includeQueryString: false), sp);

        await middleware.InvokeAsync(ctx);
        var logged = await capturing.Tcs.Task.WaitAsync(TimeSpan.FromSeconds(2));
        Assert.Null(logged.QueryString);
        Assert.NotNull(logged.Metadata);
        Assert.Equal("file_download", logged.Metadata!["operation_type"]);
    }

    [Fact]
    public async Task Should_Trim_Long_QueryString()
    {
        // 场景：查询字符串过长时应被截断并以省略号结尾
        var longQuery = "?q=" + new string('b', 600);
        var (ctx, capturing, sp) = CreateContextAndServices("/api/cloud-storage/search", "GET", longQuery);
        ctx.Items["__FormattedResponseBody"] = "{\"ok\":true}";

        RequestDelegate next = async (c) => await Task.CompletedTask;
        var logger = new TestLogger<ActivityLogMiddleware>();
        var middleware = new ActivityLogMiddleware(next, logger, CreateConfiguration(), sp);

        await middleware.InvokeAsync(ctx);
        var logged = await capturing.Tcs.Task.WaitAsync(TimeSpan.FromSeconds(2));
        Assert.NotNull(logged.QueryString);
        Assert.EndsWith("...", logged.QueryString);
        Assert.Contains("?q=", logged.QueryString);
    }

    [Fact]
    public async Task Should_Skip_Excluded_Paths()
    {
        // 场景：健康检查等排除路径不应产生日志记录
        var (ctx, capturing, sp) = CreateContextAndServices("/health");
        RequestDelegate next = async (c) => await Task.CompletedTask;
        var logger = new TestLogger<ActivityLogMiddleware>();
        var middleware = new ActivityLogMiddleware(next, logger, CreateConfiguration(), sp);

        await middleware.InvokeAsync(ctx);

        // 不应记录
        await Assert.ThrowsAsync<TimeoutException>(async () => await capturing.Tcs.Task.WaitAsync(TimeSpan.FromMilliseconds(200)));
    }

    [Fact]
    public async Task Should_Set_Share_Operation_Metadata()
    {
        // 场景：路径命中分享操作，应在元数据中标记 share_create 并置 is_share_operation=true
        var (ctx, capturing, sp) = CreateContextAndServices("/api/file-share/create", "POST");
        ctx.Items["__FormattedResponseBody"] = "{\"ok\":true}";

        RequestDelegate next = async (c) => await Task.CompletedTask;
        var logger = new TestLogger<ActivityLogMiddleware>();
        var middleware = new ActivityLogMiddleware(next, logger, CreateConfiguration(), sp);

        await middleware.InvokeAsync(ctx);
        var logged = await capturing.Tcs.Task.WaitAsync(TimeSpan.FromSeconds(2));
        Assert.NotNull(logged.Metadata);
        Assert.Equal("share_create", logged.Metadata!["operation_type"]);
        Assert.True((bool)logged.Metadata!["is_share_operation"]);
    }

    [Fact]
    public async Task Should_Filter_Password_In_ResponseBody()
    {
        // 场景：访问密码本相关接口时，返回体中的敏感字段需被过滤替换
        var (ctx, capturing, sp) = CreateContextAndServices("/api/password-book/list");
        ctx.Items["__FormattedResponseBody"] = "{\"password\":\"secret\",\"x\":1}";

        RequestDelegate next = async (c) => await Task.CompletedTask;
        var logger = new TestLogger<ActivityLogMiddleware>();
        var middleware = new ActivityLogMiddleware(next, logger, CreateConfiguration(includeAnonymous: true), sp);

        await middleware.InvokeAsync(ctx);

        var logged = await capturing.Tcs.Task.WaitAsync(TimeSpan.FromSeconds(2));
        Assert.NotNull(logged.ResponseBody);
        Assert.Contains("***FILTERED***", logged.ResponseBody);
    }

    [Fact]
    public async Task Should_Skip_When_Disabled()
    {
        // 场景：中间件禁用时，无论请求如何都不应产生日志
        var (ctx, capturing, sp) = CreateContextAndServices("/api/demo");
        RequestDelegate next = async (c) => await Task.CompletedTask;
        var logger = new TestLogger<ActivityLogMiddleware>();
        var middleware = new ActivityLogMiddleware(next, logger, CreateConfiguration(enabled: false), sp);

        await middleware.InvokeAsync(ctx);

        // 不应记录
        await Assert.ThrowsAsync<TimeoutException>(async () => await capturing.Tcs.Task.WaitAsync(TimeSpan.FromMilliseconds(200)));
    }
}
