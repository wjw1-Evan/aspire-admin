using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.Eventing;
using Aspire.Hosting.Lifecycle;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Platform.Hosting.MongoDBReplicaSet;

/// <summary>
/// MongoDB 副本集事件订阅器
/// </summary>
internal class MongoDBReplicaSetEventingSubscriber(
    ResourceNotificationService notification,
    ILogger<MongoDBReplicaSetEventingSubscriber> logger) : IDistributedApplicationEventingSubscriber
{
    /// <summary>
    /// 订阅事件
    /// </summary>
    public Task SubscribeAsync(IDistributedApplicationEventing eventing, DistributedApplicationExecutionContext context, CancellationToken cancellationToken)
    {
        eventing.Subscribe<BeforeStartEvent>(async (@event, ct) =>
        {
            foreach (var replicaSet in @event.Model.Resources.OfType<MongoDBReplicaSetResource>())
            {
                await InitializeReplicaSetAsync(replicaSet, notification, logger, ct);
            }
        });

        return Task.CompletedTask;
    }

    /// <summary>
    /// 初始化副本集
    /// </summary>
    private static async Task InitializeReplicaSetAsync(
        MongoDBReplicaSetResource replicaSet,
        ResourceNotificationService notification,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        try
        {
            await notification.PublishUpdateAsync(replicaSet, s => s with { State = "Initializing" });

            // 等待所有成员就绪（依赖的 MongoDB 容器已启动且健康）
            await notification.WaitForDependenciesAsync(replicaSet, cancellationToken);

            if (replicaSet.Members.Count == 0)
            {
                logger.LogCritical("副本集 '{ReplicaSetName}' 没有添加任何成员", replicaSet.ReplicaSetName);
                await notification.PublishUpdateAsync(replicaSet, s => s with { State = "Failed" });
                return;
            }

            var firstMember = replicaSet.Members.Keys.First();
            var connectionString = await firstMember.ConnectionStringExpression.GetValueAsync(cancellationToken);

            if (string.IsNullOrEmpty(connectionString))
            {
                logger.LogCritical("无法获取副本集 '{ReplicaSetName}' 的连接字符串", replicaSet.ReplicaSetName);
                await notification.PublishUpdateAsync(replicaSet, s => s with { State = "Failed" });
                return;
            }

            // 使用直连模式连接，保留原始认证信息
            var urlBuilder = new MongoUrlBuilder(connectionString)
            {
                DirectConnection = true
            };

            var mongoClient = new MongoClient(urlBuilder.ToMongoUrl());

            // 先验证连接可用
            try
            {
                await mongoClient.ListDatabaseNamesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "副本集 '{ReplicaSetName}' 连接失败，请检查 MongoDB 是否正常运行", replicaSet.ReplicaSetName);
                await notification.PublishUpdateAsync(replicaSet, s => s with { State = "Failed" });
                return;
            }

            var adminDb = mongoClient.GetDatabase("admin");

            // 使用成员的 Aspire 资源名称作为主机名（Docker 网络中可通过资源名访问）
            var initiateCmd = BuildInitiateCommand(replicaSet);

            try
            {
                await adminDb.RunCommandAsync<BsonDocument>(initiateCmd, readPreference: null, cancellationToken);
                logger.LogInformation("副本集 '{ReplicaSetName}' 初始化成功", replicaSet.ReplicaSetName);
            }
            catch (MongoCommandException ex) when (ex.CodeName == "AlreadyInitialized")
            {
                logger.LogInformation("副本集 '{ReplicaSetName}' 已经初始化，跳过", replicaSet.ReplicaSetName);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "副本集 '{ReplicaSetName}' 初始化失败", replicaSet.ReplicaSetName);
                await notification.PublishUpdateAsync(replicaSet, s => s with { State = "Failed" });
                return;
            }

            // 等待 PRIMARY 选举完成
            await WaitForPrimaryElectionAsync(adminDb, replicaSet.ReplicaSetName, logger, cancellationToken);

            await notification.PublishUpdateAsync(replicaSet, s => s with { State = "Running" });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "副本集 '{ReplicaSetName}' 初始化过程中发生错误", replicaSet.ReplicaSetName);
            await notification.PublishUpdateAsync(replicaSet, s => s with { State = "Failed" });
        }
    }

    /// <summary>
    /// 构建 rs.initiate 命令
    /// </summary>
    private static BsonDocument BuildInitiateCommand(MongoDBReplicaSetResource replicaSet)
    {
        var members = replicaSet.Members.Select((kv, index) => new BsonDocument
        {
            ["_id"] = index,
            ["host"] = kv.Key.Name,
            ["priority"] = kv.Value.ArbiterOnly ? 0 : (kv.Value.Priority ?? 1),
            ["arbiterOnly"] = kv.Value.ArbiterOnly
        }).ToList();

        return new BsonDocument
        {
            ["replSetInitiate"] = new BsonDocument
            {
                ["_id"] = replicaSet.ReplicaSetName,
                ["members"] = new BsonArray(members)
            }
        };
    }

    /// <summary>
    /// 等待 PRIMARY 选举
    /// </summary>
    private static async Task WaitForPrimaryElectionAsync(
        IMongoDatabase adminDb,
        string replicaSetName,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var maxAttempts = 30;
        var attempt = 0;

        while (attempt < maxAttempts && !cancellationToken.IsCancellationRequested)
        {
            try
            {
                var helloCmd = new BsonDocument { { "hello", 1 } };
                var result = await adminDb.RunCommandAsync<BsonDocument>(helloCmd, readPreference: null, cancellationToken);

                if (result.TryGetValue("isMaster", out var isMaster) && isMaster.AsBoolean)
                {
                    logger.LogInformation("副本集 '{ReplicaSetName}' PRIMARY 选举完成", replicaSetName);
                    return;
                }

                attempt++;
                await Task.Delay(3_000, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "副本集 '{ReplicaSetName}' 第 {Attempt} 次检查 PRIMARY 状态失败", replicaSetName, attempt + 1);
                attempt++;
                await Task.Delay(3_000, cancellationToken);
            }
        }

        logger.LogWarning("副本集 '{ReplicaSetName}' PRIMARY 选举超时", replicaSetName);
    }
}