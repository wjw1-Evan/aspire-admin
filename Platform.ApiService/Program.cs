
using Microsoft.OpenApi;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Options;
using Platform.ApiService.Options;
using Platform.ApiService.Services;
using Platform.ApiService.Extensions;
using Platform.ApiService.Middleware;

var builder = WebApplication.CreateBuilder(args);

// ──────────────────────────────────────────────
// 1. 全局配置
// ──────────────────────────────────────────────

// JSON 序列化选项（全局复用，用于 JWT 事件、异常处理等非 Controller 场景）
var jsonOptions = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    WriteIndented = false,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
};
jsonOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));

// 上传大小限制
const long MaxUploadBytes = 10L * 1024 * 1024 * 1024; // 10GB
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = MaxUploadBytes);
builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = MaxUploadBytes);

// ──────────────────────────────────────────────
// 2. Aspire 服务默认值 & 客户端集成
// ──────────────────────────────────────────────

builder.AddServiceDefaults();                       // OpenTelemetry, 健康检查, 服务发现, HttpClient 弹性
builder.AddPlatformDatabase("mongodb");             // IMongoClient, IMongoDatabase, PlatformDbContext, IDataFactory, IAuditService
builder.AddOpenAIClient(connectionName: "chat");    // OpenAI 客户端

// ──────────────────────────────────────────────
// 3. MVC & API 行为
// ──────────────────────────────────────────────

builder.Services.AddProblemDetails();
builder.Services.AddResponseCompression(o => o.EnableForHttps = true);
builder.Services.AddOutputCache();

builder.Services.AddControllers(options =>
{
    options.Filters.Add<Platform.ApiService.Filters.ApiResponseWrapperFilter>();
    options.Filters.Add<Platform.ApiService.Filters.BusinessExceptionFilter>();
})
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(e => e.Value?.Errors.Count > 0)
                .ToDictionary(
                    kvp => char.ToLowerInvariant(kvp.Key[0]) + kvp.Key[1..],
                    kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage).ToArray()
                );

            return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(new
            {
                success = false,
                errorMessage = errors.Values.FirstOrDefault()?.FirstOrDefault() ?? "请求参数验证失败",
                errorCode = "VALIDATION_ERROR",
                errors,
                timestamp = DateTime.UtcNow,
                traceId = context.HttpContext.TraceIdentifier
            });
        };
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.WriteIndented = false;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
    });

// ──────────────────────────────────────────────
// 4. CORS
// ──────────────────────────────────────────────

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
            ?? (builder.Environment.IsDevelopment()
                ? ["http://localhost:15000", "http://localhost:15001", "http://localhost:15002", "http://localhost:15003"]
                : throw new InvalidOperationException("AllowedOrigins must be configured in production"));

        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// ──────────────────────────────────────────────
// 5. OpenAPI 文档
// ──────────────────────────────────────────────

builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Info = new()
        {
            Title = "Platform API",
            Version = "v1",
            Description = "Aspire Admin Platform API - 企业级管理平台后端服务",
            Contact = new() { Name = "Platform Team", Email = "support@platform.com" }
        };

        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes.TryAdd("Bearer", new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "JWT Authorization header using the Bearer scheme."
        });

        var bearerRef = new OpenApiSecuritySchemeReference("Bearer", document, externalResource: null);
        document.Security ??= [];
        if (!document.Security.Any(r => r.ContainsKey(bearerRef)))
            document.Security.Add(new OpenApiSecurityRequirement { { bearerRef, [] } });

        return Task.CompletedTask;
    });

    options.AddOperationTransformer((operation, context, cancellationToken) =>
    {
        if (context.Description.ActionDescriptor.EndpointMetadata
            .OfType<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>().Any())
        {
            var bearerRef = new OpenApiSecuritySchemeReference("Bearer", context.Document, externalResource: null);
            operation.Security ??= [];
            if (!operation.Security.Any(r => r.ContainsKey(bearerRef)))
                operation.Security.Add(new OpenApiSecurityRequirement { { bearerRef, [] } });
        }
        return Task.CompletedTask;
    });
});

// ──────────────────────────────────────────────
// 6. 业务服务注册
// ──────────────────────────────────────────────

// Options
builder.Services.Configure<AiCompletionOptions>(builder.Configuration.GetSection(AiCompletionOptions.SectionName));
builder.Services.Configure<Platform.ApiService.Options.GlobalAuthenticationOptions>(builder.Configuration.GetSection(Platform.ApiService.Options.GlobalAuthenticationOptions.SectionName));
builder.Services.Configure<IoTDataCollectionOptions>(builder.Configuration.GetSection(IoTDataCollectionOptions.SectionName));



// IoT 数据采集
builder.Services.AddSingleton<HttpIoTDataFetchClient>();
builder.Services.AddSingleton<IIoTDataFetchClient>(sp => sp.GetRequiredService<HttpIoTDataFetchClient>());
builder.Services.AddScoped<SimpleHttpDataCollector>();
builder.Services.AddScoped<IoTDataCollector>();
builder.Services.AddScoped<IoTGatewayStatusChecker>();

// 后台任务
builder.Services.AddHostedService<IoTDataCollectionHostedService>();
builder.Services.AddHostedService<IoTGatewayStatusCheckHostedService>();
builder.Services.AddHostedService<CloudStorageMaintenanceService>();

// 自动扫描注册所有业务服务（接口 → 实现）
builder.Services.AddBusinessServices();

// 需要覆盖自动注册或使用特殊生命周期的服务
builder.Services.AddSingleton<IUserActivityLogQueue, UserActivityLogQueue>();
builder.Services.AddHostedService<Platform.ApiService.BackgroundServices.UserActivityLogBackgroundWorker>();
builder.Services.AddScoped<IApproverResolver, UserApproverResolver>();
builder.Services.AddScoped<IApproverResolver, RoleApproverResolver>();
builder.Services.AddScoped<IApproverResolver, FormFieldApproverResolver>();
builder.Services.AddScoped<IApproverResolverFactory, ApproverResolverFactory>();
builder.Services.AddScoped<IWorkflowGraphValidator, WorkflowGraphValidator>();
builder.Services.AddScoped<IFieldValidationService, FieldValidationService>();
builder.Services.AddSingleton<IChatSseConnectionManager, ChatSseConnectionManager>();
builder.Services.AddSingleton<IPasswordEncryptionService, PasswordEncryptionService>();

// ──────────────────────────────────────────────
// 7. 认证 & 授权
// ──────────────────────────────────────────────

var jwtSecretKey = builder.Configuration["Jwt:SecretKey"];
if (string.IsNullOrWhiteSpace(jwtSecretKey))
{
    if (builder.Environment.IsDevelopment())
    {
        jwtSecretKey = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        builder.Logging.AddFilter("Microsoft", LogLevel.Warning);
        builder.Logging.AddFilter("System", LogLevel.Warning);
        builder.Logging.AddFilter("Platform.ApiService", LogLevel.Information);
        Console.WriteLine("[DEV] Jwt:SecretKey 未配置，已生成一次性密钥用于开发/测试环境。切勿在生产环境使用。");
    }
    else
    {
        throw new InvalidOperationException(
            "JWT SecretKey must be configured. Set via User Secrets, Environment Variables (Jwt__SecretKey), or Azure Key Vault.");
    }
}

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "Platform.ApiService";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "Platform.Web";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtSecretKey)),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            RequireExpirationTime = true,
            RequireSignedTokens = true
        };

        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = _ => Task.CompletedTask,
            OnChallenge = context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = 401;
                context.Response.ContentType = "application/json";

                var errorMessage = "未提供有效的认证令牌或令牌已过期。请重新登录。";
                return context.Response.WriteAsync(JsonSerializer.Serialize(new
                {
                    success = false,
                    errorMessage,
                    errorCode = "UNAUTHORIZED",
                    timestamp = DateTime.UtcNow,
                    traceId = context.HttpContext.TraceIdentifier,
                    error = "UNAUTHORIZED",
                    message = errorMessage
                }, jsonOptions));
            },
            OnForbidden = context =>
            {
                context.Response.StatusCode = 403;
                context.Response.ContentType = "application/json";

                return context.Response.WriteAsync(JsonSerializer.Serialize(new
                {
                    success = false,
                    errorMessage = "您只是此资源的访问者，无权进行操作 (403 Forbidden)",
                    errorCode = "FORBIDDEN",
                    timestamp = DateTime.UtcNow,
                    traceId = context.HttpContext.TraceIdentifier
                }, jsonOptions));
            }
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddHsts(o =>
{
    o.Preload = true;
    o.IncludeSubDomains = true;
    o.MaxAge = TimeSpan.FromDays(365);
});

// ──────────────────────────────────────────────
// 8. 构建 & 中间件管道
// ──────────────────────────────────────────────

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
    app.UseHsts();
}

app.UseResponseCompression();
app.UseOutputCache();

// 全局异常处理
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exception = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>()?.Error;
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";

        await context.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            success = false,
            errorMessage = "系统内部错误，请稍后重试",
            errorCode = "INTERNAL_SERVER_ERROR",
            details = app.Environment.IsDevelopment() ? exception?.Message : null,
            timestamp = DateTime.UtcNow,
            traceId = context.TraceIdentifier
        }, jsonOptions));
    });
});

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseGlobalAuthentication();
app.UseMiddleware<ActivityLogMiddleware>();
app.UseMiddleware<ResponseFormattingMiddleware>();

// 端点映射
app.MapControllers();
app.MapOpenApi();
app.MapDefaultEndpoints();

// 404 兜底
app.MapFallback(async (HttpContext context) =>
{
    context.Response.StatusCode = 404;
    context.Response.ContentType = "application/json";

    await context.Response.WriteAsync(JsonSerializer.Serialize(new
    {
        success = false,
        errorMessage = $"未找到请求的资源: {context.Request.Path}",
        errorCode = "NOT_FOUND",
        timestamp = DateTime.UtcNow,
        traceId = context.TraceIdentifier
    }, jsonOptions));
});

await app.RunAsync();
