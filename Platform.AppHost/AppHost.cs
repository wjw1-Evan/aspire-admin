
using Aspire.Hosting.Yarp.Transforms;
using Scalar.Aspire;

var builder = DistributedApplication.CreateBuilder(args);

// 🔒 从 Aspire 配置中读取 JWT 设置
var jwtConfig = builder.Configuration.GetSection("Jwt");
var jwtSecretKey = jwtConfig["SecretKey"];
var jwtIssuer = jwtConfig["Issuer"] ?? "Platform.ApiService";
var jwtAudience = jwtConfig["Audience"] ?? "Platform.Web";
var jwtExpirationMinutes = jwtConfig["ExpirationMinutes"] ?? "60";
var jwtRefreshTokenExpirationDays = jwtConfig["RefreshTokenExpirationDays"] ?? "7";

// 验证 JWT SecretKey 是否已配置
if (string.IsNullOrWhiteSpace(jwtSecretKey))
{
    throw new InvalidOperationException(
        "JWT SecretKey must be configured in AppHost. Set it via:\n" +
        "  - User Secrets: dotnet user-secrets set 'Jwt:SecretKey' 'your-secret-key' (in Platform.AppHost directory)\n" +
        "  - Environment Variables: Jwt__SecretKey='your-secret-key'\n" +
        "  - Azure Key Vault or other configuration providers\n" +
        "Never commit real secrets to source control!");
}

var mongo = builder.AddMongoDB("mongo").WithMongoExpress(config=>{ 
    config.WithLifetime(ContainerLifetime.Persistent);
}).WithLifetime(ContainerLifetime.Persistent).WithDataVolume();

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
        .WithHttpEndpoint().WithReplicas(3)
        .WithHttpHealthCheck("/health")
        .WithEnvironment("Jwt__SecretKey", jwtSecretKey)
        .WithEnvironment("Jwt__Issuer", jwtIssuer)
        .WithEnvironment("Jwt__Audience", jwtAudience)
        .WithEnvironment("Jwt__ExpirationMinutes", jwtExpirationMinutes)
        .WithEnvironment("Jwt__RefreshTokenExpirationDays", jwtRefreshTokenExpirationDays),
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
                .WithTransformPathRouteValues("/api/{**catch-all}")
            ;
        }
    });

builder.AddNpmApp("admin", "../Platform.Admin")
    .WithReference(yarp)
    .WaitFor(yarp)
    .WithEnvironment("BROWSER", "none") // Disable opening browser on npm start
    .WithHttpEndpoint(env: "PORT",port:15001)
    .WithNpmPackageInstallation()
    .PublishAsDockerFile();
 
builder.AddNpmApp("app", "../Platform.App")
    .WithReference(yarp)
    .WaitFor(yarp)
    .WithEnvironment("BROWSER", "none") // Disable opening browser on npm start
    .WithHttpEndpoint(env: "PORT",port:15002)
    .WithNpmPackageInstallation()
    .PublishAsDockerFile();
 
// 配置 Scalar API 文档
// 使用 .NET 9 原生 OpenAPI 支持
// 默认端点是 /openapi/v1.json
var scalar = builder.AddScalarApiReference( );
foreach (var service in services.Values)
{
    scalar.WithApiReference(service); 
}

await builder.Build().RunAsync();
