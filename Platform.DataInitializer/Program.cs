using Platform.DataInitializer.Services;
using Platform.DataInitializer.Models;
using Platform.DataInitializer.Scripts;
using MongoDB.Driver;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();

// Add services to the container.
builder.Services.AddProblemDetails();

// Register MongoDB services 
builder.AddMongoDBClient(connectionName: "mongodb");

// Register services
builder.Services.AddScoped<IDataInitializerService, DataInitializerService>();


var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();

// Add health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy", service = "DataInitializer" }));

// Add initialization endpoint
app.MapPost("/initialize", async (IDataInitializerService initializer) =>
{
    try
    {
        await initializer.InitializeAsync();
        return Results.Ok(new { message = "数据初始化完成" });
    }
    catch (Exception ex)
    {
        return Results.Problem($"数据初始化失败: {ex.Message}");
    }
});

// Map default endpoints (includes health checks)
app.MapDefaultEndpoints();

// 自动执行数据初始化
using (var scope = app.Services.CreateScope())
{
    var initializer = scope.ServiceProvider.GetRequiredService<IDataInitializerService>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    
    try
    {
        logger.LogInformation("🚀 DataInitializer 微服务启动，开始执行数据初始化...");
        await initializer.InitializeAsync();
        logger.LogInformation("✅ 数据初始化完成，DataInitializer 微服务将停止运行");
        
        // 初始化完成后，优雅地停止服务
        logger.LogInformation("🛑 DataInitializer 微服务已完成任务，正在停止...");
        return; // 直接返回，不执行 app.RunAsync()
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "❌ 数据初始化失败，DataInitializer 微服务将停止运行");
        return; // 即使失败也停止服务
    }
}


