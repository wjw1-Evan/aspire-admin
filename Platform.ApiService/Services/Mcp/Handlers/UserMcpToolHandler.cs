using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 用户与社交管理 MCP 工具处理器（用户管理、角色、日志、会话）
/// </summary>
public class UserMcpToolHandler : McpToolHandlerBase
{
    private readonly IUserService _userService;
    private readonly IRoleService _roleService;
    private readonly IDataFactory<ChatSession> _sessionFactory;
    private readonly ILogger<UserMcpToolHandler> _logger;

    /// <summary>
    /// 初始化用户管理 MCP 处理器
    /// </summary>
    /// <param name="userService">用户服务</param>
    /// <param name="roleService">角色服务</param>
    /// <param name="sessionFactory">聊天会话工厂</param>
    /// <param name="logger">日志处理器</param>
    public UserMcpToolHandler(
        IUserService userService,
        IRoleService roleService,
        IDataFactory<ChatSession> sessionFactory,
        ILogger<UserMcpToolHandler> logger)
    {
        _userService = userService;
        _roleService = roleService;
        _sessionFactory = sessionFactory;
        _logger = logger;

        // --- 用户管理 ---

        RegisterTool("get_users", "分页获取用户列表。",
            ObjectSchema(MergeProperties(new Dictionary<string, object>
            {
                ["search"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词（用户名、邮箱）" },
                ["isActive"] = new Dictionary<string, object> { ["type"] = "boolean", ["description"] = "是否激活" }
            }, PaginationSchema())),
            async (args, uid) =>
            {
                var pagination = ParsePaginationArgs(args);
                return await _userService.GetUsersWithPaginationAsync(new UserListRequest
                {
                    Search = args.GetValueOrDefault("search")?.ToString(),
                    IsActive = args.ContainsKey("isActive") && bool.TryParse(args["isActive"].ToString(), out var a) ? a : null,
                    Page = pagination.page,
                    PageSize = pagination.pageSize
                });
            });

        RegisterTool("get_user_detail", "获取指定用户的详细信息。",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "用户ID" } }, ["id"]),
            async (args, uid) => await _userService.GetUserByIdAsync(args["id"].ToString()!));

        RegisterTool("create_user", "创建新用户（管理后台）。",
            ObjectSchema(new Dictionary<string, object>
            {
                ["username"] = new Dictionary<string, object> { ["type"] = "string" },
                ["email"] = new Dictionary<string, object> { ["type"] = "string" },
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "显示名称" }
            }, ["username", "email"]),
            async (args, uid) => await _userService.CreateUserManagementAsync(new CreateUserManagementRequest
            {
                Username = args["username"].ToString()!,
                Email = args["email"].ToString(),
                IsActive = true
            }));

        // --- 角色管理 ---

        RegisterTool("get_roles", "获取所有可用角色列表。",
            async (args, uid) => await _roleService.GetAllRolesAsync());

        // --- 日志与活动 ---

        RegisterTool("get_user_activity_logs", "获取指定用户的活动日志。",
            ObjectSchema(new Dictionary<string, object>
            {
                ["userId"] = new Dictionary<string, object> { ["type"] = "string" },
                ["limit"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 50 }
            }, ["userId"]),
            async (args, uid) => await _userService.GetUserActivityLogsAsync(
                args["userId"].ToString()!,
                args.ContainsKey("limit") ? int.Parse(args["limit"].ToString()!) : 50));

        // --- 社交/会话 ---

        RegisterTool("get_my_chat_sessions", "获取我参与的所有聊天会话列表。",
            async (args, uid) =>
            {
                var sessions = await _sessionFactory.FindAsync(s => s.Participants.Contains(uid), q => q.OrderByDescending(s => s.LastMessageAt), 100);
                return sessions.Select(s => new
                {
                    s.Id,
                    Participants = s.Participants,
                    LastMessage = s.LastMessageExcerpt,
                    UpdatedAt = s.LastMessageAt ?? s.CreatedAt
                });
            });
    }
}
