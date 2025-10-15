

using Aspire.Hosting.Yarp.Transforms;
using Scalar.Aspire;
using Microsoft.Extensions.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

var mongo = builder.AddMongoDB("mongo").WithMongoExpress()
                   .WithLifetime(ContainerLifetime.Persistent).WithDataVolume()
                   // 不暴露对外端口，只供内部服务访问
                   ;

var mongodb = mongo.AddDatabase("mongodb");

var services = new Dictionary<string, IResourceBuilder<ProjectResource>>
{
    // 核心业务服务（端口不暴露，仅供内部访问）
    ["apiservice"] = builder.AddProject<Projects.Platform_ApiService>("apiservice")
    .WithReference(mongodb)
    .WithHttpEndpoint().WithReplicas(3)
    .WithHttpHealthCheck("/health")
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
    .PublishAsDockerFile();
 
 builder.AddNpmApp("app", "../Platform.App")
    .WithReference(yarp)
    .WaitFor(yarp)
    .WithEnvironment("BROWSER", "none") // Disable opening browser on npm start
    .WithHttpEndpoint(env: "PORT",port:15002)
    .PublishAsDockerFile();
 

// 配置 Scalar API 文档
// 使用 .NET 9 原生 OpenAPI 支持
// 默认端点是 /openapi/v1.json
var scalar = builder.AddScalarApiReference();
foreach (var service in services.Values)
{
    scalar.WithApiReference(service);
}

await builder.Build().RunAsync();
