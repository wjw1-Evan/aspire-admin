
using Microsoft.OpenApi;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Security.Cryptography;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.Options;
using Platform.ApiService.Options;
using Platform.ApiService.Services;


var builder = WebApplication.CreateBuilder(args);

// 上传大小限制（可按需调整）
const long MaxUploadBytes = 5L * 1024 * 1024 * 1024; // 5GB

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
builder.Services.AddControllers()
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
            var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? new[]
            {
                "http://localhost:15000",  // API网关
                "http://localhost:15001",  // 管理后台
                "http://localhost:15002",  // 移动应用
            };

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
                { bearerSchemeReference, new List<string>() }
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
                    { bearerSchemeReference, new List<string>() }
                };
                operation.Security.Add(securityRequirement);
            }
        }

        return Task.CompletedTask;
    });
});

// Register MongoDB services
// 添加MongoDB服务
builder.AddMongoDBClient(connectionName: "mongodb");

// 添加OpenAI服务
// 添加OpenAI服务
builder.AddOpenAIClient(connectionName: "chat");

// 添加 Redis 服务 (SSE Backplane)
builder.AddRedisClient("redis");

// Add HTTP context accessor
builder.Services.AddHttpContextAccessor();

// Add HTTP client factory (for downloading fonts from network)
builder.Services.AddHttpClient();

// 配置 AI 选项
builder.Services.Configure<AiCompletionOptions>(
    builder.Configuration.GetSection(AiCompletionOptions.SectionName));

// 多租户上下文（v3.0 新增）
builder.Services.AddScoped<Platform.ServiceDefaults.Services.ITenantContext, Platform.ServiceDefaults.Services.TenantContext>();

// ✅ 注册数据库操作工厂（必须在业务服务之前注册）
builder.Services.AddDatabaseFactory();

// 注册 GridFS 服务（用于文件存储，需要直接访问 IMongoDatabase）
builder.Services.AddScoped<Platform.ServiceDefaults.Services.IGridFSService, Platform.ServiceDefaults.Services.GridFSService>();

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
// ✅ 自动注册所有业务服务（自动扫描并注册包含 "Services" 的命名空间下的所有服务）
builder.Services.AddBusinessServices();

// 手动注册拆分的 Service，确保它们被正确注入（虽然 AddBusinessServices 可能已经涵盖，但显式注册更安全）
builder.Services.AddScoped<IUserRoleService, UserRoleService>();
builder.Services.AddScoped<IUserOrganizationService, UserOrganizationService>();

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
builder.Services.AddScoped<Platform.ApiService.Services.IChatBroadcaster, Platform.ApiService.Services.ChatBroadcaster>();

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
                var path = context.HttpContext.Request.Path;

                // 其他端点：自定义挑战响应，提供更友好的错误信息
                context.HandleResponse();
                context.Response.StatusCode = 401;
                context.Response.ContentType = "application/json";

                var errorMessage = "未提供有效的认证令牌或令牌格式错误。请确保在请求头中包含 'Authorization: Bearer {token}'。";
                var response = System.Text.Json.JsonSerializer.Serialize(new
                {
                    error = "UNAUTHORIZED",
                    message = errorMessage,
                    traceId = context.HttpContext.TraceIdentifier
                });

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

// 全局异常处理（最外层）
app.UseExceptionHandler();

// CORS 必须在认证之前执行，确保 401/403 等响应也包含跨域头
app.UseCors();

// Add authentication and authorization middleware
app.UseAuthentication();
app.UseAuthorization();

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

// 数据库初始化已迁移到 Platform.DataInitializer 微服务

await app.RunAsync();
