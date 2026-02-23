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

        RegisterTool("get_users", "分页获取用户列表。关键词：用户,账号,成员,同事",
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

        RegisterTool("get_user_detail", "获取指定用户的详细信息。支持通过 ID 或用户名查询。关键词：用户详情,个人资料",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "用户ID" },
                ["username"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "用户名" }
            }),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                var username = args.GetValueOrDefault("username")?.ToString();
                if (!string.IsNullOrEmpty(id)) return await _userService.GetUserByIdAsync(id);
                if (!string.IsNullOrEmpty(username))
                {
                    var list = await _userService.GetUsersWithPaginationAsync(new UserListRequest { Search = username, Page = 1, PageSize = 1 });
                    if (list.Users.Any()) return await _userService.GetUserByIdAsync(list.Users.First().Id);
                }
                return new { error = "用户未找到" };
            });

        RegisterTool("create_user", "创建新用户（管理后台）。关键词：新增用户,添加成员",
            ObjectSchema(new Dictionary<string, object>
            {
                ["username"] = new Dictionary<string, object> { ["type"] = "string" },
                ["email"] = new Dictionary<string, object> { ["type"] = "string" },
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "显示名称" }
            }, ["username", "email"]),
            async (args, uid) => await _userService.CreateUserManagementAsync(new CreateUserManagementRequest
            {
                Username = args["username"].ToString()!,
                Email = args.GetValueOrDefault("email")?.ToString(),
                IsActive = true
            }));

        RegisterTool("update_user", "更新指定用户的信息。关键词：修改用户,编辑成员",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string" },
                ["name"] = new Dictionary<string, object> { ["type"] = "string" },
                ["email"] = new Dictionary<string, object> { ["type"] = "string" },
                ["isActive"] = new Dictionary<string, object> { ["type"] = "boolean" }
            }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "id is required" };
                return await _userService.UpdateUserManagementAsync(id, new UpdateUserManagementRequest
                {
                    Email = args.GetValueOrDefault("email")?.ToString(),
                    IsActive = args.ContainsKey("isActive") ? (bool)args["isActive"] : null
                });
            });

        RegisterTool("delete_user", "从系统中软删除指定用户。关键词：删除用户,注销账号",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) => await _userService.DeleteUserAsync(args.GetValueOrDefault("id")?.ToString() ?? ""));

        // --- 角色管理 ---

        RegisterTool("get_roles", "获取所有可用角色列表。关键词：角色,权限组",
            async (args, uid) => await _roleService.GetAllRolesAsync());

        // --- 日志与活动 ---

        RegisterTool("get_user_activity_logs", "获取指定用户的活动日志。关键词：操作日志,活动状态",
            ObjectSchema(new Dictionary<string, object>
            {
                ["userId"] = new Dictionary<string, object> { ["type"] = "string" },
                ["limit"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 50 }
            }, ["userId"]),
            async (args, uid) => await _userService.GetUserActivityLogsAsync(
                args["userId"].ToString()!,
                args.ContainsKey("limit") ? int.Parse(args["limit"].ToString()!) : 50));

        // --- 社交/会话 ---

        RegisterTool("get_my_chat_sessions", "获取我参与的所有聊天会话列表。关键词：聊天记录,会话历史",
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
