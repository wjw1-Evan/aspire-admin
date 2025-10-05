

using Aspire.Hosting.Yarp.Transforms;
using Scalar.Aspire;
using Microsoft.Extensions.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

var mongo = builder.AddMongoDB("mongo").WithMongoExpress()
                   .WithLifetime(ContainerLifetime.Persistent);

var mongodb = mongo.AddDatabase("mongodb");
 
var services = new Dictionary<string, IResourceBuilder<ProjectResource>>
{
    // 核心业务服务 http://localhost:15000/api/apiservice/users
    ["apiservice"] = builder.AddProject<Projects.Platform_ApiService>("apiservice")
    .WithReference(mongodb)   
     .WithHttpHealthCheck("/health")
    
};
 

builder.AddYarp("apigateway")
    .WithHostPort(15000)
    .WithConfiguration(config =>
    {
        // 微服务路由配置 - 统一通过/api/{service}路径访问
        // 使用通配符{**catch-all}捕获所有子路径
        foreach (var service in services)
        {
            var route = $"/api/{service.Key}/{{**catch-all}}";
            config.AddRoute(route, config.AddCluster(service.Value))
                .WithTransformPathRouteValues("/api/{**catch-all}");
        }
    });


var scalar = builder.AddScalarApiReference();
foreach (var service in services.Values)
{
    scalar.WithApiReference(service);
}

await builder.Build().RunAsync();
