using Platform.ApiService.Services;
using Platform.ApiService.Models;
using Platform.ApiService.Scripts;
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

// 配置 CORS - 根据环境区分安全策略
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            // 开发环境：允许所有源
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        }
        else
        {
            // 生产环境：限制允许的源
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
builder.Services.AddOpenApi();

// Register MongoDB services 
// 添加MongoDB服务  
builder.AddMongoDBClient(connectionName: "mongodb");

// Add HTTP context accessor
builder.Services.AddHttpContextAccessor();

// Add memory cache for captcha storage
builder.Services.AddMemoryCache();

// Register services
// 使用 Scoped 生命周期以支持 MongoDB 操作和请求范围
// 使用接口注册以提高可测试性和解耦

// 多租户上下文（v3.0 新增）
builder.Services.AddScoped<ITenantContext, TenantContext>();

// 核心服务
builder.Services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<INoticeService, NoticeService>();
builder.Services.AddScoped<ITagService, TagService>();
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

// Captcha service (Singleton - 使用内存缓存)
builder.Services.AddSingleton<ICaptchaService, CaptchaService>();

// 数据库初始化服务（v5.0 新增）
builder.Services.AddSingleton<IDistributedLockService, DistributedLockService>();
builder.Services.AddScoped<IDatabaseInitializerService, DatabaseInitializerService>();

// Configure JWT authentication
// JWT SecretKey 必须配置，不提供默认值以确保安全
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"] 
    ?? throw new InvalidOperationException("JWT SecretKey must be configured. Set it in appsettings.json or environment variables.");
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

// 添加健康检查
builder.Services.AddHealthChecks();

var app = builder.Build();

// Configure the HTTP request pipeline.
// 全局异常处理（最外层）
app.UseMiddleware<Platform.ApiService.Middleware.GlobalExceptionMiddleware>();

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

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Map default endpoints (includes health checks)
app.MapDefaultEndpoints();

// v5.0: 数据库初始化（使用分布式锁保护，多实例安全）
using (var scope = app.Services.CreateScope())
{
    var initializer = scope.ServiceProvider.GetRequiredService<IDatabaseInitializerService>();
    await initializer.InitializeAsync();
}

await app.RunAsync();
