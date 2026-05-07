using System.Security.Cryptography;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Microsoft.Extensions.Hosting;
using Scalar.Aspire;
using Aspire.Hosting.Yarp;
using Aspire.Hosting.Yarp.Transforms;

var builder = DistributedApplication.CreateBuilder(args);

// Add the following line to configure the Docker Compose environment
builder.AddDockerComposeEnvironment("env");

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

// Percona Server for MongoDB 副本集配置
var replicaSetName = "rs0";
var mongoDataPath = Path.GetFullPath("mongo-data");
Directory.CreateDirectory(mongoDataPath);

// 副本集节点 1 (Primary)
var mongo1 = builder.AddContainer("mongo-rs-1", "percona/percona-server-mongodb")
    .WithImageTag("latest")
    .WithArgs("--replSet", replicaSetName, "--port", "27017")
    .WithEndpoint(targetPort: 27017, scheme: "tcp")
    .WithBindMount(source: Path.Combine(mongoDataPath, "rs-1"), target: "/data/db");

// 副本集节点 2 (Secondary)
var mongo2 = builder.AddContainer("mongo-rs-2", "percona/percona-server-mongodb")
    .WithImageTag("latest")
    .WithArgs("--replSet", replicaSetName, "--port", "27017")
    .WithEndpoint(targetPort: 27017, scheme: "tcp")
    .WithBindMount(source: Path.Combine(mongoDataPath, "rs-2"), target: "/data/db");

// 副本集节点 3 (Secondary)
var mongo3 = builder.AddContainer("mongo-rs-3", "percona/percona-server-mongodb")
    .WithImageTag("latest")
    .WithArgs("--replSet", replicaSetName, "--port", "27017")
    .WithEndpoint(targetPort: 27017, scheme: "tcp")
    .WithBindMount(source: Path.Combine(mongoDataPath, "rs-3"), target: "/data/db");

// 初始化副本集的容器（执行一次后自动停止）
var initScript = $"config = {{ _id: '{replicaSetName}', members: [ {{ _id: 0, host: 'mongo-rs-1:27017' }}, {{ _id: 1, host: 'mongo-rs-2:27017' }}, {{ _id: 2, host: 'mongo-rs-3:27017' }} ] }}; rs.initiate(config);";
builder.AddContainer("mongo-rs-init", "percona/percona-server-mongodb")
    .WithImageTag("latest")
    .WithEntrypoint("sh")
    .WithArgs("-c", $"mongosh --host mongo-rs-1 --eval \"{initScript}\"")
    .WaitFor(mongo1)
    .WaitFor(mongo2)
    .WaitFor(mongo3);

// 副本集连接字符串 - 自动发现 Primary 节点
var connectionString = $"mongodb://mongo-rs-1:27017,mongo-rs-2:27017,mongo-rs-3:27017/?replicaSet={replicaSetName}";
var database = builder.AddConnectionString("database", connectionString);

var redis = builder.AddRedis("redis")
    .WithLifetime(ContainerLifetime.Persistent)
    .WithRedisInsight()
    .WithDataVolume();


// 数据初始化服务（一次性任务，完成后自动停止）
var datainitializer = builder.AddProject<Projects.Platform_DataInitializer>("datainitializer")
    .WithReference(database)
    .WaitFor(mongo1)
    .WaitFor(mongo2)
    .WaitFor(mongo3)
    .WithEnvironment("Jwt__SecretKey", jwtSecretKey)
    .WithEnvironment("InternalService__ApiKey", internalServiceApiKey);

// 系统监控功能已迁移到 Platform.ApiService (路由: /api/system-monitor)

var apiService = builder.AddProject<Projects.Platform_ApiService>("apiservice")
    .WithHttpEndpoint()
    .WithEnvironment("Jwt__SecretKey", jwtSecretKey)
    .WithEnvironment("InternalService__ApiKey", internalServiceApiKey)
    .WithReference(database)
    .WithReference(chat)
    .WithReference(redis)
    .WaitFor(mongo1)
    .WaitFor(mongo2)
    .WaitFor(mongo3)
    .WaitFor(redis)
    .WithReplicas(3);

var services = new Dictionary<string, IResourceBuilder<IResourceWithServiceDiscovery>>
{
    ["apiservice"] = apiService
};

var adminbuilder = builder.AddJavaScriptApp("admin", "../Platform.Admin")
    .WithHttpEndpoint(env: "PORT")
    .WithBuildScript("npm run build");

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
    .PublishWithStaticFiles(adminbuilder)
    .WithConfiguration(config =>
    {
        config.AddRoute(adminbuilder);

        // 微服务路由配置 - 统一通过/{service}路径访问
        // 使用通配符{**catch-all}捕获所有子路径
        foreach (var service in services)
        {
            config.AddRoute($"/{service.Key}/{{**catch-all}}", service.Value).WithMaxRequestBodySize(-1).WithTransformPathRouteValues("/{**catch-all}");
        }

    });

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
