using MongoDB.Driver;
using Platform.ApiService.Constants;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 定义与内置 AI 助手相关的协调操作。
/// </summary>
public interface IAiAssistantCoordinator
{
    /// <summary>
    /// 为当前登录用户确保 AI 助手专属会话存在。
    /// </summary>
    Task<ChatSession> EnsureAssistantSessionForCurrentUserAsync();
}

/// <summary>
/// 提供 AI 助手会话的统一协调逻辑。
/// </summary>
public class AiAssistantCoordinator : IAiAssistantCoordinator
{
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;
    private readonly IDatabaseOperationFactory<ChatSession> _sessionFactory;
    private readonly ILogger<AiAssistantCoordinator> _logger;

    /// <summary>
    /// 初始化协调器实例。
    /// </summary>
    /// <param name="userFactory">用户数据操作工厂</param>
    /// <param name="sessionFactory">会话数据操作工厂</param>
    /// <param name="logger">日志记录器</param>
    public AiAssistantCoordinator(
        IDatabaseOperationFactory<AppUser> userFactory,
        IDatabaseOperationFactory<ChatSession> sessionFactory,
        ILogger<AiAssistantCoordinator> logger)
    {
        _userFactory = userFactory;
        _sessionFactory = sessionFactory;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<ChatSession> EnsureAssistantSessionForCurrentUserAsync()
    {
        var currentUserId = _sessionFactory.GetRequiredUserId();
        var user = await _userFactory.GetByIdAsync(currentUserId)
            ?? throw new InvalidOperationException("未找到当前用户信息，无法创建 AI 助手会话。");

        var companyId = user.CurrentCompanyId ?? user.PersonalCompanyId;
        if (string.IsNullOrWhiteSpace(companyId))
        {
            throw new InvalidOperationException("当前用户尚未加入任何企业，无法建立 AI 助手会话。");
        }

        return await EnsureAssistantSessionAsync(user, companyId);
    }

    /// <summary>
    /// 确保指定用户与 AI 助手之间存在私聊会话。
    /// </summary>
    /// <param name="user">用户实体</param>
    /// <param name="companyId">企业标识</param>
    private async Task<ChatSession> EnsureAssistantSessionAsync(AppUser user, string companyId)
    {
        var filter = Builders<ChatSession>.Filter.And(
            Builders<ChatSession>.Filter.Eq(session => session.CompanyId, companyId),
            Builders<ChatSession>.Filter.Size(session => session.Participants, 2),
            Builders<ChatSession>.Filter.All(session => session.Participants, new[] { user.Id, AiAssistantConstants.AssistantUserId })
        );

        var existing = await _sessionFactory.FindAsync(filter, limit: 1);
        if (existing.Count > 0)
        {
            return existing[0];
        }

        var participantNames = new Dictionary<string, string>
        {
            [user.Id] = user.Name ?? user.Username,
            [AiAssistantConstants.AssistantUserId] = AiAssistantConstants.AssistantDisplayName
        };

        var unreadCounts = new Dictionary<string, int>
        {
            [user.Id] = 0,
            [AiAssistantConstants.AssistantUserId] = 0
        };

        var session = new ChatSession
        {
            CompanyId = companyId,
            Participants = new List<string> { user.Id, AiAssistantConstants.AssistantUserId },
            ParticipantNames = participantNames,
            UnreadCounts = unreadCounts,
            TopicTags = new List<string> { "assistant", "direct" },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        session = await _sessionFactory.CreateAsync(session);
        _logger.LogInformation("已为用户 {UserId} 创建 AI 助手会话 {SessionId}", user.Id, session.Id);
        return session;
    }
}
