using System.Text.Json;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// MCP 服务实现
/// </summary>
public class McpService : IMcpService
{
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;
    private readonly IDatabaseOperationFactory<ChatSession> _sessionFactory;
    private readonly IDatabaseOperationFactory<ChatMessage> _messageFactory;
    private readonly IDatabaseOperationFactory<Company> _companyFactory;
    private readonly IDatabaseOperationFactory<Role> _roleFactory;
    private readonly IUserService _userService;
    private readonly IRoleService _roleService;
    private readonly ICompanyService _companyService;
    private readonly IUserActivityLogService _activityLogService;
    private readonly ISocialService _socialService;
    private readonly ILogger<McpService> _logger;

    /// <summary>
    /// 初始化 MCP 服务
    /// </summary>
    /// <param name="userFactory">用户数据操作工厂</param>
    /// <param name="sessionFactory">会话数据操作工厂</param>
    /// <param name="messageFactory">消息数据操作工厂</param>
    /// <param name="companyFactory">企业数据操作工厂</param>
    /// <param name="roleFactory">角色数据操作工厂</param>
    /// <param name="userService">用户服务</param>
    /// <param name="roleService">角色服务</param>
    /// <param name="companyService">企业服务</param>
    /// <param name="activityLogService">活动日志服务</param>
    /// <param name="socialService">社交服务</param>
    /// <param name="logger">日志记录器</param>
    public McpService(
        IDatabaseOperationFactory<AppUser> userFactory,
        IDatabaseOperationFactory<ChatSession> sessionFactory,
        IDatabaseOperationFactory<ChatMessage> messageFactory,
        IDatabaseOperationFactory<Company> companyFactory,
        IDatabaseOperationFactory<Role> roleFactory,
        IUserService userService,
        IRoleService roleService,
        ICompanyService companyService,
        IUserActivityLogService activityLogService,
        ISocialService socialService,
        ILogger<McpService> logger)
    {
        _userFactory = userFactory;
        _sessionFactory = sessionFactory;
        _messageFactory = messageFactory;
        _companyFactory = companyFactory;
        _roleFactory = roleFactory;
        _userService = userService;
        _roleService = roleService;
        _companyService = companyService;
        _activityLogService = activityLogService;
        _socialService = socialService;
        _logger = logger;
    }

    /// <inheritdoc />
    public Task<McpInitializeResponse> InitializeAsync(McpInitializeRequest request)
    {
        request.EnsureNotNull(nameof(request));

        var response = new McpInitializeResponse
        {
            ProtocolVersion = McpProtocolVersion.Version,
            ServerInfo = new McpServerInfo
            {
                Name = "Platform MCP Server",
                Version = "1.0.0",
                ProtocolVersion = McpProtocolVersion.Version
            },
            Capabilities = new Dictionary<string, object>
            {
                ["tools"] = new Dictionary<string, object>
                {
                    ["listChanged"] = true
                },
                ["resources"] = new Dictionary<string, object>
                {
                    ["subscribe"] = true,
                    ["listChanged"] = true
                },
                ["prompts"] = new Dictionary<string, object>
                {
                    ["listChanged"] = true
                }
            }
        };

        return Task.FromResult(response);
    }

    /// <inheritdoc />
    public Task<McpListToolsResponse> ListToolsAsync()
    {
        var tools = new List<McpTool>
        {
            new()
            {
                Name = "get_user_info",
                Description = "获取用户信息。可以通过用户ID、用户名或邮箱查询用户详细信息。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["userId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "用户ID（可选，如果提供则直接查询）"
                        },
                        ["username"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "用户名（可选）"
                        },
                        ["email"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "邮箱地址（可选）"
                        }
                    }
                }
            },
            new()
            {
                Name = "search_users",
                Description = "搜索用户列表。支持按关键词、状态等条件搜索用户。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "搜索关键词（用户名、邮箱等）"
                        },
                        ["status"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "用户状态（active/inactive）",
                            ["enum"] = new[] { "active", "inactive" }
                        },
                        ["page"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "页码（从1开始）",
                            ["default"] = 1,
                            ["minimum"] = 1
                        },
                        ["pageSize"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "每页数量",
                            ["default"] = 20,
                            ["minimum"] = 1,
                            ["maximum"] = 100
                        }
                    }
                }
            },
            new()
            {
                Name = "get_chat_sessions",
                Description = "获取聊天会话列表。可以查询当前用户的所有聊天会话。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "搜索关键词（会话标题）"
                        },
                        ["page"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "页码（从1开始）",
                            ["default"] = 1,
                            ["minimum"] = 1
                        },
                        ["pageSize"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "每页数量",
                            ["default"] = 20,
                            ["minimum"] = 1,
                            ["maximum"] = 100
                        }
                    }
                }
            },
            new()
            {
                Name = "get_chat_messages",
                Description = "获取聊天消息列表。可以查询指定会话的所有消息。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "sessionId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["sessionId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "会话ID（必填）"
                        },
                        ["page"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "页码（从1开始）",
                            ["default"] = 1,
                            ["minimum"] = 1
                        },
                        ["pageSize"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "每页数量",
                            ["default"] = 20,
                            ["minimum"] = 1,
                            ["maximum"] = 200
                        }
                    }
                }
            },
            new()
            {
                Name = "get_nearby_users",
                Description = "获取附近的用户列表。基于地理位置查找附近的用户。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "center" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["center"] = new Dictionary<string, object>
                        {
                            ["type"] = "object",
                            ["required"] = new[] { "latitude", "longitude" },
                            ["properties"] = new Dictionary<string, object>
                            {
                                ["latitude"] = new Dictionary<string, object>
                                {
                                    ["type"] = "number",
                                    ["description"] = "纬度（-90 到 90）"
                                },
                                ["longitude"] = new Dictionary<string, object>
                                {
                                    ["type"] = "number",
                                    ["description"] = "经度（-180 到 180）"
                                }
                            }
                        },
                        ["radiusMeters"] = new Dictionary<string, object>
                        {
                            ["type"] = "number",
                            ["description"] = "搜索半径（米）",
                            ["default"] = 2000,
                            ["minimum"] = 100,
                            ["maximum"] = 20000
                        },
                        ["limit"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "返回数量限制",
                            ["default"] = 20,
                            ["minimum"] = 1,
                            ["maximum"] = 50
                        }
                    }
                }
            },
            new()
            {
                Name = "get_company_info",
                Description = "获取企业信息。可以查询当前企业或指定企业的详细信息。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["companyId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "企业ID（可选，不提供则查询当前企业）"
                        }
                    }
                }
            },
            new()
            {
                Name = "search_companies",
                Description = "搜索企业列表。支持按关键词搜索企业。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "搜索关键词（企业名称、代码等）"
                        }
                    }
                }
            },
            new()
            {
                Name = "get_all_roles",
                Description = "获取所有角色列表。可以查询系统中的所有角色信息，包括角色名称、描述、权限等。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["includeStats"] = new Dictionary<string, object>
                        {
                            ["type"] = "boolean",
                            ["description"] = "是否包含统计信息（用户数量等）",
                            ["default"] = false
                        }
                    }
                }
            },
            new()
            {
                Name = "get_role_info",
                Description = "获取角色详细信息。可以通过角色ID查询角色的详细信息，包括权限、菜单等。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "roleId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["roleId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "角色ID（必填）"
                        }
                    }
                }
            },
            new()
            {
                Name = "get_my_activity_logs",
                Description = "获取我的活动日志。可以查询当前用户的活动记录，包括操作类型、时间、IP地址等。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["action"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "操作类型（可选，如：login、logout、create、update、delete等）"
                        },
                        ["startDate"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "开始日期（可选，ISO 8601格式，如：2024-01-01T00:00:00Z）"
                        },
                        ["endDate"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "结束日期（可选，ISO 8601格式）"
                        },
                        ["page"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "页码（从1开始）",
                            ["default"] = 1,
                            ["minimum"] = 1
                        },
                        ["pageSize"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "每页数量",
                            ["default"] = 20,
                            ["minimum"] = 1,
                            ["maximum"] = 100
                        }
                    }
                }
            }
        };

        return Task.FromResult(new McpListToolsResponse { Tools = tools });
    }

    /// <inheritdoc />
    public async Task<McpCallToolResponse> CallToolAsync(McpCallToolRequest request, string currentUserId)
    {
        request.EnsureNotNull(nameof(request));

        try
        {
            var toolName = request.Name;
            var arguments = request.Arguments ?? new Dictionary<string, object>();

            var result = toolName switch
            {
                "get_user_info" => await HandleGetUserInfoAsync(arguments, currentUserId),
                "search_users" => await HandleSearchUsersAsync(arguments, currentUserId),
                "get_chat_sessions" => await HandleGetChatSessionsAsync(arguments, currentUserId),
                "get_chat_messages" => await HandleGetChatMessagesAsync(arguments, currentUserId),
                "get_nearby_users" => await HandleGetNearbyUsersAsync(arguments, currentUserId),
                "get_company_info" => await HandleGetCompanyInfoAsync(arguments, currentUserId),
                "search_companies" => await HandleSearchCompaniesAsync(arguments, currentUserId),
                "get_all_roles" => await HandleGetAllRolesAsync(arguments, currentUserId),
                "get_role_info" => await HandleGetRoleInfoAsync(arguments, currentUserId),
                "get_my_activity_logs" => await HandleGetMyActivityLogsAsync(arguments, currentUserId),
                _ => throw new ArgumentException($"未知的工具: {toolName}")
            };

            return new McpCallToolResponse
            {
                Content = new List<McpContent>
                {
                    new()
                    {
                        Type = "text",
                        Text = JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true })
                    }
                },
                IsError = false
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "调用工具 {ToolName} 时发生错误", request.Name);
            return new McpCallToolResponse
            {
                Content = new List<McpContent>
                {
                    new()
                    {
                        Type = "text",
                        Text = $"错误: {ex.Message}"
                    }
                },
                IsError = true
            };
        }
    }

    /// <inheritdoc />
    public async Task<McpListResourcesResponse> ListResourcesAsync(string currentUserId)
    {
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null)
        {
            throw new UnauthorizedAccessException("用户不存在");
        }

        var resources = new List<McpResource>
        {
            new()
            {
                Uri = $"user://{currentUserId}",
                Name = "当前用户信息",
                Description = "当前登录用户的详细信息",
                MimeType = "application/json"
            },
            new()
            {
                Uri = $"users://list",
                Name = "用户列表",
                Description = "当前企业的所有用户列表",
                MimeType = "application/json"
            },
            new()
            {
                Uri = $"sessions://list",
                Name = "聊天会话列表",
                Description = "当前用户的所有聊天会话",
                MimeType = "application/json"
            }
        };

        // 添加当前用户的会话资源
        var filter = _sessionFactory.CreateFilterBuilder()
            .Custom(MongoDB.Driver.Builders<ChatSession>.Filter.AnyEq(s => s.Participants, currentUserId))
            .Build();
        var sessions = await _sessionFactory.FindAsync(filter, limit: 10);

        foreach (var session in sessions)
        {
            resources.Add(new McpResource
            {
                Uri = $"session://{session.Id}",
                Name = $"会话: {session.LastMessageExcerpt ?? "未命名会话"}",
                Description = $"会话ID: {session.Id}",
                MimeType = "application/json"
            });
        }

        return new McpListResourcesResponse { Resources = resources };
    }

    /// <inheritdoc />
    public async Task<McpReadResourceResponse> ReadResourceAsync(McpReadResourceRequest request, string currentUserId)
    {
        request.EnsureNotNull(nameof(request));

        var uri = request.Uri;
        var contents = new List<McpContent>();

        try
        {
            if (uri.StartsWith("user://"))
            {
                var userId = uri.Replace("user://", "");
                var user = await _userFactory.GetByIdAsync(userId);
                if (user != null)
                {
                    contents.Add(new McpContent
                    {
                        Type = "text",
                        Text = JsonSerializer.Serialize(new
                        {
                            id = user.Id,
                            username = user.Username,
                            email = user.Email,
                            name = user.Name,
                            currentCompanyId = user.CurrentCompanyId
                        }, new JsonSerializerOptions { WriteIndented = true })
                    });
                }
            }
            else if (uri == "users://list")
            {
                // 直接使用数据访问层，通过 currentUserId 获取企业信息
                var currentUser = await _userFactory.GetByIdAsync(currentUserId);
                if (currentUser != null && !string.IsNullOrEmpty(currentUser.CurrentCompanyId))
                {
                    var filter = _userFactory.CreateFilterBuilder()
                        .Equal(u => u.CurrentCompanyId, currentUser.CurrentCompanyId)
                        .Build();
                    var sort = _userFactory.CreateSortBuilder()
                        .Descending(u => u.CreatedAt)
                        .Build();
                    var users = await _userFactory.FindAsync(filter, sort, limit: 100);
                    contents.Add(new McpContent
                    {
                        Type = "text",
                        Text = JsonSerializer.Serialize(users.Select(u => new
                        {
                            id = u.Id,
                            username = u.Username,
                            email = u.Email,
                            name = u.Name
                        }), new JsonSerializerOptions { WriteIndented = true })
                    });
                }
            }
            else if (uri == "sessions://list")
            {
                var filter = _sessionFactory.CreateFilterBuilder()
                    .Custom(MongoDB.Driver.Builders<ChatSession>.Filter.AnyEq(s => s.Participants, currentUserId))
                    .Build();
                var sort = _sessionFactory.CreateSortBuilder()
                    .Descending(s => s.UpdatedAt)
                    .Build();
                var sessions = await _sessionFactory.FindAsync(filter, sort, limit: 50);
                contents.Add(new McpContent
                {
                    Type = "text",
                    Text = JsonSerializer.Serialize(sessions.Select(s => new
                    {
                        id = s.Id,
                        lastMessageExcerpt = s.LastMessageExcerpt,
                        participantCount = s.Participants?.Count ?? 0,
                        lastMessageAt = s.LastMessageAt
                    }), new JsonSerializerOptions { WriteIndented = true })
                });
            }
            else if (uri.StartsWith("session://"))
            {
                var sessionId = uri.Replace("session://", "");
                var session = await _sessionFactory.GetByIdAsync(sessionId);
                if (session != null)
                {
                    contents.Add(new McpContent
                    {
                        Type = "text",
                        Text = JsonSerializer.Serialize(new
                        {
                            id = session.Id,
                            lastMessageExcerpt = session.LastMessageExcerpt,
                            participants = session.Participants,
                            lastMessageAt = session.LastMessageAt,
                            createdAt = session.CreatedAt
                        }, new JsonSerializerOptions { WriteIndented = true })
                    });
                }
            }
            else
            {
                throw new ArgumentException($"未知的资源URI: {uri}");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "读取资源 {Uri} 时发生错误", uri);
            contents.Add(new McpContent
            {
                Type = "text",
                Text = $"错误: {ex.Message}"
            });
        }

        return new McpReadResourceResponse { Contents = contents };
    }

    /// <inheritdoc />
    public Task<McpListPromptsResponse> ListPromptsAsync()
    {
        var prompts = new List<McpPrompt>
        {
            new()
            {
                Name = "search_user",
                Description = "搜索用户的提示词模板",
                Arguments = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "搜索关键词"
                        }
                    }
                }
            },
            new()
            {
                Name = "get_user_details",
                Description = "获取用户详细信息的提示词模板",
                Arguments = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["userId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "用户ID"
                        }
                    }
                }
            }
        };

        return Task.FromResult(new McpListPromptsResponse { Prompts = prompts });
    }

    /// <inheritdoc />
    public async Task<McpGetPromptResponse> GetPromptAsync(McpGetPromptRequest request, string currentUserId)
    {
        request.EnsureNotNull(nameof(request));

        var promptName = request.Name;
        var arguments = request.Arguments ?? new Dictionary<string, object>();

        var messages = new List<McpContent>();

        switch (promptName)
        {
            case "search_user":
                var keyword = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : "";
                messages.Add(new McpContent
                {
                    Type = "text",
                    Text = $"请帮我搜索用户，关键词是: {keyword}。使用 search_users 工具进行搜索。"
                });
                break;

            case "get_user_details":
                var userId = arguments.ContainsKey("userId") ? arguments["userId"]?.ToString() : "";
                messages.Add(new McpContent
                {
                    Type = "text",
                    Text = $"请帮我获取用户详细信息，用户ID是: {userId}。使用 get_user_info 工具查询。"
                });
                break;

            default:
                throw new ArgumentException($"未知的提示词: {promptName}");
        }

        return new McpGetPromptResponse { Messages = messages };
    }

    #region 工具处理私有方法

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
                var filter = _userFactory.CreateFilterBuilder()
                    .Equal(u => u.CurrentCompanyId, currentUser.CurrentCompanyId)
                    .Equal(u => u.Username, username)
                    .Build();
                user = (await _userFactory.FindAsync(filter, limit: 1)).FirstOrDefault();
            }
        }
        else if (arguments.ContainsKey("email") && arguments["email"] is string email)
        {
            // 直接使用数据访问层，通过 currentUserId 获取企业信息
            var currentUser = await _userFactory.GetByIdAsync(currentUserId);
            if (currentUser != null && !string.IsNullOrEmpty(currentUser.CurrentCompanyId))
            {
                var filter = _userFactory.CreateFilterBuilder()
                    .Equal(u => u.CurrentCompanyId, currentUser.CurrentCompanyId)
                    .Equal(u => u.Email, email)
                    .Build();
                user = (await _userFactory.FindAsync(filter, limit: 1)).FirstOrDefault();
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
        
        // 解析并验证 page 参数（必须 >= 1）
        var page = 1;
        if (arguments.ContainsKey("page") && int.TryParse(arguments["page"]?.ToString(), out var p) && p >= 1)
        {
            page = p;
        }
        
        // 解析并验证 pageSize 参数（必须 >= 1，最大 100）
        var pageSize = 20;
        if (arguments.ContainsKey("pageSize") && int.TryParse(arguments["pageSize"]?.ToString(), out var ps) && ps >= 1)
        {
            pageSize = Math.Min(ps, 100); // 限制最大值为 100
        }

        // 直接使用数据访问层，通过 currentUserId 获取企业信息
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            return new { error = "未找到当前企业信息" };
        }
        var currentCompanyId = currentUser.CurrentCompanyId;

        // 构建查询过滤器
        var filterBuilder = _userFactory.CreateFilterBuilder()
            .Equal(u => u.CurrentCompanyId, currentCompanyId);

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            filterBuilder = filterBuilder.Custom(
                MongoDB.Driver.Builders<AppUser>.Filter.Or(
                    MongoDB.Driver.Builders<AppUser>.Filter.Regex(u => u.Username, new MongoDB.Bson.BsonRegularExpression(keyword, "i")),
                    MongoDB.Driver.Builders<AppUser>.Filter.Regex(u => u.Email, new MongoDB.Bson.BsonRegularExpression(keyword, "i")),
                    MongoDB.Driver.Builders<AppUser>.Filter.Regex(u => u.Name, new MongoDB.Bson.BsonRegularExpression(keyword, "i"))
                ));
        }

        if (!string.IsNullOrEmpty(status))
        {
            var isActive = status.ToLowerInvariant() == "active";
            filterBuilder = filterBuilder.Equal(u => u.IsActive, isActive);
        }

        var filter = filterBuilder.Build();
        var sort = _userFactory.CreateSortBuilder()
            .Descending(u => u.CreatedAt)
            .Build();

        var (users, total) = await _userFactory.FindPagedAsync(filter, sort, page, pageSize);

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
        
        // 解析并验证 page 参数（必须 >= 1）
        var page = 1;
        if (arguments.ContainsKey("page") && int.TryParse(arguments["page"]?.ToString(), out var p) && p >= 1)
        {
            page = p;
        }
        
        // 解析并验证 pageSize 参数（必须 >= 1，最大 100）
        var pageSize = 20;
        if (arguments.ContainsKey("pageSize") && int.TryParse(arguments["pageSize"]?.ToString(), out var ps) && ps >= 1)
        {
            pageSize = Math.Min(ps, 100); // 限制最大值为 100
        }

        var filterBuilder = _sessionFactory.CreateFilterBuilder()
            .Custom(MongoDB.Driver.Builders<ChatSession>.Filter.AnyEq(s => s.Participants, currentUserId));

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            filterBuilder = filterBuilder.Custom(
                MongoDB.Driver.Builders<ChatSession>.Filter.Regex("topicTags", new MongoDB.Bson.BsonRegularExpression(keyword, "i")));
        }

        var filter = filterBuilder.Build();
        var sort = _sessionFactory.CreateSortBuilder()
            .Descending(s => s.UpdatedAt)
            .Build();

        var (sessions, total) = await _sessionFactory.FindPagedAsync(filter, sort, page, pageSize);

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

        // 解析并验证 page 参数（必须 >= 1）
        var page = 1;
        if (arguments.ContainsKey("page") && int.TryParse(arguments["page"]?.ToString(), out var p) && p >= 1)
        {
            page = p;
        }
        
        // 解析并验证 pageSize 参数（必须 >= 1，最大 100）
        var pageSize = 20;
        if (arguments.ContainsKey("pageSize") && int.TryParse(arguments["pageSize"]?.ToString(), out var ps) && ps >= 1)
        {
            pageSize = Math.Min(ps, 100); // 限制最大值为 100
        }

        var filter = _messageFactory.CreateFilterBuilder()
            .Equal(m => m.SessionId, sessionId)
            .Build();
        var sort = _messageFactory.CreateSortBuilder()
            .Descending(m => m.CreatedAt)
            .Build();

        var (messages, total) = await _messageFactory.FindPagedAsync(filter, sort, page, pageSize);

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
        
        // 解析并验证 page 参数（必须 >= 1）
        var page = 1;
        if (arguments.ContainsKey("page") && int.TryParse(arguments["page"]?.ToString(), out var p) && p >= 1)
        {
            page = p;
        }
        
        // 解析并验证 pageSize 参数（必须 >= 1，最大 100）
        var pageSize = 20;
        if (arguments.ContainsKey("pageSize") && int.TryParse(arguments["pageSize"]?.ToString(), out var ps) && ps >= 1)
        {
            pageSize = Math.Min(ps, 100); // 限制最大值为 100
        }

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

