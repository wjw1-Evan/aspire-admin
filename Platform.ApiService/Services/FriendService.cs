using MongoDB.Bson;
using MongoDB.Driver;
using Platform.ApiService.Models;
using System.Collections.Generic;
using Platform.ServiceDefaults.Services;
using System.Linq;
using System.Text.RegularExpressions;
using Platform.ApiService.Constants;

namespace Platform.ApiService.Services;

/// <summary>
/// 好友服务接口
/// </summary>
public interface IFriendService
{
    /// <summary>
    /// 获取好友列表
    /// </summary>
    Task<List<FriendSummaryResponse>> GetFriendsAsync();

    /// <summary>
    /// 搜索可添加的用户（支持手机号、姓名或用户名）
    /// </summary>
    /// <param name="phoneNumber">手机号（可选）</param>
    /// <param name="keyword">姓名或用户名关键字（可选）</param>
    /// <param name="includeAllTenants">是否跨租户搜索（仅限具有跨租户权限的管理员使用）</param>
    Task<List<FriendSearchResult>> SearchAsync(string? phoneNumber, string? keyword, bool includeAllTenants = false);

    /// <summary>
    /// 发送好友请求
    /// </summary>
    /// <param name="request">好友请求参数</param>
    Task<FriendRequestResponse> SendFriendRequestAsync(CreateFriendRequestRequest request);

    /// <summary>
    /// 获取待处理好友请求
    /// </summary>
    /// <param name="direction">请求方向</param>
    Task<List<FriendRequestResponse>> GetFriendRequestsAsync(FriendRequestDirection direction);

    /// <summary>
    /// 接受好友请求
    /// </summary>
    /// <param name="requestId">请求标识</param>
    Task<FriendRequestResponse> ApproveRequestAsync(string requestId);

    /// <summary>
    /// 拒绝好友请求
    /// </summary>
    /// <param name="requestId">请求标识</param>
    Task<FriendRequestResponse> RejectRequestAsync(string requestId);

    /// <summary>
    /// 获取或创建与好友的私聊会话
    /// </summary>
    /// <param name="friendUserId">好友用户标识</param>
    Task<FriendSessionResponse> EnsureDirectSessionAsync(string friendUserId);
}

/// <summary>
/// 好友服务实现
/// </summary>
public class FriendService : IFriendService
{
    private readonly IDatabaseOperationFactory<Friendship> _friendshipFactory;
    private readonly IDatabaseOperationFactory<FriendRequest> _friendRequestFactory;
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;
    private readonly IAiAssistantCoordinator _aiAssistantCoordinator;
    private readonly IChatService _chatService;
    private readonly ILogger<FriendService> _logger;

    /// <summary>
    /// 初始化好友服务
    /// </summary>
    public FriendService(
        IDatabaseOperationFactory<Friendship> friendshipFactory,
        IDatabaseOperationFactory<FriendRequest> friendRequestFactory,
        IDatabaseOperationFactory<AppUser> userFactory,
        IAiAssistantCoordinator aiAssistantCoordinator,
        IChatService chatService,
        ILogger<FriendService> logger)
    {
        _friendshipFactory = friendshipFactory;
        _friendRequestFactory = friendRequestFactory;
        _userFactory = userFactory;
        _aiAssistantCoordinator = aiAssistantCoordinator;
        _chatService = chatService;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task<List<FriendSummaryResponse>> GetFriendsAsync()
    {
        var currentUserId = _friendshipFactory.GetRequiredUserId();

        var filter = _friendshipFactory.CreateFilterBuilder()
            .Equal(f => f.UserId, currentUserId)
            .Build();

        var friendships = await _friendshipFactory.FindAsync(filter);

        if (friendships.Count == 0)
        {
            return new List<FriendSummaryResponse>();
        }

        var friendIds = friendships.Select(f => f.FriendUserId).Distinct().ToList();

        var users = await _userFactory.FindAsync(
            _userFactory.CreateFilterBuilder()
                .In(u => u.Id, friendIds)
                .Build());

        var usersMap = users.ToDictionary(u => u.Id, u => u);

        var response = new List<FriendSummaryResponse>();

        foreach (var friendship in friendships)
        {
            if (!usersMap.TryGetValue(friendship.FriendUserId, out var friendUser))
            {
                continue;
            }

            response.Add(new FriendSummaryResponse
            {
                UserId = friendUser.Id,
                Username = friendUser.Username,
                DisplayName = friendUser.Name ?? friendUser.Username,
                PhoneNumber = friendUser.PhoneNumber,
                FriendshipId = friendship.Id,
                CreatedAt = friendship.CreatedAt
            });
        }

        return response
            .OrderByDescending(f => f.CreatedAt)
            .ToList();
    }

    /// <inheritdoc />
    public async Task<List<FriendSearchResult>> SearchAsync(string? phoneNumber, string? keyword, bool includeAllTenants = false)
    {
        phoneNumber = phoneNumber?.Trim();
        keyword = keyword?.Trim();

        if (string.IsNullOrWhiteSpace(phoneNumber) && string.IsNullOrWhiteSpace(keyword))
        {
            throw new ArgumentException("手机号或关键字至少提供一个");
        }

        var currentUserId = _friendshipFactory.GetRequiredUserId();
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);

        var builder = _userFactory.CreateFilterBuilder();

        if (!string.IsNullOrWhiteSpace(phoneNumber))
        {
            var phoneFilters = new List<FilterDefinition<AppUser>>();
            var escapedPhone = RegexEscape(phoneNumber);
            phoneFilters.Add(Builders<AppUser>.Filter.Regex("phone", new BsonRegularExpression(escapedPhone, "i")));

            var digitsOnly = ExtractDigits(phoneNumber);
            if (!string.IsNullOrEmpty(digitsOnly))
            {
                var flexiblePattern = BuildFlexibleDigitPattern(digitsOnly);
                phoneFilters.Add(Builders<AppUser>.Filter.Regex("phone", new BsonRegularExpression(flexiblePattern, "i")));
            }

            builder.Custom(Builders<AppUser>.Filter.Or(phoneFilters));
        }

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var escaped = RegexEscape(keyword);
            var nameRegex = Builders<AppUser>.Filter.Regex("name", new BsonRegularExpression(escaped, "i"));
            var usernameRegex = Builders<AppUser>.Filter.Regex("username", new BsonRegularExpression(escaped, "i"));
            builder.Custom(Builders<AppUser>.Filter.Or(nameRegex, usernameRegex));
        }

        if (!includeAllTenants && !string.IsNullOrWhiteSpace(currentUser?.CurrentCompanyId))
        {
            builder.Equal(u => u.CurrentCompanyId, currentUser.CurrentCompanyId);
        }

        var users = await _userFactory.FindAsync(builder.Build());

        var friends = await GetFriendsAsync();
        var friendIdSet = friends.Select(f => f.UserId).ToHashSet();

        // 获取待处理请求（当前用户作为请求者或接收者）
        var pendingFilter = Builders<FriendRequest>.Filter.And(
            Builders<FriendRequest>.Filter.Eq(r => r.Status, FriendRequestStatus.Pending),
            Builders<FriendRequest>.Filter.Or(
                Builders<FriendRequest>.Filter.Eq(r => r.RequesterId, currentUserId),
                Builders<FriendRequest>.Filter.Eq(r => r.TargetUserId, currentUserId)));

        var pendingRequests = await _friendRequestFactory.FindAsync(pendingFilter);

        return users.Where(u => u.Id != currentUserId && u.Id != AiAssistantConstants.AssistantUserId)
            .Select(user =>
            {
                var pending = pendingRequests.FirstOrDefault(r =>
                    (r.RequesterId == currentUserId && r.TargetUserId == user.Id) ||
                    (r.RequesterId == user.Id && r.TargetUserId == currentUserId));

                return new FriendSearchResult
                {
                    UserId = user.Id,
                    Username = user.Username,
                    DisplayName = user.Name ?? user.Username,
                    PhoneNumber = user.PhoneNumber,
                    IsFriend = friendIdSet.Contains(user.Id),
                    HasPendingRequest = pending != null,
                    IsIncomingRequest = pending?.RequesterId == user.Id
                };
            })
            .ToList();
    }

    /// <inheritdoc />
    public async Task<FriendRequestResponse> SendFriendRequestAsync(CreateFriendRequestRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);
        request.TargetUserId = request.TargetUserId?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(request.TargetUserId))
        {
            throw new ArgumentException("目标用户不能为空", nameof(request.TargetUserId));
        }

        var currentUserId = _friendRequestFactory.GetRequiredUserId();

        if (!ObjectId.TryParse(request.TargetUserId, out _))
        {
            throw new ArgumentException("目标用户标识格式不正确", nameof(request.TargetUserId));
        }

        if (request.TargetUserId == currentUserId)
        {
            throw new InvalidOperationException("不能添加自己为好友");
        }

        if (request.TargetUserId == AiAssistantConstants.AssistantUserId)
        {
            throw new InvalidOperationException("AI 助手无需发送好友请求");
        }

        var targetUser = await _userFactory.GetByIdAsync(request.TargetUserId)
            ?? throw new KeyNotFoundException("未找到目标用户");

        var existingFriendships = await _friendshipFactory.FindAsync(
            _friendshipFactory.CreateFilterBuilder()
                .Equal(f => f.UserId, currentUserId)
                .Equal(f => f.FriendUserId, targetUser.Id)
                .Build(), limit: 1);

        if (existingFriendships.Any())
        {
            throw new InvalidOperationException("对方已在好友列表中");
        }

        var pendingFilter = Builders<FriendRequest>.Filter.And(
            Builders<FriendRequest>.Filter.Eq(r => r.Status, FriendRequestStatus.Pending),
            Builders<FriendRequest>.Filter.Or(
                Builders<FriendRequest>.Filter.And(
                    Builders<FriendRequest>.Filter.Eq(r => r.RequesterId, currentUserId),
                    Builders<FriendRequest>.Filter.Eq(r => r.TargetUserId, targetUser.Id)),
                Builders<FriendRequest>.Filter.And(
                    Builders<FriendRequest>.Filter.Eq(r => r.RequesterId, targetUser.Id),
                    Builders<FriendRequest>.Filter.Eq(r => r.TargetUserId, currentUserId))));

        var pending = await _friendRequestFactory.FindAsync(pendingFilter, limit: 1);
        if (pending.Any())
        {
            throw new InvalidOperationException("双方存在待处理的好友请求");
        }

        var requesterUser = await _userFactory.GetByIdAsync(currentUserId)
            ?? throw new KeyNotFoundException("未找到当前用户信息");

        var friendRequest = new FriendRequest
        {
            RequesterId = currentUserId,
            RequesterUsername = requesterUser.Username,
            RequesterName = requesterUser.Name ?? requesterUser.Username,
            RequesterPhoneNumber = requesterUser.PhoneNumber,
            TargetUserId = targetUser.Id,
            TargetUsername = targetUser.Username,
            TargetName = targetUser.Name ?? targetUser.Username,
            TargetPhoneNumber = targetUser.PhoneNumber,
            Message = string.IsNullOrWhiteSpace(request.Message) ? null : request.Message.Trim(),
            Status = FriendRequestStatus.Pending
        };

        friendRequest = await _friendRequestFactory.CreateAsync(friendRequest);

        _logger.LogInformation("用户 {RequesterId} 向 {TargetId} 发送好友请求 {RequestId}",
            currentUserId, targetUser.Id, friendRequest.Id);

        return MapToResponse(friendRequest);
    }

    /// <inheritdoc />
    public async Task<List<FriendRequestResponse>> GetFriendRequestsAsync(FriendRequestDirection direction)
    {
        var currentUserId = _friendRequestFactory.GetRequiredUserId();

        var builder = Builders<FriendRequest>.Filter;
        FilterDefinition<FriendRequest> filter = builder.Empty;

        filter = builder.And(
            builder.Eq(r => r.Status, FriendRequestStatus.Pending),
            direction == FriendRequestDirection.Incoming
                ? builder.Eq(r => r.TargetUserId, currentUserId)
                : builder.Eq(r => r.RequesterId, currentUserId));

        var requests = await _friendRequestFactory.FindAsync(filter, limit: null);

        return requests
            .OrderByDescending(r => r.CreatedAt)
            .Select(MapToResponse)
            .ToList();
    }

    /// <inheritdoc />
    public async Task<FriendRequestResponse> ApproveRequestAsync(string requestId)
    {
        var request = await GetPendingRequestAsync(requestId, ensureTargetIsCurrentUser: true);

        var update = _friendRequestFactory.CreateUpdateBuilder()
            .Set(r => r.Status, FriendRequestStatus.Accepted)
            .Set(r => r.ProcessedAt, DateTime.UtcNow)
            .Build();

        var filter = _friendRequestFactory.CreateFilterBuilder()
            .Equal(r => r.Id, request.Id)
            .Build();

        await _friendRequestFactory.FindOneAndUpdateWithoutTenantFilterAsync(filter, update);

        await EnsureFriendshipAsync(
            request.RequesterId,
            request.RequesterUsername,
            request.RequesterName,
            request.RequesterPhoneNumber,
            request.TargetUserId,
            request.TargetUsername,
            request.TargetName,
            request.TargetPhoneNumber);

        await _chatService.GetOrCreateDirectSessionAsync(request.RequesterId);

        request.Status = FriendRequestStatus.Accepted;
        request.ProcessedAt = DateTime.UtcNow;

        return MapToResponse(request);
    }

    /// <inheritdoc />
    public async Task<FriendRequestResponse> RejectRequestAsync(string requestId)
    {
        var request = await GetPendingRequestAsync(requestId, ensureTargetIsCurrentUser: true);

        var update = _friendRequestFactory.CreateUpdateBuilder()
            .Set(r => r.Status, FriendRequestStatus.Rejected)
            .Set(r => r.ProcessedAt, DateTime.UtcNow)
            .Build();

        var filter = _friendRequestFactory.CreateFilterBuilder()
            .Equal(r => r.Id, request.Id)
            .Build();

        await _friendRequestFactory.FindOneAndUpdateWithoutTenantFilterAsync(filter, update);

        request.Status = FriendRequestStatus.Rejected;
        request.ProcessedAt = DateTime.UtcNow;

        return MapToResponse(request);
    }

    /// <inheritdoc />
    public async Task<FriendSessionResponse> EnsureDirectSessionAsync(string friendUserId)
    {
        if (string.IsNullOrWhiteSpace(friendUserId))
        {
            throw new ArgumentException("好友标识不能为空", nameof(friendUserId));
        }

        var currentUserId = _friendshipFactory.GetRequiredUserId();

        if (friendUserId == AiAssistantConstants.AssistantUserId)
        {
            var assistantSession = await _aiAssistantCoordinator.EnsureAssistantSessionForCurrentUserAsync();

            return new FriendSessionResponse
            {
                SessionId = assistantSession.Id,
                FriendUserId = friendUserId
            };
        }

        var friendshipFilter = _friendshipFactory.CreateFilterBuilder()
            .Equal(f => f.UserId, currentUserId)
            .Equal(f => f.FriendUserId, friendUserId)
            .Build();

        var friendship = await _friendshipFactory.FindAsync(friendshipFilter, limit: 1);
        if (!friendship.Any())
        {
            throw new InvalidOperationException("双方尚未建立好友关系");
        }

        var session = await _chatService.GetOrCreateDirectSessionAsync(friendUserId);

        return new FriendSessionResponse
        {
            SessionId = session.Id,
            FriendUserId = friendUserId
        };
    }

    private async Task EnsureFriendshipAsync(
        string requesterId,
        string requesterUsername,
        string? requesterDisplayName,
        string? requesterPhone,
        string targetUserId,
        string targetUsername,
        string? targetDisplayName,
        string? targetPhone)
    {
        // 检查是否已经存在好友关系
        var existing = await _friendshipFactory.FindAsync(
            _friendshipFactory.CreateFilterBuilder()
                .Equal(f => f.UserId, requesterId)
                .Equal(f => f.FriendUserId, targetUserId)
                .Build(), limit: 1);

        if (existing.Any())
        {
            return;
        }

        var now = DateTime.UtcNow;

        var friendships = new List<Friendship>
        {
            new()
            {
                UserId = requesterId,
                FriendUserId = targetUserId,
                FriendUsername = targetUsername,
                FriendDisplayName = targetDisplayName ?? targetUsername,
                FriendPhoneNumber = targetPhone,
                CreatedAt = now,
                UpdatedAt = now
            },
            new()
            {
                UserId = targetUserId,
                FriendUserId = requesterId,
                FriendUsername = requesterUsername,
                FriendDisplayName = requesterDisplayName ?? requesterUsername,
                FriendPhoneNumber = requesterPhone,
                CreatedAt = now,
                UpdatedAt = now
            }
        };

        await _friendshipFactory.CreateManyAsync(friendships);
    }

    private async Task<FriendRequest> GetPendingRequestAsync(string requestId, bool ensureTargetIsCurrentUser)
    {
        if (string.IsNullOrWhiteSpace(requestId))
        {
            throw new ArgumentException("请求标识不能为空", nameof(requestId));
        }

        var currentUserId = _friendRequestFactory.GetRequiredUserId();

        var request = await _friendRequestFactory.GetByIdAsync(requestId)
            ?? throw new KeyNotFoundException("未找到好友请求");

        if (request.Status != FriendRequestStatus.Pending)
        {
            throw new InvalidOperationException("该好友请求已处理");
        }

        if (ensureTargetIsCurrentUser && request.TargetUserId != currentUserId)
        {
            throw new UnauthorizedAccessException("无权处理该好友请求");
        }

        return request;
    }

    private FriendRequestResponse MapToResponse(FriendRequest request)
    {
        return new FriendRequestResponse
        {
            Id = request.Id,
            RequesterId = request.RequesterId,
            RequesterUsername = request.RequesterUsername,
            RequesterDisplayName = request.RequesterName ?? string.Empty,
            RequesterPhoneNumber = request.RequesterPhoneNumber,
            TargetUserId = request.TargetUserId,
            TargetUsername = request.TargetUsername,
            TargetDisplayName = request.TargetName ?? string.Empty,
            TargetPhoneNumber = request.TargetPhoneNumber,
            Status = request.Status,
            Message = request.Message,
            CreatedAt = request.CreatedAt,
            ProcessedAt = request.ProcessedAt
        };
    }

    private static string RegexEscape(string input)
    {
        return Regex.Escape(input ?? string.Empty);
    }

    private static string ExtractDigits(string input)
    {
        return Regex.Replace(input ?? string.Empty, @"\D", string.Empty);
    }

    private static string BuildFlexibleDigitPattern(string digits)
    {
        if (string.IsNullOrEmpty(digits))
        {
            return string.Empty;
        }

        var escapedDigits = digits.Select(c => Regex.Escape(c.ToString()));
        return string.Join(@"[\s\-\_\.]*", escapedDigits);
    }
}

