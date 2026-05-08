using System.Security.Cryptography;
using Microsoft.Extensions.Hosting;
using Scalar.Aspire;
using Aspire.Hosting.Yarp;
using Aspire.Hosting.Yarp.Transforms;

var builder = DistributedApplication.CreateBuilder(args);

// Add the following line to configure the Docker Compose environment
builder.AddDockerComposeEnvironment("env");

var registry = builder.AddContainerRegistry("ghcr", "ghcr.io");


// 🔒 从 Aspire 配置中读取 JWT 设置
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"]
    ?? throw new InvalidOperationException("缺少 JWT 密钥配置项 'Jwt:SecretKey'。");

// 服务间调用 Storage 等卫星服务时使用（与浏览器 JWT 并行）
var internalServiceApiKey = builder.Configuration["InternalService:ApiKey"]
    ?? Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

var openAiEndpoint = builder.Configuration["Parameters:openai-openai-endpoint"]
    ?? throw new InvalidOperationException("缺少 OpenAI 终端配置项 'Parameters:openai-openai-endpoint'。");

var modelName = builder.Configuration["Parameters:Model"]
    ?? throw new InvalidOperationException("缺少 OpenAI 模型配置项 'Parameters:Model'。");

var openai = builder.AddOpenAI("openai").WithEndpoint(openAiEndpoint);

var chat = openai.AddModel("chat", modelName).WithHealthCheck();

var environment = builder.Environment.EnvironmentName;

// Redis
var redis = builder.AddRedis("redis")
 .WithRedisInsight();

// MongoDB - 使用 Aspire 官方集成，自动处理服务发现和连接字符串映射
var mongo = builder.AddMongoDB("mongo")
    // .WithLifetime(ContainerLifetime.Persistent)
    .WithMongoExpress()
    .WithDataVolume()
;

var database = mongo.AddDatabase("database", ("platform-db-" + environment).ToLower());

// 数据初始化服务（一次性任务，完成后自动停止）
var datainitializer = builder.AddProject<Projects.Platform_DataInitializer>("datainitializer")
    .WithReference(database)
    .WaitFor(database)
    .WithEnvironment("Jwt__SecretKey", jwtSecretKey)
    .WithEnvironment("InternalService__ApiKey", internalServiceApiKey);

var apiService = builder.AddProject<Projects.Platform_ApiService>("apiservice")
    .WithHttpEndpoint()
    .WithEnvironment("Jwt__SecretKey", jwtSecretKey)
    .WithEnvironment("InternalService__ApiKey", internalServiceApiKey)
    .WithReference(database)
    .WaitFor(database)
    .WithReference(chat)
    .WithReference(redis)
    .WaitFor(redis)
    ;

var services = new Dictionary<string, IResourceBuilder<IResourceWithServiceDiscovery>>
{
    ["apiservice"] = apiService
};

var adminbuilder = builder.AddJavaScriptApp("admin", "../Platform.Admin")
    .WithBuildScript("npm run build")
    .WithHttpEndpoint(env: "PORT");

// 添加移动端应用 (Expo) - 仅开发环境
if (builder.Environment.IsDevelopment())
{
    builder.AddJavaScriptApp("app", "../Platform.App")
        .WithHttpEndpoint(env: "PORT")
        .WithBuildScript("npx expo export:embed --platform web --output-dir dist");
}

// 微信小程序 (WeChat Mini Program) - 无需 Docker 化部署
// 小程序直接在微信开发者工具中预览/发布，不参与容器编排

var yarp = builder.AddYarp("apigateway")
    .WithHostPort(15000)
    .WithExternalHttpEndpoints()
    .WithStaticFiles()
    .PublishWithStaticFiles(adminbuilder)
    .WithConfiguration(config =>
    {
        if (!builder.ExecutionContext.IsPublishMode)
        {
            config.AddRoute(adminbuilder);
        }

        // 微服务路由配置 - 统一通过/{service}路径访问
        // 使用通配符{**catch-all}捕获所有子路径
        foreach (var service in services)
        {
            config.AddRoute($"/{service.Key}/{{**catch-all}}", service.Value).WithMaxRequestBodySize(-1).WithTransformPathRouteValues("/{**catch-all}");
        }

    })
    .WithContainerRegistry(registry)
;


// 配置 Scalar API 文档
// 使用 .NET 10 原生 OpenAPI 支持
// 默认端点是 /openapi/v1.json
if (builder.Environment.IsDevelopment())
{
    var scalar = builder.AddScalarApiReference();
    foreach (var service in services.Values)
    {
        scalar.WithApiReference(service);
    }
}

var app = builder.Build();
await app.RunAsync();
