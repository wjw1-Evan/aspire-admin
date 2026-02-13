
using Microsoft.EntityFrameworkCore;
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
using Platform.ServiceDefaults.Services;
using MongoDB.Driver;


var builder = WebApplication.CreateBuilder(args);

// 定义全局复用的 JSON 序列化选项（性能优化）
var jsonOptions = new JsonSerializerOptions
{
    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    WriteIndented = false,
    DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
};
// 序列化枚举为 camelCase 字符串
jsonOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));

// 上传大小限制（可按需调整）
const long MaxUploadBytes = 10L * 1024 * 1024 * 1024; // 10GB

// Kestrel 请求大小限制
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = MaxUploadBytes;
});

// 上传表单大小限制
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = MaxUploadBytes;
});

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();

// Add services to the container.
builder.Services.AddProblemDetails();

// ✅ 性能优化：启用响应压缩
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
});

// ✅ 性能优化：启用输出缓存
builder.Services.AddOutputCache();

builder.Services.AddControllers(options =>
{
    // ✅ 性能优化：使用全局过滤器进行响应包裹，性能优于中间件
    options.Filters.Add<Platform.ApiService.Filters.ApiResponseWrapperFilter>();
})
    .ConfigureApiBehaviorOptions(options =>
    {
        // 统一模型验证错误响应格式
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(e => e.Value?.Errors.Count > 0)
                .ToDictionary(
                    kvp => char.ToLowerInvariant(kvp.Key[0]) + kvp.Key[1..], // camelCase key
                    kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage).ToArray()
                );

            var firstError = errors.Values.FirstOrDefault()?.FirstOrDefault() ?? "请求参数验证失败";

            var result = new
            {
                success = false,
                errorMessage = firstError,
                errorCode = "VALIDATION_ERROR",
                errors = errors,
                timestamp = DateTime.UtcNow,
                traceId = context.HttpContext.TraceIdentifier
            };

            return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(result);
        };
    })
    .AddJsonOptions(options =>
    {
        // 配置 JSON 序列化选项
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.WriteIndented = false;
        // 序列化枚举为 camelCase 字符串，便于前端读取/提交
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
    });

// 配置 CORS - 严格的安全策略
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            // ✅ 开发环境：从配置读取允许的源，如果未配置则使用默认值
            var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ??
            [
                "http://localhost:15000",  // API网关
                "http://localhost:15001",  // 管理后台
                "http://localhost:15002",  // 移动应用
                "http://localhost:15003",  // 微信小程序
            ];

            policy.WithOrigins(allowedOrigins)
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials();  // ✅ 支持凭证
        }
        else
        {
            // 生产环境：从配置读取允许的源
            var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>()
                ?? throw new InvalidOperationException("AllowedOrigins must be configured in production");

            policy.WithOrigins(allowedOrigins)
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials();
        }
    });
});


// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi(options =>
{
    // 启用 XML 文档注释
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        // 设置 API 文档信息
        document.Info = new()
        {
            Title = "Platform API",
            Version = "v1",
            Description = "Aspire Admin Platform API - 企业级管理平台后端服务",
            Contact = new()
            {
                Name = "Platform Team",
                Email = "support@platform.com"
            }
        };

        // 添加 JWT 认证配置
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        if (!document.Components.SecuritySchemes.ContainsKey("Bearer"))
        {
            document.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                Description = "JWT Authorization header using the Bearer scheme."
            };
        }

        var bearerSchemeReference = new OpenApiSecuritySchemeReference("Bearer", document, externalResource: null);

        document.Security ??= [];
        if (!document.Security.Any(requirement => requirement.ContainsKey(bearerSchemeReference)))
        {
            var securityRequirement = new OpenApiSecurityRequirement
            {
                { bearerSchemeReference, [] } // 简化集合初始化 new List<string>() -> []
            };
            document.Security.Add(securityRequirement);
        }

        return Task.CompletedTask;
    });

    options.AddOperationTransformer((operation, context, cancellationToken) =>
    {
        // 为需要认证的端点添加安全要求
        var authorizeAttributes = context.Description.ActionDescriptor.EndpointMetadata
            .OfType<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>();

        if (authorizeAttributes.Any())
        {
            var bearerSchemeReference = new OpenApiSecuritySchemeReference("Bearer", context.Document, externalResource: null);

            operation.Security ??= [];
            if (!operation.Security.Any(requirement => requirement.ContainsKey(bearerSchemeReference)))
            {
                var securityRequirement = new OpenApiSecurityRequirement
                {
                    { bearerSchemeReference, [] } // 简化集合初始化 new List<string>() -> []
                };
                operation.Security.Add(securityRequirement);
            }
        }

        return Task.CompletedTask;
    });
});

// ✅ 使用 Aspire 统一配置注册平台所有数据库相关服务（Client, Database, DbContext）
// 内部会自动从 "mongodb" 连接字符串中提取数据库名称 (aspire-admin-db)
builder.AddPlatformDatabase("mongodb");

// ✅ 配置 MongoDB 全局约定：忽略额外字段，避免新旧字段不匹配导致崩溃
var pack = new MongoDB.Bson.Serialization.Conventions.ConventionPack
{
    new MongoDB.Bson.Serialization.Conventions.IgnoreExtraElementsConvention(true),
    new MongoDB.Bson.Serialization.Conventions.CamelCaseElementNameConvention()
};
MongoDB.Bson.Serialization.Conventions.ConventionRegistry.Register("PlatformConventions", pack, t => true);

// 添加OpenAI服务
// 添加OpenAI服务
builder.AddOpenAIClient(connectionName: "chat");


// Add HTTP context accessor
builder.Services.AddHttpContextAccessor();

// Add HTTP client factory (for downloading fonts from network)
builder.Services.AddHttpClient();

// 配置 AI 选项
builder.Services.Configure<AiCompletionOptions>(
    builder.Configuration.GetSection(AiCompletionOptions.SectionName));

// 配置全局身份验证选项
builder.Services.Configure<Platform.ApiService.Options.GlobalAuthenticationOptions>(
    builder.Configuration.GetSection(Platform.ApiService.Options.GlobalAuthenticationOptions.SectionName));

// 多租户上下文（v3.0 新增）
builder.Services.AddScoped<Platform.ServiceDefaults.Services.ITenantContext, Platform.ServiceDefaults.Services.TenantContext>();

// 🚀 注册优化的数据工厂（使用扩展方法）
builder.Services.AddDatabaseFactory();

// 注册文件存储工厂（支持 GridFS/Azure Blob/S3 等）
builder.Services.AddScoped<Platform.ServiceDefaults.Services.IFileStorageFactory, Platform.ServiceDefaults.Services.GridFSFileStorage>();

// IoT 数据采集配置与后台任务
builder.Services.Configure<IoTDataCollectionOptions>(
    builder.Configuration.GetSection(IoTDataCollectionOptions.SectionName));
// 注册 HTTP 拉取客户端（未启用时不会采集）
builder.Services.AddSingleton<HttpIoTDataFetchClient>();
builder.Services.AddSingleton<IIoTDataFetchClient>(sp =>
{
    var opts = sp.GetRequiredService<IOptionsMonitor<IoTDataCollectionOptions>>();
    var useHttp = opts.CurrentValue.HttpFetch?.Enabled == true;
    return useHttp
        ? sp.GetRequiredService<HttpIoTDataFetchClient>()
        : sp.GetRequiredService<HttpIoTDataFetchClient>(); // 未启用时返回空结果
});
builder.Services.AddScoped<SimpleHttpDataCollector>();
builder.Services.AddScoped<IoTDataCollector>();
builder.Services.AddHostedService<IoTDataCollectionHostedService>();

// 网关状态检测服务
builder.Services.AddScoped<IoTGatewayStatusChecker>();
builder.Services.AddHostedService<IoTGatewayStatusCheckHostedService>();

// 云存储维护服务
builder.Services.AddHostedService<CloudStorageMaintenanceService>();

// ✅ 自动注册所有业务服务（自动扫描并注册包含 "Services" 的命名空间下的所有服务）
builder.Services.AddBusinessServices();

// ✅ 性能优化：异步活动日志处理
// 注意：必须在 AddBusinessServices 之后注册，以确保 Singleton 覆盖自动注册的 Scoped
builder.Services.AddSingleton<Platform.ApiService.Services.IUserActivityLogQueue, Platform.ApiService.Services.UserActivityLogQueue>();
builder.Services.AddHostedService<Platform.ApiService.BackgroundServices.UserActivityLogBackgroundWorker>();

// 原有的显式注册已由 AddBusinessServices 自动覆盖，此处清理冗余代码

// 注册审批人解析器（支持多个实现）
builder.Services.AddScoped<IApproverResolver, UserApproverResolver>();
builder.Services.AddScoped<IApproverResolver, RoleApproverResolver>();
builder.Services.AddScoped<IApproverResolver, FormFieldApproverResolver>();
builder.Services.AddScoped<IApproverResolverFactory, ApproverResolverFactory>();

// 注册流程图形校验服务
builder.Services.AddScoped<IWorkflowGraphValidator, WorkflowGraphValidator>();

// 注册字段验证服务
builder.Services.AddScoped<Platform.ApiService.Services.IFieldValidationService, Platform.ApiService.Services.FieldValidationService>();

// 注册 SSE 相关服务（简化版：直接通过用户ID发送消息，无需订阅机制）
builder.Services.AddSingleton<Platform.ApiService.Services.IChatSseConnectionManager, Platform.ApiService.Services.ChatSseConnectionManager>();
// 注册密码传输加密服务 (RSA) 为单例
builder.Services.AddSingleton<Platform.ApiService.Services.IPasswordEncryptionService, Platform.ApiService.Services.PasswordEncryptionService>();

// Configure JWT authentication
// JWT SecretKey 必须配置，不提供默认值以确保安全
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"];
if (string.IsNullOrWhiteSpace(jwtSecretKey))
{
    if (builder.Environment.IsDevelopment())
    {
        // 开发环境：生成一次性密钥，避免本地/测试环境阻塞启动（不用于生产）
        jwtSecretKey = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        builder.Logging.AddFilter("Microsoft", LogLevel.Warning);
        builder.Logging.AddFilter("System", LogLevel.Warning);
        builder.Logging.AddFilter("Platform.ApiService", LogLevel.Information);
        Console.WriteLine("[DEV] Jwt:SecretKey 未配置，已生成一次性密钥用于开发/测试环境。切勿在生产环境使用。");
    }
    else
    {
        throw new InvalidOperationException(
            "JWT SecretKey must be configured. Set it via User Secrets (dotnet user-secrets set 'Jwt:SecretKey' 'your-key'), " +
            "Environment Variables (Jwt__SecretKey), or Azure Key Vault. " +
            "Never commit secrets to source control!");
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
            OnAuthenticationFailed = context =>
            {
                // Token 格式错误（没有点）通常是客户端没有提供有效的 token
                // 这种情况在未认证请求中是正常的，由 OnChallenge 处理
                // 这里只处理真正的认证错误（如 token 过期、签名无效等）
                return Task.CompletedTask;
            },
            OnChallenge = context =>
            {
                // 自定义挑战响应，提供标准的错误信息
                context.HandleResponse();
                context.Response.StatusCode = 401;
                context.Response.ContentType = "application/json";

                var errorMessage = "未提供有效的认证令牌或令牌已过期。请重新登录。";

                // 兼容旧代码的 error 字段，同时提供新的标准字段
                var result = new
                {
                    success = false,
                    errorMessage = errorMessage,
                    errorCode = "UNAUTHORIZED",
                    timestamp = DateTime.UtcNow,
                    traceId = context.HttpContext.TraceIdentifier,
                    // 兼容字段
                    error = "UNAUTHORIZED",
                    message = errorMessage
                };

                // 使用全局复用的 jsonOptions
                var response = JsonSerializer.Serialize(result, jsonOptions);

                return context.Response.WriteAsync(response);
            },
            OnForbidden = context =>
            {
                context.Response.StatusCode = 403;
                context.Response.ContentType = "application/json";

                var result = new
                {
                    success = false,
                    errorMessage = "您只是此资源的访问者，无权进行操作 (403 Forbidden)",
                    errorCode = "FORBIDDEN",
                    timestamp = DateTime.UtcNow,
                    traceId = context.HttpContext.TraceIdentifier
                };

                // 使用全局复用的 jsonOptions
                var response = JsonSerializer.Serialize(result, jsonOptions);

                return context.Response.WriteAsync(response);
            }
        };
    });

builder.Services.AddAuthorization();

// ✅ 配置 HSTS (HTTP Strict Transport Security)
builder.Services.AddHsts(options =>
{
    options.Preload = true;
    options.IncludeSubDomains = true;
    options.MaxAge = TimeSpan.FromDays(365);
});

// 添加健康检查
builder.Services.AddHealthChecks();

var app = builder.Build();

// Configure the HTTP request pipeline.
// ✅ HTTPS 强制重定向（生产环境）
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
    app.UseHsts();
}

// ✅ 性能优化：启用响应压缩（应尽早放置在管道中）
app.UseResponseCompression();

// ✅ 性能优化：启用输出缓存
app.UseOutputCache();

// 全局异常处理（最外层兜底）
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exceptionHandlerPathFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();
        var exception = exceptionHandlerPathFeature?.Error;

        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";

        var result = new
        {
            success = false,
            errorMessage = "系统内部错误，请稍后重试", // 生产环境不显示具体堆栈
            errorCode = "INTERNAL_SERVER_ERROR",
            // 开发环境可附加详情
            details = app.Environment.IsDevelopment() ? exception?.Message : null,
            timestamp = DateTime.UtcNow,
            traceId = context.TraceIdentifier
        };

        // 使用全局复用的 jsonOptions
        var response = JsonSerializer.Serialize(result, jsonOptions);

        await context.Response.WriteAsync(response);
    });
});

// CORS 必须在认证之前执行，确保 401/403 等响应也包含跨域头
app.UseCors();

// Add authentication and authorization middleware
app.UseAuthentication();
app.UseAuthorization();

// Add global authentication middleware for additional security
app.UseGlobalAuthentication();

// 活动日志中间件（在认证之后，可以获取用户信息）
app.UseMiddleware<Platform.ApiService.Middleware.ActivityLogMiddleware>();

// 响应格式化中间件（在控制器之前）
app.UseMiddleware<Platform.ApiService.Middleware.ResponseFormattingMiddleware>();

// Configure controllers
app.MapControllers();
// SignalR 已完全移除，所有实时通信已迁移到 SSE 或 API 轮询

// Map OpenAPI endpoint
app.MapOpenApi();

// Map default endpoints (includes health checks)
app.MapDefaultEndpoints();

// 统一处理 404 Not Found (必须放在最后)
app.MapFallback(async (HttpContext context) =>
{
    context.Response.StatusCode = 404;
    context.Response.ContentType = "application/json";

    var result = new
    {
        success = false,
        errorMessage = $"未找到请求的资源: {context.Request.Path}",
        errorCode = "NOT_FOUND",
        timestamp = DateTime.UtcNow,
        traceId = context.TraceIdentifier
    };

    // 使用全局复用的 jsonOptions
    var response = JsonSerializer.Serialize(result, jsonOptions);

    await context.Response.WriteAsync(response);
});

// 数据库初始化已迁移到 Platform.DataInitializer 微服务

await app.RunAsync();
