using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;

namespace Platform.Hosting.MongoDBReplicaSet;

/// <summary>
/// MongoDB 副本集构建器扩展方法
/// </summary>
public static class MongoDBReplicaSetBuilderExtensions
{
    /// <summary>
    /// 添加 MongoDB 副本集资源
    /// </summary>
    public static IResourceBuilder<MongoDBReplicaSetResource> AddMongoDBReplicaSet(
        this IDistributedApplicationBuilder builder,
        string name,
        string replicaSetName = "rs0",
        IResourceBuilder<ParameterResource>? keyFileParameter = null)
    {
        ArgumentNullException.ThrowIfNull(builder);
        ArgumentNullException.ThrowIfNull(name);

        var keyFile = keyFileParameter?.Resource
            ?? ParameterResourceBuilderExtensions.CreateDefaultPasswordParameter(builder, $"{name}-keyfile");

        var resource = new MongoDBReplicaSetResource(name, replicaSetName, keyFile);
        var resourceBuilder = builder.AddResource(resource)
            .WithInitialState(new CustomResourceSnapshot
            {
                State = "Waiting",
                ResourceType = "MongoDB Replica Set",
                Properties = []
            });

        var healthCheckKey = $"{name}_check";
        builder.Services.AddHealthChecks()
            .Add(new HealthCheckRegistration(
                healthCheckKey,
                sp => new MongoDBReplicaSetHealthCheck(
                    resource,
                    sp.GetRequiredService<ResourceNotificationService>(),
                    sp.GetRequiredService<ILogger<MongoDBReplicaSetHealthCheck>>()),
                failureStatus: null,
                tags: null,
                timeout: null));

        resourceBuilder.WithHealthCheck(healthCheckKey);

        return resourceBuilder;
    }

    /// <summary>
    /// 添加副本集成员
    /// </summary>
    public static IResourceBuilder<MongoDBReplicaSetResource> WithMember(
        this IResourceBuilder<MongoDBReplicaSetResource> builder,
        IResourceBuilder<MongoDBServerResource> member,
        Action<MongoDBReplicaSetMemberOptions>? configureMember = null)
    {
        ArgumentNullException.ThrowIfNull(builder);
        ArgumentNullException.ThrowIfNull(member);

        var options = new MongoDBReplicaSetMemberOptions();
        configureMember?.Invoke(options);

        // 将 keyFile 内容作为环境变量传入，通过 entrypoint 脚本创建文件
        // 这样可以确保文件权限为 0600（MongoDB 必需）
        member
            .WithEnvironment("MONGO_RS_KEYFILE", builder.Resource.KeyFile)
            .WithArgs("--replSet", builder.Resource.ReplicaSetName)
            .WithArgs("--bind_ip_all")
            .WithArgs("--keyFile", "/keys/keyfile");

        // 覆盖 entrypoint：先创建 keyFile 文件（权限 600），再启动 mongod
        // MongoDB 要求 keyFile 只能由 owner 读写，否则报 "bad file" 错误
        member.WithEntrypoint("/bin/sh");
        member.WithArgs("-c",
            "mkdir -p /keys && " +
            "printf '%s' \"$MONGO_RS_KEYFILE\" > /keys/keyfile && " +
            "chmod 600 /keys/keyfile && " +
            "exec /usr/local/bin/docker-entrypoint.sh mongod");

        builder.Resource.AddMember(member.Resource, options);

        builder.WithChildRelationship(member);
        builder.WaitFor(member);

        member.OnResourceReady(async (mongoServer, @event, ct) =>
        {
            var sp = @event.Services;
            var notificationService = sp.GetRequiredService<ResourceNotificationService>();
            var logger = sp.GetRequiredService<ILogger<MongoDBReplicaSetResource>>();

            await MongoDBReplicaSetInitializer.InitializeAsync(
                builder.Resource, notificationService, logger, ct);
        });

        return builder;
    }

    /// <summary>
    /// 添加 MongoExpress 管理界面
    /// </summary>
    public static IResourceBuilder<MongoDBReplicaSetResource> WithMongoExpress(
        this IResourceBuilder<MongoDBReplicaSetResource> builder,
        IResourceBuilder<MongoDBServerResource> member)
    {
        ArgumentNullException.ThrowIfNull(builder);
        ArgumentNullException.ThrowIfNull(member);

        member.WithMongoExpress();

        return builder;
    }
}