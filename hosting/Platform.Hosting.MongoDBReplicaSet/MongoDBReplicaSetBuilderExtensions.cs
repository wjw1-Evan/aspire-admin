using System.IO;
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

        // KeyFile 在启用认证 + 副本集时是必需的
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

        // 注册副本集级别的健康检查
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

        // 配置 MongoDB 服务器参数
        // --replSet 启用副本集模式
        // --keyFile 启用副本集内部认证（认证 + 副本集时必需）
        // --bind_ip_all 允许所有网络接口连接
        member
            .WithArgs("--replSet", builder.Resource.ReplicaSetName)
            .WithArgs("--bind_ip_all")
            .WithArgs("--keyFile", "/keys/keyfile")
            .WithContainerFiles("/keys", (context, _) =>
            {
                var keyFileContent = builder.Resource.KeyFile.Value;
                return Task.FromResult<IEnumerable<ContainerFileSystemItem>>(
                    [new ContainerFile { Name = "keyfile", Contents = keyFileContent, Mode = UnixFileMode.UserRead | UnixFileMode.UserWrite }]);
            });

        // 添加成员到副本集
        builder.Resource.AddMember(member.Resource, options);

        // 建立父子关系，副本集等待成员就绪
        builder.WithChildRelationship(member);
        builder.WaitFor(member);

        // 当成员资源就绪（健康检查通过）时，初始化副本集
        // 使用 OnResourceReady 替代 BeforeStartEvent，避免死锁
        // BeforeStartEvent 在容器启动前触发，WaitForDependenciesAsync 会等待永远不会就绪的容器
        // OnResourceReady 在成员健康检查通过后触发，此时可以安全地连接 MongoDB
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