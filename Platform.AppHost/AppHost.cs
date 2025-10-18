

using Aspire.Hosting.Yarp.Transforms;
using Scalar.Aspire;
using Microsoft.Extensions.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

var mongo = builder.AddMongoDB("mongo").WithMongoExpress(config=>{ config.WithLifetime(ContainerLifetime.Persistent);})
                   .WithLifetime(ContainerLifetime.Persistent).WithDataVolume()
                   // 不暴露对外端口，只供内部服务访问
                   ;

var mongodb = mongo.AddDatabase("mongodb","aspire-admin-db");

// 暂时注释掉 Redis 和 RabbitMQ，因为 Aspire 可能不支持
// var redis = builder.AddRedis("redis")
//     .WithLifetime(ContainerLifetime.Persistent);

// var rabbitmq = builder.AddRabbitMQ("rabbitmq")
//     .WithManagementPlugin()
//     .WithLifetime(ContainerLifetime.Persistent);

// ClickHouse 已替换为 MongoDB，使用现有的 mongodb 配置

var services = new Dictionary<string, IResourceBuilder<IResourceWithServiceDiscovery>>
{
    // 核心业务服务（端口不暴露，仅供内部访问）
    ["apiservice"] = builder.AddProject<Projects.Platform_ApiService>("apiservice")
        .WithReference(mongodb)
        .WithHttpEndpoint().WithReplicas(3)
        .WithHttpHealthCheck("/health"),
    
    // 数据中台服务
    ["dataplatform"] = builder.AddProject<Projects.Platform_DataPlatform>("dataplatform")
        .WithReference(mongodb)
        // .WithReference(redis)
        // .WithReference(rabbitmq)
        .WithHttpEndpoint().WithReplicas(2)
        .WithHttpHealthCheck("/health")
        // .WaitFor(redis)
        // .WaitFor(rabbitmq)
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

services.Add("admin", builder.AddNpmApp("admin", "../Platform.Admin")
    .WithReference(yarp)
    .WaitFor(yarp)
    .WithEnvironment("BROWSER", "none") // Disable opening browser on npm start
    .WithHttpEndpoint(env: "PORT",port:15001)
    .PublishAsDockerFile());
 
 services.Add("app", builder.AddNpmApp("app", "../Platform.App")
    .WithReference(yarp)
    .WaitFor(yarp)
    .WithEnvironment("BROWSER", "none") // Disable opening browser on npm start
    .WithHttpEndpoint(env: "PORT",port:15002)
    .PublishAsDockerFile());
 

// 配置 Scalar API 文档
// 使用 .NET 9 原生 OpenAPI 支持
// 默认端点是 /openapi/v1.json
var scalar = builder.AddScalarApiReference( );
foreach (var service in services.Values)
{
    scalar.WithApiReference(service); 
}

await builder.Build().RunAsync();
