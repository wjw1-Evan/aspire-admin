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
builder.Services.AddControllers();

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
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<INoticeService, NoticeService>();
builder.Services.AddScoped<ITagService, TagService>();
builder.Services.AddScoped<IMenuService, MenuService>();
builder.Services.AddScoped<IRuleService, RuleService>();
builder.Services.AddScoped<IUserActivityLogService, UserActivityLogService>();

// Captcha service (Singleton - 使用内存缓存)
builder.Services.AddSingleton<ICaptchaService, CaptchaService>();

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
builder.Services.AddHealthChecks()
    .AddMongoDb(
        mongodbConnectionString: builder.Configuration.GetConnectionString("mongodb") ?? "mongodb://localhost:27017",
        name: "mongodb",
        timeout: TimeSpan.FromSeconds(3),
        tags: new[] { "database", "mongodb" });

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

// Map health check endpoint
app.MapHealthChecks("/health");

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapDefaultEndpoints();

// 初始化管理员用户和菜单角色
using (var scope = app.Services.CreateScope())
{
    var database = scope.ServiceProvider.GetRequiredService<IMongoDatabase>();
    
    // 修复所有实体的 IsDeleted 字段（一次性修复脚本）
    var fixAllEntities = new FixAllEntitiesIsDeletedField(database);
    await fixAllEntities.FixAsync();
    
    // 初始化管理员用户
    var createAdminUser = new CreateAdminUser(database);
    await createAdminUser.CreateDefaultAdminAsync();
    
    // 初始化菜单和角色
    var initialMenuData = new InitialMenuData(database);
    await initialMenuData.InitializeAsync();
}

await app.RunAsync();
