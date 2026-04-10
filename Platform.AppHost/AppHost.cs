using Microsoft.Extensions.Hosting;
using Scalar.Aspire;
using Aspire.Hosting.Yarp;
using Aspire.Hosting.Yarp.Transforms;

var builder = DistributedApplication.CreateBuilder(args);

var compose = builder.AddDockerComposeEnvironment("compose").WithDashboard(dashboard =>
{
    dashboard.WithHostPort(18888);
});


// 🔒 从 Aspire 配置中读取 JWT 设置
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"]
    ?? throw new InvalidOperationException("缺少 JWT 密钥配置项 'Jwt:SecretKey'。");

var openAiEndpoint = builder.Configuration["Parameters:openai-openai-endpoint"]
    ?? throw new InvalidOperationException("缺少 OpenAI 终端配置项 'Parameters:openai-openai-endpoint'。");

var openai = builder.AddOpenAI("openai").WithEndpoint(openAiEndpoint);

var openAiModel = builder.Configuration["OpenAI:Model"] ?? throw new InvalidOperationException("缺少 OpenAI 模型配置项 'OpenAI:Model'。");
var chat = openai.AddModel("chat", openAiModel);

var redis = builder.AddRedis("redis");

var mongo = builder.AddMongoDB("mongo")
        .WithLifetime(ContainerLifetime.Persistent)
        .WithMongoExpress()
        .WithDataVolume();

var mongodb = mongo.AddDatabase("mongodb");

var storagedb = mongo.AddDatabase("storagedb");


// 数据初始化服务（一次性任务，完成后自动停止）
var datainitializer = builder.AddProject<Projects.Platform_DataInitializer>("datainitializer")
    .WithReference(mongodb)
    .PublishAsDockerComposeService((resource, service) =>
 {
     service.Name = "datainitializer";
 });

var systemMonitor = builder.AddProject<Projects.Platform_SystemMonitor>("systemmonitor")
    .WithReference(mongodb)
    .WaitFor(mongodb)
    .WithHttpEndpoint(port: 15020)
    .WithHttpHealthCheck("/health");

var storage = builder.AddProject<Projects.Platform_Storage>("storage")
    .WithReference(storagedb)
    .WaitFor(storagedb)
    .WithHttpEndpoint(port: 15010)
    .WithHttpHealthCheck("/health");

var smtpConfig = builder.Configuration.GetSection("Smtp");
var smtpHost = smtpConfig["Host"];

var apiService = builder.AddProject<Projects.Platform_ApiService>("apiservice")
    .WithReference(mongodb)
    .WaitFor(mongodb)
    .WaitForCompletion(datainitializer)
    .WithHttpEndpoint()
    .WithExternalHttpEndpoints()
    .WithHttpHealthCheck("/health")
    .WithEnvironment("Jwt__SecretKey", jwtSecretKey)
    .WithReference(chat);
if (!string.IsNullOrEmpty(smtpHost))
{
    // 如果 AppHost 配置了 SMTP，则使用配置的值
    apiService.WithEnvironment("Smtp__Host", smtpHost)
              .WithEnvironment("Smtp__Port", smtpConfig["Port"] ?? "25")
              .WithEnvironment("Smtp__UserName", smtpConfig["UserName"] ?? "")
              .WithEnvironment("Smtp__Password", smtpConfig["Password"] ?? "")
              .WithEnvironment("Smtp__EnableSsl", smtpConfig["EnableSsl"] ?? "false")
              .WithEnvironment("Smtp__DisplayName", smtpConfig["DisplayName"] ?? "Aspire Admin")
              .WithEnvironment("Smtp__FromEmail", smtpConfig["FromEmail"] ?? "noreply@aspire-admin.com");
}


var services = new Dictionary<string, IResourceBuilder<IResourceWithServiceDiscovery>>
{
    ["apiservice"] = apiService,
    ["systemmonitor"] = systemMonitor,
    ["storage"] = storage
};

var yarp = builder.AddYarp("apigateway")
    .WithHostPort(15000).PublishAsDockerComposeService((resource, service) =>
                   {
                       service.Ports = ["15000:15000"];
                   })
    .WithConfiguration(config =>
    {
        // 微服务路由配置 - 统一通过/{service}路径访问
        // 使用通配符{**catch-all}捕获所有子路径
        foreach (var service in services)
        {
            config.AddRoute($"/{service.Key}/{{**catch-all}}", config.AddCluster(service.Value)).WithMaxRequestBodySize(-1).WithTransformPathRouteValues("/{**catch-all}");
        }
    });

builder.AddNpmApp("admin", "../Platform.Admin")
    .WithReference(yarp)
    .WithEnvironment("BROWSER", "none") // Disable opening browser on npm start
                                        // 解决 npm 安装仅生产依赖导致 postinstall（max setup）失败的问题
                                        // 强制安装 devDependencies 并在开发模式下运行
    .WithEnvironment("NPM_CONFIG_PRODUCTION", "false")
    .WithEnvironment("NODE_ENV", "development")
    .WithHttpEndpoint(env: "PORT", port: 15001, targetPort: 8082)
    .WithNpmPackageInstallation()
    .PublishAsDockerFile().PublishAsDockerComposeService((resource, service) =>
                   {
                       service.Ports = ["15001:8082"];
                   });

// 添加移动端应用 (Expo)
builder.AddNpmApp("app", "../Platform.App")
    .WithReference(yarp)
    .WithEnvironment("BROWSER", "none")
    // 同样确保安装 devDependencies，避免前端依赖缺失
    .WithEnvironment("NPM_CONFIG_PRODUCTION", "false")
    .WithEnvironment("NODE_ENV", "development")
    .WithHttpEndpoint(env: "PORT", port: 15002, targetPort: 8081)
    .WithNpmPackageInstallation()
    .PublishAsDockerFile().PublishAsDockerComposeService((resource, service) =>
                   {
                       service.Ports = ["15002:8081"];
                   });

// 添加微信小程序 (WeChat Mini Program)
builder.AddNpmApp("miniapp", "../Platform.MiniApp")
    .WithReference(yarp)
    .WithEnvironment("BROWSER", "none")
    .WithEnvironment("NODE_ENV", "development")
    .WithHttpEndpoint(env: "PORT", port: 15003, targetPort: 15004)
    .WithNpmPackageInstallation();




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
