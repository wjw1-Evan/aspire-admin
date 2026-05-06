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
    public static IResourceBuilder<MongoDBReplicaSetResource> AddMongoDBReplicaSet(
        this IDistributedApplicationBuilder builder,
        string name,
        string replicaSetName = "rs0")
    {
        ArgumentNullException.ThrowIfNull(builder);
        ArgumentNullException.ThrowIfNull(name);

        builder.Services.TryAddEventingSubscriber<MongoDBReplicaSetEventingSubscriber>();

        var resource = new MongoDBReplicaSetResource(name, replicaSetName);
        var resourceBuilder = builder.AddResource(resource)
            .WithInitialState(new CustomResourceSnapshot
            {
                State = "Waiting",
                ResourceType = "MongoDB Replica Set",
                Properties = []
            });

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

        // 只添加 --replSet 参数，不使用 --keyFile 以简化开发环境配置
        // MongoDB 容器已通过 MONGO_INITDB_ROOT_USERNAME/PASSWORD 启用认证
        member
            .WithArgs("--replSet", builder.Resource.ReplicaSetName)
            .WithArgs("--bind_ip_all");

        // 添加成员到副本集
        builder.Resource.AddMember(member.Resource, options);

        // 建立父子关系，副本集等待成员就绪
        builder.WithChildRelationship(member);
        builder.WaitFor(member);

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