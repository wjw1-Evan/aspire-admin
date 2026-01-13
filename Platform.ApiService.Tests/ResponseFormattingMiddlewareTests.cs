// 文件说明：
// 本测试验证 ResponseFormattingMiddleware 的响应包装与跳过规则，包括：
// 1) 200 JSON 自动包装为统一 ApiResponse；
// 2) 已包装响应不重复包装；
// 3) SSE、OpenAPI、stream=true、health 路径等跳过包装；
// 4) 对 TaskCanceled/OperationCanceled 异常的稳健处理。
using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Middleware;
using Xunit;

namespace Platform.ApiService.Tests;

public class ResponseFormattingMiddlewareTests
{
    private sealed class TestLogger<T> : ILogger<T>
    {
        public IDisposable BeginScope<TState>(TState state) => new Noop();
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter) { }
        private sealed class Noop : IDisposable { public void Dispose() { } }
    }

    private static HttpContext CreateHttpContext(string path = "/api/test", string method = "GET")
    {
        var context = new DefaultHttpContext();
        context.Request.Path = path;
        context.Request.Method = method;
        context.Response.Body = new MemoryStream();
        return context;
    }

    private static async Task WriteJsonResponse(HttpContext context, string json, int statusCode = 200, string contentType = "application/json")
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType = contentType;
        var bytes = Encoding.UTF8.GetBytes(json);
        await context.Response.Body.WriteAsync(bytes, 0, bytes.Length);
        context.Response.Body.Seek(0, SeekOrigin.Begin);
    }

    [Fact]
    public async Task Json_Response_Should_Be_Wrapped_When_200()
    {
        // 场景：普通 200 JSON 响应应被包装为统一成功格式，并缓存到 HttpContext.Items 供后续中间件使用
        var ctx = CreateHttpContext("/api/demo");
        var output = new MemoryStream();
        ctx.Response.Body = output;

        // next 写入原始 JSON
        RequestDelegate next = async (c) =>
        {
            await WriteJsonResponse(c, "{\"name\":\"foo\"}");
        };

        var logger = new TestLogger<ResponseFormattingMiddleware>();
        var middleware = new ResponseFormattingMiddleware(next, logger);

        // 执行中间件
        await middleware.InvokeAsync(ctx);

        // 读取最终响应
        output.Seek(0, SeekOrigin.Begin);
        var final = await new StreamReader(output).ReadToEndAsync();

        // 应为标准包装格式 success/data/timestamp
        Assert.Contains("\"success\":true", final);
        Assert.Contains("\"data\":{\"name\":\"foo\"}", final);

        // 中间件应存储响应体供后续中间件使用
        Assert.True(ctx.Items.ContainsKey("__FormattedResponseBody"));
        var stored = ctx.Items["__FormattedResponseBody"] as string;
        Assert.False(string.IsNullOrWhiteSpace(stored));
    }

    [Fact]
    public async Task Already_Formatted_Should_Not_Wrap_Again()
    {
        // 场景：响应已符合统一格式时，不应重复包装导致嵌套
        var ctx = CreateHttpContext("/api/demo");
        var output = new MemoryStream();
        ctx.Response.Body = output;

        RequestDelegate next = async (c) =>
        {
            var wrapped = "{\"success\":true,\"data\":{\"n\":1}}";
            await WriteJsonResponse(c, wrapped);
        };

        var logger = new TestLogger<ResponseFormattingMiddleware>();
        var middleware = new ResponseFormattingMiddleware(next, logger);

        await middleware.InvokeAsync(ctx);

        output.Seek(0, SeekOrigin.Begin);
        var final = await new StreamReader(output).ReadToEndAsync();
        Assert.Contains("\"success\":true", final);
        Assert.Contains("\"data\":{\"n\":1}", final);
    }

    [Fact]
    public async Task Skip_For_SSE_ContentType()
    {
        // 场景：SSE 流（text/event-stream）应直接透传，不进行包装
        var ctx = CreateHttpContext("/api/chat/sse");
        var output = new MemoryStream();
        ctx.Response.Body = output;

        RequestDelegate next = async (c) =>
        {
            await WriteJsonResponse(c, "data: message\n\n", 200, "text/event-stream");
        };

        var logger = new TestLogger<ResponseFormattingMiddleware>();
        var middleware = new ResponseFormattingMiddleware(next, logger);

        await middleware.InvokeAsync(ctx);

        output.Seek(0, SeekOrigin.Begin);
        var final = await new StreamReader(output).ReadToEndAsync();
        Assert.Equal("data: message\n\n", final);
    }

    [Fact]
    public async Task Skip_For_OpenApi_Path()
    {
        // 场景：OpenAPI 文档端点需跳过包装以避免破坏文档格式
        var ctx = CreateHttpContext("/openapi");
        var output = new MemoryStream();
        ctx.Response.Body = output;
        RequestDelegate next = async (c) => { await WriteJsonResponse(c, "{\"ok\":true}"); };

        var logger = new TestLogger<ResponseFormattingMiddleware>();
        var middleware = new ResponseFormattingMiddleware(next, logger);

        await middleware.InvokeAsync(ctx);

        output.Seek(0, SeekOrigin.Begin);
        var final = await new StreamReader(output).ReadToEndAsync();
        Assert.Equal("{\"ok\":true}", final);
    }

    [Fact]
    public async Task Skip_For_Stream_Query()
    {
        // 场景：明确指定 stream=true 的查询参数表示需要流式输出，应跳过包装
        var ctx = CreateHttpContext("/api/demo?stream=true");
        ctx.Request.QueryString = new QueryString("?stream=true");
        var output = new MemoryStream();
        ctx.Response.Body = output;

        RequestDelegate next = async (c) => { await WriteJsonResponse(c, "{\"ok\":true}"); };

        var logger = new TestLogger<ResponseFormattingMiddleware>();
        var middleware = new ResponseFormattingMiddleware(next, logger);

        await middleware.InvokeAsync(ctx);

        output.Seek(0, SeekOrigin.Begin);
        var final = await new StreamReader(output).ReadToEndAsync();
        Assert.Equal("{\"ok\":true}", final);
    }

    [Fact]
    public async Task Skip_For_Health_Path()
    {
        // 场景：健康检查端点是外部探活使用，需维持最简单响应体
        var ctx = CreateHttpContext("/healthz");
        var output = new MemoryStream();
        ctx.Response.Body = output;

        RequestDelegate next = async (c) => { await WriteJsonResponse(c, "{\"ok\":true}"); };

        var logger = new TestLogger<ResponseFormattingMiddleware>();
        var middleware = new ResponseFormattingMiddleware(next, logger);

        await middleware.InvokeAsync(ctx);

        output.Seek(0, SeekOrigin.Begin);
        var final = await new StreamReader(output).ReadToEndAsync();
        Assert.Equal("{\"ok\":true}", final);
    }

    [Fact]
    public async Task Handle_TaskCanceled_Without_Crash()
    {
        // 场景：上游主动取消（TaskCanceledException）时，中间件应吞并异常并返回空响应，避免错误日志噪音
        var ctx = CreateHttpContext("/api/demo");
        var output = new MemoryStream();
        ctx.Response.Body = output;

        RequestDelegate next = (c) => throw new TaskCanceledException("test");

        var logger = new TestLogger<ResponseFormattingMiddleware>();
        var middleware = new ResponseFormattingMiddleware(next, logger);

        await middleware.InvokeAsync(ctx);

        output.Seek(0, SeekOrigin.Begin);
        var final = await new StreamReader(output).ReadToEndAsync();
        Assert.Equal(string.Empty, final);
    }

    [Fact]
    public async Task Handle_OperationCanceled_Without_Crash()
    {
        // 场景：上游主动取消（OperationCanceledException）时，同样应稳健处理并返回空响应
        var ctx = CreateHttpContext("/api/demo");
        var output = new MemoryStream();
        ctx.Response.Body = output;

        RequestDelegate next = (c) => throw new OperationCanceledException("test");

        var logger = new TestLogger<ResponseFormattingMiddleware>();
        var middleware = new ResponseFormattingMiddleware(next, logger);

        await middleware.InvokeAsync(ctx);

        output.Seek(0, SeekOrigin.Begin);
        var final = await new StreamReader(output).ReadToEndAsync();
        Assert.Equal(string.Empty, final);
    }
}
