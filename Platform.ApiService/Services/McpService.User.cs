using System.Text.Json;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
namespace Platform.ApiService.Services;
/// <summary>
/// MCP 服务实现
/// </summary>

public partial class McpService
{
    #region 工具处理私有方法

    /// <summary>
    /// 解析分页参数
    /// </summary>
    private static (int page, int pageSize) ParsePaginationArgs(Dictionary<string, object> arguments, int defaultPageSize = 20, int maxPageSize = 100)
    {
        var page = 1;
        if (arguments.ContainsKey("page") && int.TryParse(arguments["page"]?.ToString(), out var p) && p >= 1)
        {
            page = p;
        }

        var pageSize = defaultPageSize;
        if (arguments.ContainsKey("pageSize") && int.TryParse(arguments["pageSize"]?.ToString(), out var ps) && ps >= 1)
        {
            pageSize = Math.Min(ps, maxPageSize);
        }

        return (page, pageSize);
    }

    private async Task<object> HandleGetUserInfoAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        AppUser? user = null;

        if (arguments.ContainsKey("userId") && arguments["userId"] is string userId)
        {
            user = await _userFactory.GetByIdAsync(userId);
        }
        else if (arguments.ContainsKey("username") && arguments["username"] is string username)
        {
            // 直接使用数据访问层，通过 currentUserId 获取企业信息
            var currentUser = await _userFactory.GetByIdAsync(currentUserId);
            if (currentUser != null && !string.IsNullOrEmpty(currentUser.CurrentCompanyId))
            {
                var companyId = currentUser.CurrentCompanyId;
                user = (await _userFactory.FindAsync(
                    u => u.CurrentCompanyId == companyId && u.Username == username,
                    limit: 1)).FirstOrDefault();
            }
        }
        else if (arguments.ContainsKey("email") && arguments["email"] is string email)
        {
            // 直接使用数据访问层，通过 currentUserId 获取企业信息
            var currentUser = await _userFactory.GetByIdAsync(currentUserId);
            if (currentUser != null && !string.IsNullOrEmpty(currentUser.CurrentCompanyId))
            {
                var companyId = currentUser.CurrentCompanyId;
                user = (await _userFactory.FindAsync(
                    u => u.CurrentCompanyId == companyId && u.Email == email,
                    limit: 1)).FirstOrDefault();
            }
        }
        else
        {
            // 如果没有提供参数，返回当前用户
            user = await _userFactory.GetByIdAsync(currentUserId);
        }

        if (user == null)
        {
            return new { error = "用户未找到" };
        }

        return new
        {
            id = user.Id,
            username = user.Username,
            email = user.Email,
            name = user.Name,
            currentCompanyId = user.CurrentCompanyId,
            createdAt = user.CreatedAt
        };
    }

    private async Task<object> HandleSearchUsersAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var keyword = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : "";
        var status = arguments.ContainsKey("status") ? arguments["status"]?.ToString() : "";
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 20, maxPageSize: 100);

        // 直接使用数据访问层，通过 currentUserId 获取企业信息
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            return new { error = "未找到当前企业信息" };
        }
        var currentCompanyId = currentUser.CurrentCompanyId;

        // 构建并执行分页查询
        var (users, total) = await _userFactory.FindPagedAsync(
            u => u.CurrentCompanyId == currentCompanyId &&
                 (string.IsNullOrEmpty(keyword) ||
                  (u.Username != null && u.Username.ToLower().Contains(keyword.ToLower())) ||
                  (u.Email != null && u.Email.ToLower().Contains(keyword.ToLower())) ||
                  (u.Name != null && u.Name.ToLower().Contains(keyword.ToLower()))) &&
                 (string.IsNullOrEmpty(status) || u.IsActive == (status.ToLowerInvariant() == "active")),
            q => q.OrderByDescending(u => u.CreatedAt),
            page,
            pageSize);

        // 直接使用查询结果，已经完成过滤和分页
        var items = users.Select(u => new
        {
            id = u.Id,
            username = u.Username,
            email = u.Email,
            name = u.Name
        }).ToList();

        return new
        {
            items,
            total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(total / (double)pageSize)
        };
    }

    private async Task<object> HandleGetChatSessionsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var keyword = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : "";
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 20, maxPageSize: 100);

        var (sessions, total) = await _sessionFactory.FindPagedAsync(
            s => s.Participants != null && s.Participants.Contains(currentUserId) &&
                 (string.IsNullOrEmpty(keyword) ||
                  (s.TopicTags != null && s.TopicTags.Any(t => t.ToLower().Contains(keyword.ToLower())))),
            q => q.OrderByDescending(s => s.UpdatedAt),
            page,
            pageSize);

        return new
        {
            items = sessions.Select(s => new
            {
                id = s.Id,
                lastMessageExcerpt = s.LastMessageExcerpt,
                participantCount = s.Participants?.Count ?? 0,
                lastMessageAt = s.LastMessageAt,
                createdAt = s.CreatedAt
            }).ToList(),
            total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(total / (double)pageSize)
        };
    }

    private async Task<object> HandleGetChatMessagesAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("sessionId") || arguments["sessionId"] is not string sessionId)
        {
            return new { error = "缺少必需的参数: sessionId" };
        }

        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 20, maxPageSize: 100);

        var (messages, total) = await _messageFactory.FindPagedAsync(
            m => m.SessionId == sessionId,
            q => q.OrderByDescending(m => m.CreatedAt),
            page,
            pageSize);

        return new
        {
            items = messages.Select(m => new
            {
                id = m.Id,
                sessionId = m.SessionId,
                senderId = m.SenderId,
                content = m.Content,
                type = m.Type.ToString(),
                createdAt = m.CreatedAt
            }).ToList(),
            total,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(total / (double)pageSize)
        };
    }

    private async Task<object> HandleGetNearbyUsersAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("center") || arguments["center"] is not Dictionary<string, object> centerDict)
        {
            return new { error = "缺少必需的参数: center" };
        }

        if (!centerDict.ContainsKey("latitude") || !double.TryParse(centerDict["latitude"]?.ToString(), out var latitude))
        {
            return new { error = "缺少或无效的参数: center.latitude" };
        }

        if (!centerDict.ContainsKey("longitude") || !double.TryParse(centerDict["longitude"]?.ToString(), out var longitude))
        {
            return new { error = "缺少或无效的参数: center.longitude" };
        }

        var radiusMeters = arguments.ContainsKey("radiusMeters") && double.TryParse(arguments["radiusMeters"]?.ToString(), out var rm) ? rm : 2000.0;
        var limit = arguments.ContainsKey("limit") && int.TryParse(arguments["limit"]?.ToString(), out var l) ? l : 20;

        var request = new NearbyUsersRequest
        {
            Center = new GeoPoint
            {
                Latitude = latitude,
                Longitude = longitude
            },
            RadiusMeters = radiusMeters,
            Limit = limit
        };

        var response = await _socialService.GetNearbyUsersAsync(request);

        return new
        {
            users = response.Items?.Select(u => new
            {
                userId = u.UserId,
                displayName = u.DisplayName,
                avatarUrl = u.AvatarUrl,
                distanceMeters = u.DistanceMeters,
                lastActiveAt = u.LastActiveAt,
                location = u.Location != null ? new
                {
                    latitude = u.Location.Latitude,
                    longitude = u.Location.Longitude
                } : null
            }).ToList(),
            total = response.Items?.Count ?? 0
        };
    }

    private async Task<object> HandleGetCompanyInfoAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        string? companyId = null;
        if (arguments.ContainsKey("companyId") && arguments["companyId"] is string cid)
        {
            companyId = cid;
        }
        else
        {
            var currentUser = await _userFactory.GetByIdAsync(currentUserId);
            companyId = currentUser?.CurrentCompanyId;
        }

        if (string.IsNullOrEmpty(companyId))
        {
            return new { error = "无法确定企业ID" };
        }

        var company = await _companyFactory.GetByIdAsync(companyId);
        if (company == null)
        {
            return new { error = "企业未找到" };
        }

        return new
        {
            id = company.Id,
            name = company.Name,
            code = company.Code,
            description = company.Description,
            createdAt = company.CreatedAt
        };
    }

    private async Task<object> HandleSearchCompaniesAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var keyword = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : "";

        if (string.IsNullOrWhiteSpace(keyword))
        {
            // 如果没有关键词，返回当前企业的所有企业列表（如果用户有权限）
            var companies = await _companyService.GetAllCompaniesAsync();
            return new
            {
                items = companies.Select(c => new
                {
                    id = c.Id,
                    name = c.Name,
                    code = c.Code,
                    description = c.Description
                }).ToList(),
                total = companies.Count
            };
        }

        var results = await _companyService.SearchCompaniesAsync(keyword);
        return new
        {
            items = results.Select(r => new
            {
                id = r.Company.Id,
                name = r.Company.Name,
                code = r.Company.Code,
                description = r.Company.Description,
                isMember = r.IsMember,
                memberCount = r.MemberCount
            }).ToList(),
            total = results.Count
        };
    }

    private async Task<object> HandleGetAllRolesAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var includeStats = arguments.ContainsKey("includeStats") &&
                          bool.TryParse(arguments["includeStats"]?.ToString(), out var stats) && stats;

        if (includeStats)
        {
            var response = await _roleService.GetAllRolesWithStatsAsync();
            return new
            {
                items = response.Roles.Select(r => new
                {
                    id = r.Id,
                    name = r.Name,
                    description = r.Description,
                    isActive = r.IsActive,
                    menuCount = r.MenuCount,
                    userCount = r.UserCount,
                    createdAt = r.CreatedAt
                }).ToList(),
                total = response.Total
            };
        }
        else
        {
            var response = await _roleService.GetAllRolesAsync();
            return new
            {
                items = response.Roles.Select(r => new
                {
                    id = r.Id,
                    name = r.Name,
                    title = r.Title,
                    description = r.Description,
                    isActive = r.IsActive,
                    menuCount = r.MenuIds?.Count ?? 0,
                    createdAt = r.CreatedAt
                }).ToList(),
                total = response.Total
            };
        }
    }

    private async Task<object> HandleGetRoleInfoAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("roleId") || arguments["roleId"] is not string roleId)
        {
            return new { error = "缺少必需的参数: roleId" };
        }

        var role = await _roleService.GetRoleByIdAsync(roleId);
        if (role == null)
        {
            return new { error = "角色未找到" };
        }

        var menuIds = await _roleService.GetRoleMenuIdsAsync(roleId);

        return new
        {
            id = role.Id,
            name = role.Name,
            title = role.Title,
            description = role.Description,
            isActive = role.IsActive,
            menuIds = menuIds,
            menuCount = menuIds.Count,
            createdAt = role.CreatedAt,
            updatedAt = role.UpdatedAt
        };
    }

    private async Task<object> HandleGetMyActivityLogsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var action = arguments.ContainsKey("action") ? arguments["action"]?.ToString() : "";
        var startDateStr = arguments.ContainsKey("startDate") ? arguments["startDate"]?.ToString() : "";
        var endDateStr = arguments.ContainsKey("endDate") ? arguments["endDate"]?.ToString() : "";
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 20, maxPageSize: 100);

        DateTime? startDate = null;
        DateTime? endDate = null;

        if (!string.IsNullOrWhiteSpace(startDateStr) && DateTime.TryParse(startDateStr, out var sd))
        {
            startDate = sd;
        }

        if (!string.IsNullOrWhiteSpace(endDateStr) && DateTime.TryParse(endDateStr, out var ed))
        {
            endDate = ed;
        }

        var request = new GetUserActivityLogsRequest
        {
            UserId = currentUserId,
            Action = action,
            StartDate = startDate,
            EndDate = endDate,
            Page = page,
            PageSize = pageSize
        };

        _logger.LogInformation("查询用户活动日志: UserId={UserId}, Action={Action}, Page={Page}, PageSize={PageSize}",
            currentUserId, action, page, pageSize);

        var response = await _activityLogService.GetActivityLogsAsync(request);

        _logger.LogInformation("活动日志查询结果: Total={Total}, ItemsCount={ItemsCount}",
            response.Total, response.Data?.Count ?? 0);

        var items = (response.Data ?? Enumerable.Empty<UserActivityLog>()).Select(log => new
        {
            id = log.Id,
            action = log.Action,
            description = log.Description,
            ipAddress = log.IpAddress,
            userAgent = log.UserAgent,
            createdAt = log.CreatedAt
        }).ToList();

        return new
        {
            items = items,
            total = response.Total,
            page = response.Page,
            pageSize = response.PageSize,
            totalPages = response.Total > 0 ? (int)Math.Ceiling(response.Total / (double)response.PageSize) : 0,
            message = response.Total == 0 ? "未找到活动记录" : null
        };
    }

    #endregion
}
