using Microsoft.AspNetCore.OpenApi;
using Platform.DataPlatform.Extensions;
using Platform.DataPlatform.Services;
// using Platform.ServiceDefaults.Extensions; // 暂时注释，避免编译错误

var builder = WebApplication.CreateBuilder(args);

// 添加服务默认配置
builder.AddServiceDefaults();

// 添加通用服务
// builder.Services.AddCommonServices(); // 暂时注释，避免编译错误

// 添加服务到容器
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// 添加 OpenAPI 支持
builder.Services.AddOpenApi();

// 添加 MongoDB 客户端（使用 Aspire 方式）
builder.AddMongoDBClient("mongodb");

// ClickHouse 已替换为 MongoDB，不再需要 ClickHouse 服务

// 添加数据中台服务
builder.Services.AddDataPlatformServices();

// 添加 CORS 支持
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// 配置 HTTP 请求管道
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseCors();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();

// 映射控制器
app.MapControllers();

// 映射默认端点（健康检查等）
app.MapDefaultEndpoints();

// 映射 OpenAPI 端点
app.MapOpenApi();

app.Run();