using MongoDB.Driver;
using Platform.ApiService.Models;

namespace Platform.ApiService.Scripts;

/// <summary>
/// 聊天模块索引创建脚本
/// </summary>
public class ChatIndexes
{
    private readonly IMongoDatabase _database;
    private readonly ILogger<ChatIndexes> _logger;

    /// <summary>
    /// 初始化聊天索引脚本
    /// </summary>
    /// <param name="database">MongoDB 数据库实例</param>
    /// <param name="logger">日志记录器</param>
    public ChatIndexes(IMongoDatabase database, ILogger<ChatIndexes> logger)
    {
        _database = database;
        _logger = logger;
    }

    /// <summary>
    /// 创建聊天相关集合索引
    /// </summary>
    public async Task CreateAsync(CancellationToken cancellationToken = default)
    {
        var sessions = _database.GetCollection<ChatSession>("chat_sessions");
        var messages = _database.GetCollection<ChatMessage>("chat_messages");

        _logger.LogInformation("========== 开始创建聊天模块索引 ==========");

        await CreateSessionIndexesAsync(sessions, cancellationToken);
        await CreateMessageIndexesAsync(messages, cancellationToken);

        _logger.LogInformation("========== 聊天模块索引创建完成 ==========");
    }

    private async Task CreateSessionIndexesAsync(IMongoCollection<ChatSession> sessions, CancellationToken cancellationToken)
    {
        var sessionIndexes = new List<CreateIndexModel<ChatSession>>
        {
            // companyId + updatedAt（用于会话列表倒序排序）
            new(new IndexKeysDefinitionBuilder<ChatSession>()
                    .Ascending(x => x.CompanyId)
                    .Descending(x => x.UpdatedAt),
                new CreateIndexOptions
                {
                    Name = "idx_chat_sessions_company_updatedAt"
                }),

            // companyId + participants（查找指定用户相关会话）
            new(new IndexKeysDefinitionBuilder<ChatSession>()
                    .Ascending(x => x.CompanyId)
                    .Ascending(x => x.Participants),
                new CreateIndexOptions
                {
                    Name = "idx_chat_sessions_company_participants"
                })
        };

        await sessions.Indexes.CreateManyAsync(sessionIndexes, cancellationToken);
        _logger.LogInformation("聊天会话索引创建完成");
    }

    private async Task CreateMessageIndexesAsync(IMongoCollection<ChatMessage> messages, CancellationToken cancellationToken)
    {
        var messageIndexes = new List<CreateIndexModel<ChatMessage>>
        {
            // companyId + sessionId + createdAt（会话消息时间线）
            new(new IndexKeysDefinitionBuilder<ChatMessage>()
                    .Ascending(x => x.CompanyId)
                    .Ascending(x => x.SessionId)
                    .Descending(x => x.CreatedAt),
                new CreateIndexOptions
                {
                    Name = "idx_chat_messages_company_session_createdAt"
                }),

            // companyId + senderId + createdAt（统计/用户消息查询）
            new(new IndexKeysDefinitionBuilder<ChatMessage>()
                    .Ascending(x => x.CompanyId)
                    .Ascending(x => x.SenderId)
                    .Descending(x => x.CreatedAt),
                new CreateIndexOptions
                {
                    Name = "idx_chat_messages_company_sender_createdAt"
                })
        };

        await messages.Indexes.CreateManyAsync(messageIndexes, cancellationToken);
        _logger.LogInformation("聊天消息索引创建完成");
    }
}

