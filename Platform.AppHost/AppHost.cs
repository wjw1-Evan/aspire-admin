using Aspire.Hosting.Yarp.Transforms;
using Scalar.Aspire;

var builder = DistributedApplication.CreateBuilder(args);

// 🔒 从 Aspire 配置中读取 JWT 设置
var jwtSecretKey = builder.Configuration.GetSection("Jwt:SecretKey")?? throw new InvalidOperationException("缺少 JWT 密钥配置项 'Jwt:SecretKey'。");

var openAiEndpoint = builder.Configuration["Parameters:openai-openai-endpoint"] ?? throw new InvalidOperationException("缺少 OpenAI 终端配置项 'Parameters:openai-openai-endpoint'。");

var openai = builder.AddOpenAI("openai").WithEndpoint(openAiEndpoint);

var chat = openai.AddModel("chat", "gpt-4o-mini");

var mongo = builder.AddMongoDB("mongo")
    .WithMongoExpress()
    .WithLifetime(ContainerLifetime.Persistent)
    .WithDataVolume();

var mongodb = mongo.AddDatabase("mongodb", "aspire-admin-db");

// 数据初始化服务（一次性任务，完成后自动停止）
var datainitializer = builder.AddProject<Projects.Platform_DataInitializer>("datainitializer")
    .WithReference(mongodb)
    .WithHttpEndpoint();

var services = new Dictionary<string, IResourceBuilder<IResourceWithServiceDiscovery>>
{
    // 核心业务服务（端口不暴露，仅供内部访问）
    // 🔒 通过环境变量传递 JWT 配置
    ["apiservice"] = builder.AddProject<Projects.Platform_ApiService>("apiservice")
        .WithReference(mongodb)
        .WaitForCompletion(datainitializer)
        .WithHttpEndpoint()
        .WithReplicas(1)
        .WithHttpHealthCheck("/health")
        .WithEnvironment("Jwt__SecretKey", jwtSecretKey.Value)
        .WithReference(chat)
};

var yarp = builder.AddYarp("apigateway")
    .WithHostPort(15000)
    .WithConfiguration(config =>
    {
        // 微服务路由配置 - 统一通过/{service}路径访问
        // 使用通配符{**catch-all}捕获所有子路径
        foreach (var service in services)
        {
            config.AddRoute($"/{service.Key}/{{**catch-all}}", config.AddCluster(service.Value))
                .WithTransformPathRouteValues("/{**catch-all}");
        }
    });

builder.AddNpmApp("admin", "../Platform.Admin")
    .WithReference(yarp)
    .WaitFor(yarp)
    .WithEnvironment("BROWSER", "none") // Disable opening browser on npm start
    .WithHttpEndpoint(env: "PORT", port: 15001)
    .WithNpmPackageInstallation()
    .PublishAsDockerFile();

builder.AddNpmApp("app", "../Platform.App")
    .WithReference(yarp)
    .WaitFor(yarp)
    .WithEnvironment("BROWSER", "none") // Disable opening browser on npm start
    .WithHttpEndpoint(env: "PORT", port: 15002)
    .WithNpmPackageInstallation()
    .PublishAsDockerFile();

// 配置 Scalar API 文档
// 使用 .NET 9 原生 OpenAPI 支持
// 默认端点是 /openapi/v1.json
var scalar = builder.AddScalarApiReference();
foreach (var service in services.Values)
{
    scalar.WithApiReference(service);
}

var app = builder.Build();
await app.RunAsync();
