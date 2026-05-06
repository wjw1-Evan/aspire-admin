using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.Lifecycle;
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
    /// <param name="builder">分布式应用构建器</param>
    /// <param name="name">资源名称</param>
    /// <param name="replicaSetName">副本集名称</param>
    /// <param name="keyFileParameter">KeyFile 参数资源（可选）</param>
    /// <returns>副本集资源构建器</returns>
    public static IResourceBuilder<MongoDBReplicaSetResource> AddMongoDBReplicaSet(
        this IDistributedApplicationBuilder builder,
        string name,
        string replicaSetName = "rs0",
        IResourceBuilder<ParameterResource>? keyFileParameter = null)
    {
        ArgumentNullException.ThrowIfNull(builder);
        ArgumentNullException.ThrowIfNull(name);

        // 注册事件订阅器
        builder.Services.TryAddEventingSubscriber<MongoDBReplicaSetEventingSubscriber>();

        // 创建或使用 KeyFile 参数
        var keyFile = keyFileParameter?.Resource
            ?? ParameterResourceBuilderExtensions.CreateDefaultPasswordParameter(builder, $"{name}-keyfile");

        // 创建副本集资源
        var resource = new MongoDBReplicaSetResource(name, replicaSetName, keyFile);
        var resourceBuilder = builder.AddResource(resource)
            .WithInitialState(new CustomResourceSnapshot 
            { 
                State = "Waiting",
                ResourceType = "MongoDB Replica Set",
                Properties = []
            })
            .WithHealthCheck($"{name}_check");

        return resourceBuilder;
    }

    /// <summary>
    /// 添加副本集成员
    /// </summary>
    /// <param name="builder">副本集资源构建器</param>
    /// <param name="member">MongoDB 服务器资源构建器</param>
    /// <param name="configureMember">成员配置选项</param>
    /// <returns>副本集资源构建器</returns>
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
        member
            .WithArgs("--replSet", builder.Resource.ReplicaSetName)
            .WithArgs("--bind_ip_all")
            .WithArgs("--keyFile", "/keys/keyfile")
            .WithArgs("--tlsAllowConnectionsWithoutCertificates")
            .WithContainerFiles("/keys", (context, _) =>
            {
                // 从 KeyFile 参数生成 keyfile 内容
                var keyFileContent = builder.Resource.KeyFile.Value;
                return Task.FromResult<IEnumerable<ContainerFileSystemItem>>(
                    [new ContainerFile { Contents = keyFileContent }]);
            })
            .WithEndpointProxySupport(false);

        // 移除默认的 MongoDB 健康检查
        RemoveDefaultHealthChecks(member, builder.ApplicationBuilder);

        // 添加副本集成员健康检查
        var memberHealthCheckKey = $"{member.Resource.Name}_member_check";
        builder.ApplicationBuilder.Services.AddHealthChecks()
            .Add(new HealthCheckRegistration(
                memberHealthCheckKey,
                sp => new MongoDBReplicaSetMemberHealthCheck(sp.GetRequiredService<ILogger<MongoDBReplicaSetMemberHealthCheck>>()),
                failureStatus: null,
                tags: null,
                timeout: null));

        member.WithHealthCheck(memberHealthCheckKey);

        // 添加成员到副本集
        builder.Resource.AddMember(member.Resource, options);

        // 建立父子关系
        builder.WithChildRelationship(member);
        builder.WaitForStart(member);

        return builder;
    }

    /// <summary>
    /// 添加 MongoExpress 管理界面
    /// </summary>
    /// <param name="builder">副本集资源构建器</param>
    /// <param name="member">MongoDB 服务器资源构建器</param>
    /// <returns>副本集资源构建器</returns>
    public static IResourceBuilder<MongoDBReplicaSetResource> WithMongoExpress(
        this IResourceBuilder<MongoDBReplicaSetResource> builder,
        IResourceBuilder<MongoDBServerResource> member)
    {
        ArgumentNullException.ThrowIfNull(builder);
        ArgumentNullException.ThrowIfNull(member);

        // 在 MongoDB 服务器上添加 MongoExpress
        member.WithMongoExpress();

        return builder;
    }

    /// <summary>
    /// 移除默认的 MongoDB 健康检查
    /// </summary>
    /// <param name="member">MongoDB 服务器资源构建器</param>
    /// <param name="builder">分布式应用构建器</param>
    private static void RemoveDefaultHealthChecks(
        IResourceBuilder<MongoDBServerResource> member,
        IDistributedApplicationBuilder builder)
    {
        foreach (var annotation in member.Resource.Annotations.OfType<HealthCheckAnnotation>().ToList())
        {
            member.Resource.Annotations.Remove(annotation);

            builder.Services.Configure<HealthCheckServiceOptions>(options =>
            {
                var mongoDbServerHealthCheck = options.Registrations
                    .FirstOrDefault(x => x.Name == annotation.Key);

                if (mongoDbServerHealthCheck is not null)
                {
                    options.Registrations.Remove(mongoDbServerHealthCheck);
                }
            });
        }
    }
}
