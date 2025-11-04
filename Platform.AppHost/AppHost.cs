using Aspire.Hosting.Yarp.Transforms;
using Scalar.Aspire;

var builder = DistributedApplication.CreateBuilder(args);

// 🔒 从 Aspire 配置中读取 JWT 设置
var jwtSecretKey = builder.Configuration.GetSection("Jwt:SecretKey");

var mongo = builder.AddMongoDB("mongo")
    .WithMongoExpress(config => config.WithLifetime(ContainerLifetime.Persistent))
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
};

var yarp = builder.AddYarp("apigateway")
    .WithHostPort(15000)
    .WithConfiguration(config =>
    {
        // 微服务路由配置 - 统一通过/{service}路径访问
        // 使用通配符{**catch-all}捕获所有子路径
        foreach (var service in services)
        {
            var route = $"/{service.Key}/{{**catch-all}}";
            config.AddRoute(route, config.AddCluster(service.Value))
                .WithTransformPathRouteValues("/api/{**catch-all}");
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

Console.WriteLine("🔨 开始构建 Aspire 应用...");
var app = builder.Build();
Console.WriteLine("✅ Aspire 应用构建完成，开始运行...");
await app.RunAsync();
