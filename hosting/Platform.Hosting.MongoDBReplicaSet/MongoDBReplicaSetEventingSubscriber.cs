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
    /// <summary>
    /// 订阅事件
    /// </summary>
    /// <summary>
    /// 订阅事件
    /// </summary>
    /// <summary>
    /// 订阅事件
    /// </summary>
    /// <summary>
    /// 订阅事件
    /// </summary>
    /// <summary>
    /// 订阅事件
    /// </summary>
    /// <summary>
    /// 订阅事件
    /// </summary>
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
            // 发布等待状态
            await notification.PublishUpdateAsync(replicaSet, s => s with { State = "Initializing" });

            // 等待成员依赖
            await notification.WaitForDependenciesAsync(replicaSet, cancellationToken);

            if (replicaSet.Members.Count == 0)
            {
                logger.LogCritical("No members were added to the replica set '{ReplicaSetName}'.");
                return;
            }

            // 获取第一个成员的连接字符串
            var firstMember = replicaSet.Members.Keys.First();
            var connectionString = await firstMember.ConnectionStringExpression.GetValueAsync(cancellationToken);

            if (string.IsNullOrEmpty(connectionString))
            {
                logger.LogError("Failed to get connection string for replica set '{ReplicaSetName}'.");
                return;
            }

            // 使用直连模式连接以执行 rs.initiate
            var mongoUrl = new MongoUrl(connectionString);
            var builder = new MongoUrlBuilder(connectionString)
            {
                AllowInsecureTls = true,
                UseTls = false,
                DirectConnection = true
            };

            var mongoClient = new MongoClient(builder.ToMongoUrl());
            var adminDb = mongoClient.GetDatabase("admin");

            // 尝试初始化副本集
            try
            {
                var members = replicaSet.Members.Select((kv, index) => new
                {
                    _id = index,
                    host = kv.Key.Name,
                    priority = kv.Value.Priority ?? 1,
                    arbiterOnly = kv.Value.ArbiterOnly
                }).ToList();

                var initiateCmd = new BsonDocument
                {
                    ["replSetInitiate"] = new BsonDocument
                    {
                        ["_id"] = replicaSet.ReplicaSetName,
                        ["members"] = new BsonArray(members.Select(m => new BsonDocument
                        {
                            ["_id"] = m._id,
                            ["host"] = m.host,
                            ["priority"] = m.priority,
                            ["arbiterOnly"] = m.arbiterOnly
                        }))
                    }
                };

                await adminDb.RunCommandAsync<BsonDocument>(initiateCmd, readPreference: null, cancellationToken);
                logger.LogInformation("Replica set '{ReplicaSetName}' initialized successfully.", replicaSet.ReplicaSetName);
            }
            catch (MongoCommandException ex) when (ex.CodeName == "AlreadyInitialized")
            {
                logger.LogInformation("Replica set '{replicaSet.ReplicaSetName}' already initialized.");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to initialize replica set '{replicaSet.ReplicaSetName}'.");
                return;
            }

            // 等待 PRIMARY 选举
            await WaitForPrimaryElectionAsync(adminDb, replicaSet.ReplicaSetName, logger, cancellationToken);

            // 发布运行状态
            await notification.PublishUpdateAsync(replicaSet, s => s with { State = "Running" });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error initializing replica set '{ReplicaSetName}'.");
            await notification.PublishUpdateAsync(replicaSet, s => s with { State = "Failed" });
        }
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
        var maxAttempts = 30; // 最多等待 30 次（约 5 分钟）
        var attempt = 0;

        while (attempt < maxAttempts && !cancellationToken.IsCancellationRequested)
        {
            try
            {
                var helloCmd = new BsonDocument { { "hello", 1 } };
                var result = await adminDb.RunCommandAsync<BsonDocument>(helloCmd, readPreference: null, cancellationToken);

                if (result.TryGetValue("isMaster", out var isMaster) && isMaster.AsBoolean)
                {
                    logger.LogInformation("Primary elected for replica set '{replicaSetName}'.");
                    return;
                }

                attempt++;
                await Task.Delay(10_000, cancellationToken); // 等待 10 秒
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Attempt {Attempt} to check primary status failed.", attempt + 1);
                attempt++;
                await Task.Delay(10_000, cancellationToken);
            }
        }

        logger.LogWarning("Primary election timed out for replica set '{replicaSetName}'.");
    }
}
