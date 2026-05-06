using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Driver;

namespace Platform.Hosting.MongoDBReplicaSet;

/// <summary>
/// MongoDB 副本集初始化器
/// 在成员资源就绪后初始化副本集
/// </summary>
internal class MongoDBReplicaSetInitializer
{
    private static readonly SemaphoreSlim _initLock = new(1, 1);

    /// <summary>
    /// 初始化副本集（幂等操作）
    /// </summary>
    public static async Task InitializeAsync(
        MongoDBReplicaSetResource replicaSet,
        ResourceNotificationService notification,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        // 使用锁确保只初始化一次
        if (!await _initLock.WaitAsync(TimeSpan.Zero, cancellationToken))
        {
            logger.LogInformation("副本集 '{ReplicaSetName}' 初始化已在进行中，跳过", replicaSet.ReplicaSetName);
            return;
        }

        try
        {
            await InitializeCoreAsync(replicaSet, notification, logger, cancellationToken);
        }
        finally
        {
            _initLock.Release();
        }
    }

    private static async Task InitializeCoreAsync(
        MongoDBReplicaSetResource replicaSet,
        ResourceNotificationService notification,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        try
        {
            await notification.PublishUpdateAsync(replicaSet, s => s with { State = "Initializing" });

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

            var urlBuilder = new MongoUrlBuilder(connectionString)
            {
                DirectConnection = true
            };

            var mongoClient = new MongoClient(urlBuilder.ToMongoUrl());

            try
            {
                await mongoClient.ListDatabaseNamesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "副本集 '{ReplicaSetName}' 连接失败", replicaSet.ReplicaSetName);
                await notification.PublishUpdateAsync(replicaSet, s => s with { State = "Failed" });
                return;
            }

            var adminDb = mongoClient.GetDatabase("admin");
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

            await WaitForPrimaryElectionAsync(adminDb, replicaSet.ReplicaSetName, logger, cancellationToken);
            await notification.PublishUpdateAsync(replicaSet, s => s with { State = "Running" });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "副本集 '{ReplicaSetName}' 初始化过程中发生错误", replicaSet.ReplicaSetName);
            await notification.PublishUpdateAsync(replicaSet, s => s with { State = "Failed" });
        }
    }

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

    private static async Task WaitForPrimaryElectionAsync(
        IMongoDatabase adminDb,
        string replicaSetName,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var maxAttempts = 20;
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
                await Task.Delay(2_000, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "副本集 '{ReplicaSetName}' 第 {Attempt} 次检查 PRIMARY 状态失败", replicaSetName, attempt + 1);
                attempt++;
                await Task.Delay(2_000, cancellationToken);
            }
        }

        logger.LogWarning("副本集 '{ReplicaSetName}' PRIMARY 选举超时", replicaSetName);
    }
}