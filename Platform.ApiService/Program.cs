using Platform.ApiService.Services;
using Platform.ApiService.Models;
using MongoDB.Driver;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();

// Add services to the container.
builder.Services.AddProblemDetails();
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // 配置 JSON 序列化选项
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        options.JsonSerializerOptions.WriteIndented = false;
    });

// 配置 CORS - 严格的安全策略
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            // ✅ 开发环境：明确列出允许的源
            policy.WithOrigins(
                    "http://localhost:15001",  // Admin frontend
                    "http://localhost:15002"   // Mobile app
                )
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
        document.Components ??= new();
        document.Components.SecuritySchemes ??= new Dictionary<string, Microsoft.OpenApi.Models.OpenApiSecurityScheme>();
        document.Components.SecuritySchemes["Bearer"] = new()
        {
            Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "JWT Authorization header using the Bearer scheme."
        };
        
        // 添加全局安全要求
        document.SecurityRequirements ??= new List<Microsoft.OpenApi.Models.OpenApiSecurityRequirement>();
        document.SecurityRequirements.Add(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
        {
            [document.Components.SecuritySchemes["Bearer"]] = new string[0]
        });
        
        return Task.CompletedTask;
    });
    
    options.AddOperationTransformer((operation, context, cancellationToken) =>
    {
        // 为需要认证的端点添加安全要求
        var authorizeAttributes = context.Description.ActionDescriptor.EndpointMetadata
            .OfType<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>();
        
        if (authorizeAttributes.Any())
        {
            operation.Security ??= new List<Microsoft.OpenApi.Models.OpenApiSecurityRequirement>();
            operation.Security.Add(new()
            {
                [new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    Reference = new()
                    {
                        Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                        Id = "Bearer"
                    }
                }] = Array.Empty<string>()
            });
        }
        
        return Task.CompletedTask;
    });
});

// Register MongoDB services 
// 添加MongoDB服务  
builder.AddMongoDBClient(connectionName: "mongodb");

// Add HTTP context accessor
builder.Services.AddHttpContextAccessor();

// Register services
// 使用 Scoped 生命周期以支持 MongoDB 操作和请求范围
// 使用接口注册以提高可测试性和解耦

// 多租户上下文（v3.0 新增）
builder.Services.AddScoped<Platform.ServiceDefaults.Services.ITenantContext, Platform.ServiceDefaults.Services.TenantContext>();

// ✅ 注册数据库操作工厂（必须在业务服务之前注册）
builder.Services.AddDatabaseFactory();

// 核心服务
builder.Services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
builder.Services.AddScoped<IPasswordPolicyService, PasswordPolicyService>();  // ✅ 密码策略服务
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<INoticeService, NoticeService>();
builder.Services.AddScoped<IMenuService, MenuService>();
builder.Services.AddScoped<IRuleService, RuleService>();
builder.Services.AddScoped<IUserActivityLogService, UserActivityLogService>();
builder.Services.AddScoped<IMenuAccessService, MenuAccessService>();

// 企业管理服务（v3.0 新增）
builder.Services.AddScoped<ICompanyService, CompanyService>();

// v3.1: 多企业隶属服务
builder.Services.AddScoped<IUserCompanyService, UserCompanyService>();
builder.Services.AddScoped<IJoinRequestService, JoinRequestService>();

// 通用工具服务（v4.0 优化）
builder.Services.AddScoped<IUniquenessChecker, UniquenessChecker>();
builder.Services.AddScoped<IFieldValidationService, FieldValidationService>();
builder.Services.AddScoped<IPhoneValidationService, PhoneValidationService>();

// Captcha service (Scoped - 使用 MongoDB 存储)
builder.Services.AddScoped<ICaptchaService, CaptchaService>();

// Image Captcha service (Scoped - 使用 MongoDB 存储)
builder.Services.AddScoped<IImageCaptchaService, ImageCaptchaService>();



// 数据库初始化服务已迁移到 Platform.DataInitializer 微服务

// Configure JWT authentication
// JWT SecretKey 必须配置，不提供默认值以确保安全
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"];
if (string.IsNullOrWhiteSpace(jwtSecretKey))
{
    throw new InvalidOperationException(
        "JWT SecretKey must be configured. Set it via User Secrets (dotnet user-secrets set 'Jwt:SecretKey' 'your-key'), " +
        "Environment Variables (Jwt__SecretKey), or Azure Key Vault. " +
        "Never commit secrets to source control!");
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

// Add authentication and authorization middleware
app.UseAuthentication();
app.UseAuthorization();

// 活动日志中间件（在认证之后，可以获取用户信息）
app.UseMiddleware<Platform.ApiService.Middleware.ActivityLogMiddleware>();

app.UseCors();

// 响应格式化中间件（在控制器之前）
app.UseMiddleware<Platform.ApiService.Middleware.ResponseFormattingMiddleware>();


// Configure controllers
app.MapControllers();

// Map OpenAPI endpoint
app.MapOpenApi();


// Map default endpoints (includes health checks)
app.MapDefaultEndpoints();

// 数据库初始化已迁移到 Platform.DataInitializer 微服务

await app.RunAsync();
