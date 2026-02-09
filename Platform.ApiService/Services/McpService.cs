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
    private readonly IDatabaseOperationFactory<RuleListItem> _ruleFactory;
    private readonly IUserService _userService;
    private readonly IRoleService _roleService;
    private readonly ICompanyService _companyService;
    private readonly IUserActivityLogService _activityLogService;
    private readonly ISocialService _socialService;
    private readonly ITaskService _taskService;
    private readonly IProjectService _projectService;
    private readonly IDocumentService _documentService;
    private readonly ICloudStorageService _cloudStorageService;
    private readonly IUnifiedNotificationService _unifiedNotificationService;
    private readonly IXiaokeConfigService? _xiaokeConfigService;
    private readonly IIoTService _iotService;
    private readonly IParkAssetService _parkAssetService;
    private readonly IParkInvestmentService _parkInvestmentService;
    private readonly IParkTenantService _parkTenantService;
    private readonly IParkEnterpriseServiceService _parkEnterpriseService;
    private readonly IParkVisitService _parkVisitService;
    private readonly IPasswordBookService _passwordBookService;
    private readonly ILogger<McpService> _logger;
    private List<McpTool>? _cachedTools;
    private DateTime _toolsCacheTime = DateTime.MinValue;
    private const int CacheDurationSeconds = 300; // 5 minutes

    /// <summary>
    /// 初始化 MCP 服务
    /// </summary>
    /// <param name="userFactory">用户数据操作工厂</param>
    /// <param name="sessionFactory">会话数据操作工厂</param>
    /// <param name="messageFactory">消息数据操作工厂</param>
    /// <param name="companyFactory">企业数据操作工厂</param>
    /// <param name="roleFactory">角色数据操作工厂</param>
    /// <param name="ruleFactory">规则数据操作工厂</param>
    /// <param name="userService">用户服务</param>
    /// <param name="roleService">角色服务</param>
    /// <param name="companyService">企业服务</param>
    /// <param name="activityLogService">活动日志服务</param>
    /// <param name="socialService">社交服务</param>
    /// <param name="taskService">任务服务</param>
    /// <param name="projectService">项目服务</param>
    /// <param name="documentService">公文服务</param>
    /// <param name="cloudStorageService">云存储服务</param>
    /// <param name="unifiedNotificationService">统一通知服务</param>
    /// <param name="xiaokeConfigService">小科配置服务（可选）</param>
    /// <param name="iotService">物联网服务</param>
    /// <param name="parkAssetService">园区资产服务</param>
    /// <param name="parkInvestmentService">园区招商服务</param>
    /// <param name="parkTenantService">园区租户服务</param>
    /// <param name="parkEnterpriseService">园区企业服务</param>
    /// <param name="parkVisitService">园区走访服务</param>
    /// <param name="passwordBookService">密码本服务</param>
    /// <param name="logger">日志记录器</param>
    public McpService(
        IDatabaseOperationFactory<AppUser> userFactory,
        IDatabaseOperationFactory<ChatSession> sessionFactory,
        IDatabaseOperationFactory<ChatMessage> messageFactory,
        IDatabaseOperationFactory<Company> companyFactory,
        IDatabaseOperationFactory<Role> roleFactory,
        IDatabaseOperationFactory<RuleListItem> ruleFactory,
        IUserService userService,
        IRoleService roleService,
        ICompanyService companyService,
        IUserActivityLogService activityLogService,
        ISocialService socialService,
        ITaskService taskService,
        IProjectService projectService,
        IDocumentService documentService,
        ICloudStorageService cloudStorageService,
        IUnifiedNotificationService unifiedNotificationService,
        IXiaokeConfigService? xiaokeConfigService,
        IIoTService iotService,
        IParkAssetService parkAssetService,
        IParkInvestmentService parkInvestmentService,
        IParkTenantService parkTenantService,
        IParkEnterpriseServiceService parkEnterpriseService,
        IParkVisitService parkVisitService,
        IPasswordBookService passwordBookService,
        ILogger<McpService> logger)
    {
        _userFactory = userFactory;
        _sessionFactory = sessionFactory;
        _messageFactory = messageFactory;
        _companyFactory = companyFactory;
        _roleFactory = roleFactory;
        _ruleFactory = ruleFactory;
        _userService = userService;
        _roleService = roleService;
        _companyService = companyService;
        _activityLogService = activityLogService;
        _socialService = socialService;
        _taskService = taskService;
        _projectService = projectService;
        _documentService = documentService;
        _cloudStorageService = cloudStorageService;
        _unifiedNotificationService = unifiedNotificationService;
        _xiaokeConfigService = xiaokeConfigService;
        _iotService = iotService;
        _parkAssetService = parkAssetService;
        _parkInvestmentService = parkInvestmentService;
        _parkTenantService = parkTenantService;
        _parkEnterpriseService = parkEnterpriseService;
        _parkVisitService = parkVisitService;
        _passwordBookService = passwordBookService;
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
    public async Task<McpListToolsResponse> ListToolsAsync()
    {
        // 检查缓存
        if (_cachedTools != null && DateTime.UtcNow.Subtract(_toolsCacheTime).TotalSeconds < CacheDurationSeconds)
        {
            _logger.LogInformation("使用缓存的 MCP 工具列表");
            return new McpListToolsResponse { Tools = _cachedTools };
        }

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
            },
            new()
            {
                Name = "get_tasks",
                Description = "获取任务列表。支持按状态、优先级、分配人等条件查询任务。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["status"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "任务状态（0=待分配, 1=已分配, 2=执行中, 3=已完成, 4=已取消, 5=失败, 6=暂停）"
                        },
                        ["priority"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "优先级（0=低, 1=中, 2=高, 3=紧急）"
                        },
                        ["assignedTo"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "分配给的用户ID"
                        },
                        ["projectId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "项目ID（可选）"
                        },
                        ["search"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "搜索关键词（任务名称、描述等）"
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
                Name = "get_task_detail",
                Description = "获取任务详细信息。包括任务的完整信息、执行日志等。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "taskId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["taskId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "任务ID（必填）"
                        }
                    }
                }
            },
            new()
            {
                Name = "create_task",
                Description = "创建新任务。用于创建待分配的任务。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "taskName", "taskType" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["taskName"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "任务名称（必填）"
                        },
                        ["description"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "任务描述（可选）"
                        },
                        ["taskType"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "任务类型（必填，如：bug、feature、maintenance等）"
                        },
                        ["priority"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "优先级（0=低, 1=中, 2=高, 3=紧急）",
                            ["default"] = 1
                        },
                        ["assignedTo"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "分配给的用户ID（可选）"
                        },
                        ["projectId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "项目ID（可选）"
                        },
                        ["estimatedDuration"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "预计耗时（分钟，可选）"
                        },
                        ["tags"] = new Dictionary<string, object>
                        {
                            ["type"] = "array",
                            ["items"] = new Dictionary<string, object> { ["type"] = "string" },
                            ["description"] = "标签列表（可选）"
                        },
                        ["plannedStartTime"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "计划开始时间（ISO 8601，可选，如：2025-12-03T10:00:00Z）"
                        },
                        ["plannedEndTime"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "计划完成时间（ISO 8601，可选）"
                        },
                        ["participantIds"] = new Dictionary<string, object>
                        {
                            ["type"] = "array",
                            ["items"] = new Dictionary<string, object> { ["type"] = "string" },
                            ["description"] = "参与者用户ID列表（可选）"
                        },
                        ["remarks"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "备注（可选）"
                        }
                    }
                }
            },
            new()
            {
                Name = "update_task",
                Description = "更新任务信息。可以更新任务的名称、描述、状态、优先级等。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "taskId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["taskId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "任务ID（必填）"
                        },
                        ["taskName"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "任务名称（可选）"
                        },
                        ["description"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "任务描述（可选）"
                        },
                        ["status"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "任务状态（可选）"
                        },
                        ["priority"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "优先级（可选）"
                        },
                        ["completionPercentage"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "完成百分比（0-100，可选）"
                        }
                    }
                }
            },
            new()
            {
                Name = "assign_task",
                Description = "分配任务给指定用户。将待分配的任务分配给具体的执行人。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "taskId", "assignedTo" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["taskId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "任务ID（必填）"
                        },
                        ["assignedTo"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "分配给的用户ID（必填）"
                        },
                        ["remarks"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "分配备注（可选）"
                        }
                    }
                }
            },
            new()
            {
                Name = "complete_task",
                Description = "完成任务。标记任务为已完成，并记录执行结果。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "taskId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["taskId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "任务ID（必填）"
                        },
                        ["executionResult"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "执行结果（0=未执行, 1=成功, 2=失败, 3=超时, 4=被中断）",
                            ["default"] = 1
                        },
                        ["remarks"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "完成备注（可选）"
                        }
                    }
                }
            },
            new()
            {
                Name = "get_task_statistics",
                Description = "获取任务统计信息。包括各状态任务数、完成率等统计数据。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["userId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "用户ID（可选，用于获取用户相关的统计）"
                        }
                    }
                }
            },
            new()
            {
                Name = "get_my_task_count",
                Description = "获取我的任务数量。快速查询当前用户的任务总数和各状态任务数。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["includeCompleted"] = new Dictionary<string, object>
                        {
                            ["type"] = "boolean",
                            ["description"] = "是否包含已完成的任务",
                            ["default"] = false
                        }
                    }
                }
            },
            new()
            {
                Name = "get_my_tasks",
                Description = "获取我的任务。获取当前用户分配给我的所有任务。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["status"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "任务状态（可选）"
                        },
                        ["projectId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "项目ID（可选）"
                        },
                        ["search"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "搜索关键词（可选）"
                        },
                        ["page"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "页码",
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
            // 项目管理相关工具
            new()
            {
                Name = "get_projects",
                Description = "获取项目列表。支持按关键词、状态等条件查询项目。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["search"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" },
                        ["isArchived"] = new Dictionary<string, object> { ["type"] = "boolean", ["description"] = "是否已归档" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "get_project_detail",
                Description = "获取项目详细信息。包括项目基本信息、成员列表。项目ID必填。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "projectId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["projectId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "项目ID" }
                    }
                }
            },
            new()
            {
                Name = "create_project",
                Description = "创建新项目。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "name" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "项目名称" },
                        ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "项目描述" },
                        ["startDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "开始时间 (ISO 8601)" },
                        ["endDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "结束时间 (ISO 8601)" }
                    }
                }
            },
            new()
            {
                Name = "get_project_statistics",
                Description = "获取项目统计信息。",
                InputSchema = new Dictionary<string, object> { ["type"] = "object", ["properties"] = new Dictionary<string, object>() }
            },
            // 公文管理相关工具
            new()
            {
                Name = "get_documents",
                Description = "获取公文列表。支持按关键词、状态、分类等条件查询公文。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" },
                        ["status"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "公文状态 (0=草稿, 1=审批中, 2=已通过, 3=已驳回)" },
                        ["documentType"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "公文类型" },
                        ["category"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "分类" },
                        ["filterType"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "筛选类型 (all, my, pending, approved, rejected)" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "get_document_detail",
                Description = "获取公文详细信息。公文ID必填。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "documentId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["documentId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "公文ID" }
                    }
                }
            },
            new()
            {
                Name = "get_document_statistics",
                Description = "获取公文统计信息。",
                InputSchema = new Dictionary<string, object> { ["type"] = "object", ["properties"] = new Dictionary<string, object>() }
            },
            // 云存储相关工具
            new()
            {
                Name = "get_file_items",
                Description = "列出文件夹内容。parentId 必填（根目录为 'root'）。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "parentId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["parentId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "父文件夹ID ('root' 表示根目录)" },
                        ["search"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" },
                        ["fileType"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "文件类型 (all, document, image, video, audio, archive, other)" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 50 }
                    }
                }
            },
            new()
            {
                Name = "search_files",
                Description = "快速搜索全量文件。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "keyword" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "create_folder",
                Description = "在指定父目录下创建新文件夹。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "name", "parentId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "文件夹名称" },
                        ["parentId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "父文件夹ID" }
                    }
                }
            },
            new()
            {
                Name = "get_storage_usage",
                Description = "获取当前用户的存储空间使用详情。",
                InputSchema = new Dictionary<string, object> { ["type"] = "object", ["properties"] = new Dictionary<string, object>() }
            },
            // 通知中心相关工具
            new()
            {
                Name = "get_unified_notifications",
                Description = "获取统一通知中心列表。支持 filterType: all, notification, message, task, system; sortBy: datetime, priority, dueDate",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1, ["minimum"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 10, ["minimum"] = 1, ["maximum"] = 100 },
                        ["filterType"] = new Dictionary<string, object> { ["type"] = "string", ["default"] = "all" },
                        ["sortBy"] = new Dictionary<string, object> { ["type"] = "string", ["default"] = "datetime" }
                    }
                }
            },
            new()
            {
                Name = "get_unread_notification_stats",
                Description = "获取未读通知统计信息（总数、系统、通知、消息、任务）",
                InputSchema = new Dictionary<string, object> { ["type"] = "object", ["properties"] = new Dictionary<string, object>() }
            },
            new()
            {
                Name = "mark_notification_read",
                Description = "按通知ID标记为已读",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "id" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "通知ID" }
                    }
                }
            },
            new()
            {
                Name = "get_task_notifications",
                Description = "获取与当前用户相关的任务通知列表",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1, ["minimum"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 10, ["minimum"] = 1, ["maximum"] = 100 }
                    }
                }
            },
            new()
            {
                Name = "get_todos",
                Description = "获取待办事项列表。支持 sortBy: dueDate, priority, datetime",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1, ["minimum"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 10, ["minimum"] = 1, ["maximum"] = 100 },
                        ["sortBy"] = new Dictionary<string, object> { ["type"] = "string", ["default"] = "dueDate" }
                    }
                }
            },
            new()
            {
                Name = "create_todo",
                Description = "创建一个新的待办事项",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "title" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["title"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "待办标题" },
                        ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "待办描述（可选）" },
                        ["priority"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "优先级（0=低, 1=中, 2=高, 3=紧急）", ["default"] = 1 },
                        ["dueDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "截止日期（ISO格式，可选）" }
                    }
                }
            },
            new()
            {
                Name = "update_todo",
                Description = "更新待办事项信息",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "id" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "待办ID" },
                        ["title"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "新标题（可选）" },
                        ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "新描述（可选）" },
                        ["priority"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "新优先级（可选）" },
                        ["dueDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "新截止日期（可选）" },
                        ["isCompleted"] = new Dictionary<string, object> { ["type"] = "boolean", ["description"] = "是否已完成（可选）" }
                    }
                }
            },
            new()
            {
                Name = "complete_todo",
                Description = "将待办事项标记为已完成",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "id" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "待办ID" }
                    }
                }
            },
            new()
            {
                Name = "delete_todo",
                Description = "删除指定的待办事项",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "id" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "待办ID" }
                    }
                }
            },
            new()
            {
                Name = "get_system_messages",
                Description = "获取系统的所有消息通知列表",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1, ["minimum"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 10, ["minimum"] = 1, ["maximum"] = 100 }
                    }
                }
            },
            new()
            {
                Name = "mark_multiple_notifications_read",
                Description = "批量将通知标记为已读",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "ids" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["ids"] = new Dictionary<string, object>
                        {
                            ["type"] = "array",
                            ["items"] = new Dictionary<string, object> { ["type"] = "string" },
                            ["description"] = "通知ID列表"
                        }
                    }
                }
            },
            // 小科配置管理相关工具
            new()
            {
                Name = "get_xiaoke_configs",
                Description = "获取小科配置列表。支持按名称、启用状态等条件查询配置。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["name"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "配置名称（搜索关键词，可选）"
                        },
                        ["isEnabled"] = new Dictionary<string, object>
                        {
                            ["type"] = "boolean",
                            ["description"] = "是否启用（筛选条件，可选）"
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
                            ["default"] = 10,
                            ["minimum"] = 1,
                            ["maximum"] = 100
                        }
                    }
                }
            },
            new()
            {
                Name = "get_xiaoke_config",
                Description = "获取小科配置详情。通过配置ID查询配置的详细信息。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "configId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["configId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "配置ID（必填）"
                        }
                    }
                }
            },
            new()
            {
                Name = "get_default_xiaoke_config",
                Description = "获取当前企业的默认小科配置。返回当前企业设置的默认配置信息。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>()
                }
            },
            // 物联网相关工具
            new()
            {
                Name = "get_iot_gateways",
                Description = "获取物联网网关列表。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "get_iot_devices",
                Description = "获取物联网设备列表。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["gatewayId"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "get_iot_platform_statistics",
                Description = "获取物联网平台整体统计数据。",
                InputSchema = new Dictionary<string, object> { ["type"] = "object", ["properties"] = new Dictionary<string, object>() }
            },
            // 园区管理相关工具
            new()
            {
                Name = "get_park_buildings",
                Description = "获取园区楼宇列表。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "get_park_leads",
                Description = "获取园区招商线索列表。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "get_park_tenants",
                Description = "获取园区租户列表。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "get_park_contracts",
                Description = "获取园区租赁合同列表。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["status"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            // 园区走访相关工具
            new()
            {
                Name = "get_park_visit_tasks",
                Description = "获取园区走访任务列表。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["status"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "get_park_visit_statistics",
                Description = "获取园区走访统计数据。",
                InputSchema = new Dictionary<string, object> { ["type"] = "object", ["properties"] = new Dictionary<string, object>() }
            },
            // 密码本相关工具
            new()
            {
                Name = "get_password_book_entries",
                Description = "获取当前用户的密码本条目列表（不含密码）。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["category"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            }
        };

        // 添加规则配置的 MCP 工具
        try
        {
            var ruleMcpTools = await GetRuleMcpToolsAsync();
            if (ruleMcpTools.Any())
            {
                _logger.LogInformation("添加 {Count} 个规则配置的 MCP 工具", ruleMcpTools.Count);
                tools.AddRange(ruleMcpTools);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "获取规则配置的 MCP 工具时发生错误，继续使用内置工具");
        }

        // 缓存工具列表
        _cachedTools = tools;
        _toolsCacheTime = DateTime.UtcNow;

        return new McpListToolsResponse { Tools = tools };
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
                "get_tasks" => await HandleGetTasksAsync(arguments, currentUserId),
                "get_task_detail" => await HandleGetTaskDetailAsync(arguments, currentUserId),
                "create_task" => await HandleCreateTaskAsync(arguments, currentUserId),
                "update_task" => await HandleUpdateTaskAsync(arguments, currentUserId),
                "assign_task" => await HandleAssignTaskAsync(arguments, currentUserId),
                "complete_task" => await HandleCompleteTaskAsync(arguments, currentUserId),
                "get_task_statistics" => await HandleGetTaskStatisticsAsync(arguments, currentUserId),
                "get_my_task_count" => await HandleGetMyTaskCountAsync(arguments, currentUserId),
                "get_my_tasks" => await HandleGetMyTasksAsync(arguments, currentUserId),
                "get_projects" => await HandleGetProjectsAsync(arguments, currentUserId),
                "get_project_detail" => await HandleGetProjectDetailAsync(arguments, currentUserId),
                "create_project" => await HandleCreateProjectAsync(arguments, currentUserId),
                "get_project_statistics" => await HandleGetProjectStatisticsAsync(arguments, currentUserId),
                "get_documents" => await HandleGetDocumentsAsync(arguments, currentUserId),
                "get_document_detail" => await HandleGetDocumentDetailAsync(arguments, currentUserId),
                "get_document_statistics" => await HandleGetDocumentStatisticsAsync(arguments, currentUserId),
                "get_file_items" => await HandleGetFileItemsAsync(arguments, currentUserId),
                "search_files" => await HandleSearchFilesAsync(arguments, currentUserId),
                "create_folder" => await HandleCreateFolderAsync(arguments, currentUserId),
                "get_storage_usage" => await HandleGetStorageUsageAsync(arguments, currentUserId),
                // 通知中心相关
                "get_unified_notifications" => await HandleGetUnifiedNotificationsAsync(arguments, currentUserId),
                "get_unread_notification_stats" => await HandleGetUnreadNotificationStatsAsync(arguments, currentUserId),
                "mark_notification_read" => await HandleMarkNotificationReadAsync(arguments, currentUserId),
                "get_task_notifications" => await HandleGetTaskNotificationsAsync(arguments, currentUserId),
                "get_todos" => await HandleGetTodosAsync(arguments, currentUserId),
                "create_todo" => await HandleCreateTodoAsync(arguments, currentUserId),
                "update_todo" => await HandleUpdateTodoAsync(arguments, currentUserId),
                "complete_todo" => await HandleCompleteTodoAsync(arguments, currentUserId),
                "delete_todo" => await HandleDeleteTodoAsync(arguments, currentUserId),
                "get_system_messages" => await HandleGetSystemMessagesAsync(arguments, currentUserId),
                "mark_multiple_notifications_read" => await HandleMarkMultipleNotificationsReadAsync(arguments, currentUserId),
                // 小科配置管理相关
                "get_xiaoke_configs" => await HandleGetXiaokeConfigsAsync(arguments, currentUserId),
                "get_xiaoke_config" => await HandleGetXiaokeConfigAsync(arguments, currentUserId),
                "get_default_xiaoke_config" => await HandleGetDefaultXiaokeConfigAsync(arguments, currentUserId),
                // 物联网相关
                "get_iot_gateways" => await HandleGetIoTGatewaysAsync(arguments, currentUserId),
                "get_iot_devices" => await HandleGetIoTDevicesAsync(arguments, currentUserId),
                "get_iot_platform_statistics" => await HandleGetIoTPlatformStatisticsAsync(arguments, currentUserId),
                // 园区管理相关
                "get_park_buildings" => await HandleGetParkBuildingsAsync(arguments, currentUserId),
                "get_park_leads" => await HandleGetParkLeadsAsync(arguments, currentUserId),
                "get_park_tenants" => await HandleGetParkTenantsAsync(arguments, currentUserId),
                "get_park_contracts" => await HandleGetParkContractsAsync(arguments, currentUserId),
                "get_park_visit_tasks" => await HandleGetParkVisitTasksAsync(arguments, currentUserId),
                "get_park_visit_statistics" => await HandleGetParkVisitStatisticsAsync(arguments, currentUserId),
                // 密码本相关
                "get_password_book_entries" => await HandleGetPasswordBookEntriesAsync(arguments, currentUserId),
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

        // 添加规则配置的 MCP 资源
        try
        {
            var ruleResources = await GetRuleMcpResourcesAsync();
            if (ruleResources.Any())
            {
                _logger.LogInformation("添加 {Count} 个规则配置的 MCP 资源", ruleResources.Count);
                resources.AddRange(ruleResources);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "获取规则配置的 MCP 资源时发生错误，继续使用内置资源");
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
    public async Task<McpListPromptsResponse> ListPromptsAsync()
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

        // 添加规则配置的 MCP 提示词
        try
        {
            var rulePrompts = await GetRuleMcpPromptsAsync();
            if (rulePrompts.Any())
            {
                _logger.LogInformation("添加 {Count} 个规则配置的 MCP 提示词", rulePrompts.Count);
                prompts.AddRange(rulePrompts);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "获取规则配置的 MCP 提示词时发生错误，继续使用内置提示词");
        }

        return new McpListPromptsResponse { Prompts = prompts };
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
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 20, maxPageSize: 100);

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
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 20, maxPageSize: 100);

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

        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 20, maxPageSize: 100);

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

    #region 任务管理工具处理方法

    private async Task<object> HandleGetTasksAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            return new { error = "无法确定当前企业" };
        }

        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 20, maxPageSize: 100);

        var request = new TaskQueryRequest
        {
            Page = page,
            PageSize = pageSize,
            Search = arguments.ContainsKey("search") ? arguments["search"]?.ToString() : null,
            Status = arguments.ContainsKey("status") && int.TryParse(arguments["status"]?.ToString(), out var status) ? status : null,
            Priority = arguments.ContainsKey("priority") && int.TryParse(arguments["priority"]?.ToString(), out var priority) ? priority : null,
            AssignedTo = arguments.ContainsKey("assignedTo") ? arguments["assignedTo"]?.ToString() : null,
            ProjectId = arguments.ContainsKey("projectId") ? arguments["projectId"]?.ToString() : null
        };

        var response = await _taskService.QueryTasksAsync(request, currentUser.CurrentCompanyId);

        return new
        {
            tasks = response.Tasks.Select(t => new
            {
                id = t.Id,
                taskName = t.TaskName,
                description = t.Description,
                status = t.Status,
                statusName = t.StatusName,
                priority = t.Priority,
                priorityName = t.PriorityName,
                assignedTo = t.AssignedTo,
                assignedToName = t.AssignedToName,
                completionPercentage = t.CompletionPercentage,
                createdAt = t.CreatedAt,
                updatedAt = t.UpdatedAt
            }).ToList(),
            total = response.Total,
            page = response.Page,
            pageSize = response.PageSize,
            totalPages = (int)Math.Ceiling(response.Total / (double)response.PageSize)
        };
    }

    private async Task<object> HandleGetTaskDetailAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("taskId") || arguments["taskId"] is not string taskId)
        {
            return new { error = "缺少必需的参数: taskId" };
        }

        var task = await _taskService.GetTaskByIdAsync(taskId);
        if (task == null)
        {
            return new { error = "任务未找到" };
        }

        return new
        {
            id = task.Id,
            taskName = task.TaskName,
            description = task.Description,
            taskType = task.TaskType,
            status = task.Status,
            statusName = task.StatusName,
            priority = task.Priority,
            priorityName = task.PriorityName,
            createdBy = task.CreatedBy,
            createdByName = task.CreatedByName,
            assignedTo = task.AssignedTo,
            assignedToName = task.AssignedToName,
            assignedAt = task.AssignedAt,
            plannedStartTime = task.PlannedStartTime,
            plannedEndTime = task.PlannedEndTime,
            actualStartTime = task.ActualStartTime,
            actualEndTime = task.ActualEndTime,
            estimatedDuration = task.EstimatedDuration,
            actualDuration = task.ActualDuration,
            completionPercentage = task.CompletionPercentage,
            executionResult = task.ExecutionResult,
            executionResultName = task.ExecutionResultName,
            remarks = task.Remarks,
            tags = task.Tags,
            participants = task.Participants,
            attachments = task.Attachments,
            createdAt = task.CreatedAt,
            updatedAt = task.UpdatedAt
        };
    }

    private async Task<object> HandleCreateTaskAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("taskName") || arguments["taskName"] is not string taskName)
        {
            return new { error = "缺少必需的参数: taskName" };
        }

        if (!arguments.ContainsKey("taskType") || arguments["taskType"] is not string taskType)
        {
            return new { error = "缺少必需的参数: taskType" };
        }

        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            return new { error = "无法确定当前企业" };
        }

        var request = new CreateTaskRequest
        {
            TaskName = taskName,
            TaskType = taskType,
            Description = arguments.ContainsKey("description") ? arguments["description"]?.ToString() : null,
            Priority = arguments.ContainsKey("priority") && int.TryParse(arguments["priority"]?.ToString(), out var priority) ? priority : (int)TaskPriority.Medium,
            AssignedTo = arguments.ContainsKey("assignedTo") ? arguments["assignedTo"]?.ToString() : null,
            EstimatedDuration = arguments.ContainsKey("estimatedDuration") && int.TryParse(arguments["estimatedDuration"]?.ToString(), out var duration) ? duration : null,
            Tags = arguments.ContainsKey("tags") && arguments["tags"] is List<object> tags ? tags.Cast<string>().ToList() : new List<string>(),
            PlannedStartTime = arguments.ContainsKey("plannedStartTime") && DateTime.TryParse(arguments["plannedStartTime"]?.ToString(), out var pst) ? pst : (DateTime?)null,
            PlannedEndTime = arguments.ContainsKey("plannedEndTime") && DateTime.TryParse(arguments["plannedEndTime"]?.ToString(), out var pet) ? pet : (DateTime?)null,
            ParticipantIds = arguments.ContainsKey("participantIds") && arguments["participantIds"] is List<object> participants ? participants.Cast<string>().ToList() : new List<string>(),
            Remarks = arguments.ContainsKey("remarks") ? arguments["remarks"]?.ToString() : null,
            ProjectId = arguments.ContainsKey("projectId") ? arguments["projectId"]?.ToString() : null
        };

        var task = await _taskService.CreateTaskAsync(request, currentUserId, currentUser.CurrentCompanyId);

        return new
        {
            id = task.Id,
            taskName = task.TaskName,
            status = task.Status,
            statusName = task.StatusName,
            priority = task.Priority,
            priorityName = task.PriorityName,
            createdAt = task.CreatedAt,
            message = "任务创建成功"
        };
    }

    private async Task<object> HandleUpdateTaskAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("taskId") || arguments["taskId"] is not string taskId)
        {
            return new { error = "缺少必需的参数: taskId" };
        }

        var request = new UpdateTaskRequest
        {
            TaskId = taskId,
            TaskName = arguments.ContainsKey("taskName") ? arguments["taskName"]?.ToString() : null,
            Description = arguments.ContainsKey("description") ? arguments["description"]?.ToString() : null,
            Status = arguments.ContainsKey("status") && int.TryParse(arguments["status"]?.ToString(), out var status) ? status : null,
            Priority = arguments.ContainsKey("priority") && int.TryParse(arguments["priority"]?.ToString(), out var priority) ? priority : null,
            CompletionPercentage = arguments.ContainsKey("completionPercentage") && int.TryParse(arguments["completionPercentage"]?.ToString(), out var completion) ? completion : null
        };

        var task = await _taskService.UpdateTaskAsync(request, currentUserId);

        return new
        {
            id = task.Id,
            taskName = task.TaskName,
            status = task.Status,
            statusName = task.StatusName,
            completionPercentage = task.CompletionPercentage,
            updatedAt = task.UpdatedAt,
            message = "任务更新成功"
        };
    }

    private async Task<object> HandleAssignTaskAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("taskId") || arguments["taskId"] is not string taskId)
        {
            return new { error = "缺少必需的参数: taskId" };
        }

        if (!arguments.ContainsKey("assignedTo") || arguments["assignedTo"] is not string assignedTo)
        {
            return new { error = "缺少必需的参数: assignedTo" };
        }

        var request = new AssignTaskRequest
        {
            TaskId = taskId,
            AssignedTo = assignedTo,
            Remarks = arguments.ContainsKey("remarks") ? arguments["remarks"]?.ToString() : null
        };

        var task = await _taskService.AssignTaskAsync(request, currentUserId);

        return new
        {
            id = task.Id,
            taskName = task.TaskName,
            assignedTo = task.AssignedTo,
            assignedToName = task.AssignedToName,
            assignedAt = task.AssignedAt,
            status = task.Status,
            statusName = task.StatusName,
            message = "任务分配成功"
        };
    }

    private async Task<object> HandleCompleteTaskAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("taskId") || arguments["taskId"] is not string taskId)
        {
            return new { error = "缺少必需的参数: taskId" };
        }

        var executionResult = (int)TaskExecutionResult.Success;
        if (arguments.ContainsKey("executionResult") && int.TryParse(arguments["executionResult"]?.ToString(), out var result))
        {
            executionResult = result;
        }

        var request = new CompleteTaskRequest
        {
            TaskId = taskId,
            ExecutionResult = executionResult,
            Remarks = arguments.ContainsKey("remarks") ? arguments["remarks"]?.ToString() : null
        };

        var task = await _taskService.CompleteTaskAsync(request, currentUserId);

        return new
        {
            id = task.Id,
            taskName = task.TaskName,
            status = task.Status,
            statusName = task.StatusName,
            executionResult = task.ExecutionResult,
            executionResultName = task.ExecutionResultName,
            completionPercentage = task.CompletionPercentage,
            actualEndTime = task.ActualEndTime,
            message = "任务完成成功"
        };
    }

    private async Task<object> HandleGetTaskStatisticsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            return new { error = "无法确定当前企业" };
        }

        var userId = arguments.ContainsKey("userId") && !string.IsNullOrEmpty(arguments["userId"]?.ToString())
            ? arguments["userId"]?.ToString()
            : null;

        var statistics = await _taskService.GetTaskStatisticsAsync(currentUser.CurrentCompanyId, userId);

        return new
        {
            totalTasks = statistics.TotalTasks,
            pendingTasks = statistics.PendingTasks,
            inProgressTasks = statistics.InProgressTasks,
            completedTasks = statistics.CompletedTasks,
            failedTasks = statistics.FailedTasks,
            averageCompletionTime = statistics.AverageCompletionTime,
            completionRate = statistics.CompletionRate,
            tasksByPriority = statistics.TasksByPriority,
            tasksByStatus = statistics.TasksByStatus
        };
    }

    private async Task<object> HandleGetMyTaskCountAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            return new { error = "无法确定当前企业" };
        }

        var includeCompleted = arguments.ContainsKey("includeCompleted") &&
                              bool.TryParse(arguments["includeCompleted"]?.ToString(), out var ic) && ic;

        var statistics = await _taskService.GetTaskStatisticsAsync(currentUser.CurrentCompanyId, currentUserId);

        var totalCount = statistics.TotalTasks;
        if (!includeCompleted)
        {
            // 不包含已完成的任务，计算待分配、已分配、执行中的任务数
            totalCount = statistics.PendingTasks + statistics.InProgressTasks;
            if (statistics.TasksByStatus.ContainsKey("Assigned"))
            {
                totalCount += statistics.TasksByStatus["Assigned"];
            }
        }

        return new
        {
            totalCount = totalCount,
            pendingCount = statistics.PendingTasks,
            assignedCount = statistics.TasksByStatus.ContainsKey("Assigned") ? statistics.TasksByStatus["Assigned"] : 0,
            inProgressCount = statistics.InProgressTasks,
            completedCount = statistics.CompletedTasks,
            failedCount = statistics.FailedTasks,
            cancelledCount = statistics.TasksByStatus.ContainsKey("Cancelled") ? statistics.TasksByStatus["Cancelled"] : 0,
            pausedCount = statistics.TasksByStatus.ContainsKey("Paused") ? statistics.TasksByStatus["Paused"] : 0,
            message = $"你有 {totalCount} 个待处理任务"
        };
    }

    private async Task<object> HandleGetMyTasksAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            return new { error = "无法确定当前企业" };
        }

        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 20, maxPageSize: 100);

        var request = new TaskQueryRequest
        {
            Page = page,
            PageSize = pageSize,
            AssignedTo = currentUserId,
            Status = arguments.ContainsKey("status") && int.TryParse(arguments["status"]?.ToString(), out var status) ? status : null,
            ProjectId = arguments.ContainsKey("projectId") ? arguments["projectId"]?.ToString() : null,
            Search = arguments.ContainsKey("search") ? arguments["search"]?.ToString() : null
        };

        var response = await _taskService.QueryTasksAsync(request, currentUser.CurrentCompanyId);

        return new
        {
            tasks = response.Tasks.Select(t => new
            {
                id = t.Id,
                taskName = t.TaskName,
                description = t.Description,
                status = t.Status,
                statusName = t.StatusName,
                priority = t.Priority,
                priorityName = t.PriorityName,
                completionPercentage = t.CompletionPercentage,
                createdBy = t.CreatedBy,
                createdByName = t.CreatedByName,
                createdAt = t.CreatedAt,
                updatedAt = t.UpdatedAt
            }).ToList(),
            total = response.Total,
            page = response.Page,
            pageSize = response.PageSize,
            totalPages = (int)Math.Ceiling(response.Total / (double)response.PageSize)
        };
    }

    #endregion

    #region 通知中心工具处理方法

    private async Task<object> HandleGetUnifiedNotificationsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 10, maxPageSize: 100);

        var filterType = arguments.ContainsKey("filterType") ? (arguments["filterType"]?.ToString() ?? "all") : "all";
        var sortBy = arguments.ContainsKey("sortBy") ? (arguments["sortBy"]?.ToString() ?? "datetime") : "datetime";

        var result = await _unifiedNotificationService.GetUnifiedNotificationsAsync(page, pageSize, filterType, sortBy);
        return new
        {
            items = result.Items,
            total = result.Total,
            page = result.Page,
            pageSize = result.PageSize,
            unreadCount = result.UnreadCount,
            success = result.Success
        };
    }

    private async Task<object> HandleGetUnreadNotificationStatsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var stats = await _unifiedNotificationService.GetUnreadCountStatisticsAsync();
        return new
        {
            total = stats.Total,
            systemMessages = stats.SystemMessages,
            notifications = stats.Notifications,
            messages = stats.Messages,
            taskNotifications = stats.TaskNotifications,
            todos = stats.Todos
        };
    }

    private async Task<object> HandleMarkNotificationReadAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("id") || arguments["id"] is null)
        {
            return new { error = "缺少必需的参数: id" };
        }
        var id = arguments["id"]!.ToString()!;
        var ok = await _unifiedNotificationService.MarkAsReadAsync(id);
        return new { success = ok };
    }

    private async Task<object> HandleGetTaskNotificationsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 10, maxPageSize: 100);

        var result = await _unifiedNotificationService.GetTaskNotificationsAsync(page, pageSize);
        return new
        {
            items = result.Notifications,
            total = result.Total,
            page = result.Page,
            pageSize = result.PageSize,
            success = result.Success
        };
    }

    private async Task<object> HandleGetTodosAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 10, maxPageSize: 100);
        var sortBy = arguments.ContainsKey("sortBy") ? (arguments["sortBy"]?.ToString() ?? "dueDate") : "dueDate";

        var result = await _unifiedNotificationService.GetTodosAsync(page, pageSize, sortBy);
        return new
        {
            todos = result.Todos,
            total = result.Total,
            page = result.Page,
            pageSize = result.PageSize,
            success = result.Success
        };
    }

    private async Task<object> HandleCreateTodoAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("title") || arguments["title"] is null)
        {
            return new { error = "缺少必需的参数: title" };
        }

        var request = new CreateTodoRequest
        {
            Title = arguments["title"]!.ToString()!,
            Description = arguments.ContainsKey("description") ? arguments["description"]?.ToString() : null,
            Priority = arguments.ContainsKey("priority") && int.TryParse(arguments["priority"]?.ToString(), out var p) ? p : 1,
            DueDate = arguments.ContainsKey("dueDate") && DateTime.TryParse(arguments["dueDate"]?.ToString(), out var d) ? d : null
        };

        var todo = await _unifiedNotificationService.CreateTodoAsync(request);
        return new { success = true, id = todo.Id, title = todo.Title };
    }

    private async Task<object> HandleUpdateTodoAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("id") || arguments["id"] is null)
        {
            return new { error = "缺少必需的参数: id" };
        }

        var id = arguments["id"]!.ToString()!;
        var request = new UpdateTodoRequest
        {
            Title = arguments.ContainsKey("title") ? arguments["title"]?.ToString() : null,
            Description = arguments.ContainsKey("description") ? arguments["description"]?.ToString() : null,
            Priority = arguments.ContainsKey("priority") && int.TryParse(arguments["priority"]?.ToString(), out var p) ? p : null,
            DueDate = arguments.ContainsKey("dueDate") && DateTime.TryParse(arguments["dueDate"]?.ToString(), out var d) ? d : null,
            IsCompleted = arguments.ContainsKey("isCompleted") && bool.TryParse(arguments["isCompleted"]?.ToString(), out var c) ? c : null
        };

        var todo = await _unifiedNotificationService.UpdateTodoAsync(id, request);
        return new { success = todo != null, id = todo?.Id };
    }

    private async Task<object> HandleCompleteTodoAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("id") || arguments["id"] is null)
        {
            return new { error = "缺少必需的参数: id" };
        }

        var id = arguments["id"]!.ToString()!;
        var ok = await _unifiedNotificationService.CompleteTodoAsync(id);
        return new { success = ok };
    }

    private async Task<object> HandleDeleteTodoAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("id") || arguments["id"] is null)
        {
            return new { error = "缺少必需的参数: id" };
        }

        var id = arguments["id"]!.ToString()!;
        var ok = await _unifiedNotificationService.DeleteTodoAsync(id);
        return new { success = ok };
    }

    private async Task<object> HandleGetSystemMessagesAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 10, maxPageSize: 100);

        var result = await _unifiedNotificationService.GetSystemMessagesAsync(page, pageSize);
        return new
        {
            messages = result.Messages,
            total = result.Total,
            page = result.Page,
            pageSize = result.PageSize,
            success = result.Success
        };
    }

    private async Task<object> HandleMarkMultipleNotificationsReadAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (!arguments.ContainsKey("ids") || arguments["ids"] is not List<object> ids)
        {
            return new { error = "缺少必需的参数: ids (Array)" };
        }

        var idList = ids.Select(o => o.ToString()!).ToList();
        var ok = await _unifiedNotificationService.MarkMultipleAsReadAsync(idList);
        return new { success = ok };
    }

    #endregion

    #region 规则 MCP 集成方法

    /// <summary>
    /// 获取规则配置的 MCP 工具列表
    /// </summary>
    private async Task<List<McpTool>> GetRuleMcpToolsAsync()
    {
        try
        {
            var filter = _ruleFactory.CreateFilterBuilder()
                .Custom(MongoDB.Driver.Builders<RuleListItem>.Filter.Eq(r => r.IsDeleted, false))
                .Build();

            var rules = await _ruleFactory.FindAsync(filter, limit: 1000);

            var mcpTools = new List<McpTool>();

            foreach (var rule in rules.Where(r => r.McpConfig?.Enabled == true && !string.IsNullOrEmpty(r.McpConfig?.ToolName)))
            {
                var mcpConfig = rule.McpConfig;
                if (mcpConfig != null && !mcpConfig.IsResource && !mcpConfig.IsPrompt)
                {
                    mcpTools.Add(new McpTool
                    {
                        Name = mcpConfig.ToolName ?? string.Empty,
                        Description = mcpConfig.ToolDescription ?? rule.Desc ?? "规则配置的 MCP 工具",
                        InputSchema = mcpConfig.InputSchema ?? new Dictionary<string, object>
                        {
                            ["type"] = "object",
                            ["properties"] = new Dictionary<string, object>()
                        }
                    });
                }
            }

            _logger.LogInformation("获取到 {Count} 个规则配置的 MCP 工具", mcpTools.Count);
            return mcpTools;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取规则配置的 MCP 工具时发生错误");
            return new List<McpTool>();
        }
    }

    /// <summary>
    /// 获取规则配置的 MCP 资源列表
    /// </summary>
    private async Task<List<McpResource>> GetRuleMcpResourcesAsync()
    {
        try
        {
            var filter = _ruleFactory.CreateFilterBuilder()
                .Custom(MongoDB.Driver.Builders<RuleListItem>.Filter.Eq(r => r.IsDeleted, false))
                .Build();

            var rules = await _ruleFactory.FindAsync(filter, limit: 1000);

            var mcpResources = new List<McpResource>();

            foreach (var rule in rules.Where(r => r.McpConfig?.Enabled == true && r.McpConfig?.IsResource == true))
            {
                var mcpConfig = rule.McpConfig;
                if (mcpConfig != null && !string.IsNullOrEmpty(mcpConfig.ResourceUri))
                {
                    mcpResources.Add(new McpResource
                    {
                        Uri = mcpConfig.ResourceUri,
                        Name = rule.Name ?? "规则资源",
                        Description = rule.Desc,
                        MimeType = mcpConfig.ResourceMimeType ?? "application/json"
                    });
                }
            }

            _logger.LogInformation("获取到 {Count} 个规则配置的 MCP 资源", mcpResources.Count);
            return mcpResources;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取规则配置的 MCP 资源时发生错误");
            return new List<McpResource>();
        }
    }

    /// <summary>
    /// 获取规则配置的 MCP 提示词列表
    /// </summary>
    private async Task<List<McpPrompt>> GetRuleMcpPromptsAsync()
    {
        try
        {
            var filter = _ruleFactory.CreateFilterBuilder()
                .Custom(MongoDB.Driver.Builders<RuleListItem>.Filter.Eq(r => r.IsDeleted, false))
                .Build();

            var rules = await _ruleFactory.FindAsync(filter, limit: 1000);

            var mcpPrompts = new List<McpPrompt>();

            foreach (var rule in rules.Where(r => r.McpConfig?.Enabled == true && r.McpConfig?.IsPrompt == true))
            {
                var mcpConfig = rule.McpConfig;
                if (mcpConfig != null && !string.IsNullOrEmpty(mcpConfig.PromptTemplate))
                {
                    mcpPrompts.Add(new McpPrompt
                    {
                        Name = rule.Name ?? "规则提示词",
                        Description = rule.Desc,
                        Arguments = mcpConfig.PromptArguments
                    });
                }
            }

            _logger.LogInformation("获取到 {Count} 个规则配置的 MCP 提示词", mcpPrompts.Count);
            return mcpPrompts;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取规则配置的 MCP 提示词时发生错误");
            return new List<McpPrompt>();
        }
    }

    #endregion

    #region 小科配置管理工具处理方法

    private async Task<object> HandleGetXiaokeConfigsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (_xiaokeConfigService == null)
        {
            return new { error = "小科配置服务未启用" };
        }

        var name = arguments.ContainsKey("name") ? arguments["name"]?.ToString() : null;
        var isEnabled = arguments.ContainsKey("isEnabled") && bool.TryParse(arguments["isEnabled"]?.ToString(), out var enabled) ? enabled : (bool?)null;
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 10, maxPageSize: 100);

        var queryParams = new XiaokeConfigQueryParams
        {
            Current = page,
            PageSize = pageSize,
            Name = name,
            IsEnabled = isEnabled
        };

        var response = await _xiaokeConfigService.GetConfigsAsync(queryParams);

        var configs = response.Data == null
            ? new List<object>()
            : response.Data.Select(c => new
            {
                id = c.Id,
                name = c.Name,
                model = c.Model,
                systemPrompt = c.SystemPrompt,
                temperature = c.Temperature,
                maxTokens = c.MaxTokens,
                topP = c.TopP,
                frequencyPenalty = c.FrequencyPenalty,
                presencePenalty = c.PresencePenalty,
                isEnabled = c.IsEnabled,
                isDefault = c.IsDefault,
                createdAt = c.CreatedAt,
                updatedAt = c.UpdatedAt
            }).Cast<object>().ToList();

        return new
        {
            configs = configs,
            total = response.Total,
            page = response.Current,
            pageSize = response.PageSize,
            totalPages = response.Total > 0 ? (int)Math.Ceiling(response.Total / (double)response.PageSize) : 0
        };
    }

    private async Task<object> HandleGetXiaokeConfigAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (_xiaokeConfigService == null)
        {
            return new { error = "小科配置服务未启用" };
        }

        if (!arguments.ContainsKey("configId") || arguments["configId"] is not string configId)
        {
            return new { error = "缺少必需的参数: configId" };
        }

        var config = await _xiaokeConfigService.GetConfigByIdAsync(configId);
        if (config == null)
        {
            return new { error = "配置未找到" };
        }

        return new
        {
            id = config.Id,
            name = config.Name,
            model = config.Model,
            systemPrompt = config.SystemPrompt,
            temperature = config.Temperature,
            maxTokens = config.MaxTokens,
            topP = config.TopP,
            frequencyPenalty = config.FrequencyPenalty,
            presencePenalty = config.PresencePenalty,
            isEnabled = config.IsEnabled,
            isDefault = config.IsDefault,
            createdAt = config.CreatedAt,
            updatedAt = config.UpdatedAt
        };
    }

    private async Task<object> HandleGetDefaultXiaokeConfigAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        if (_xiaokeConfigService == null)
        {
            return new { error = "小科配置服务未启用" };
        }

        var config = await _xiaokeConfigService.GetDefaultConfigAsync();
        if (config == null)
        {
            return new { error = "未找到默认配置" };
        }

        return new
        {
            id = config.Id,
            name = config.Name,
            model = config.Model,
            systemPrompt = config.SystemPrompt,
            temperature = config.Temperature,
            maxTokens = config.MaxTokens,
            topP = config.TopP,
            frequencyPenalty = config.FrequencyPenalty,
            presencePenalty = config.PresencePenalty,
            isEnabled = config.IsEnabled,
            isDefault = config.IsDefault,
            createdAt = config.CreatedAt,
            updatedAt = config.UpdatedAt
        };
    }

    #endregion

    #region 项目管理相关

    private async Task<object> HandleGetProjectsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            return new { error = "无法确定当前企业" };
        }

        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 20, maxPageSize: 100);
        var request = new ProjectQueryRequest
        {
            Page = page,
            PageSize = pageSize,
            Search = arguments.ContainsKey("search") ? arguments["search"]?.ToString() : null,
            Status = arguments.ContainsKey("status") && int.TryParse(arguments["status"]?.ToString(), out var status) ? status : null
        };

        var response = await _projectService.GetProjectsListAsync(request, currentUser.CurrentCompanyId);

        return new
        {
            projects = response.Projects.Select(p => new
            {
                id = p.Id,
                name = p.Name,
                description = p.Description,
                startDate = p.StartDate,
                endDate = p.EndDate,
                status = p.Status,
                statusName = p.StatusName,
                memberCount = response.Total, // 这里简化处理
                progress = p.Progress
            }).ToList(),
            total = response.Total,
            page = response.Page,
            pageSize = response.PageSize
        };
    }

    private async Task<object> HandleGetProjectDetailAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var projectId = arguments.ContainsKey("projectId") ? arguments["projectId"]?.ToString() : null;
        if (string.IsNullOrEmpty(projectId)) return new { error = "未提供项目ID" };

        var project = await _projectService.GetProjectByIdAsync(projectId);
        if (project == null) return new { error = "项目不存在" };

        var members = await _projectService.GetProjectMembersAsync(projectId);

        return new
        {
            project = new
            {
                id = project.Id,
                name = project.Name,
                description = project.Description,
                startDate = project.StartDate,
                endDate = project.EndDate,
                status = project.Status,
                progress = project.Progress
            },
            members = members.Select(m => new { userId = m.UserId, username = m.UserName, role = m.Role }).ToList()
        };
    }

    private async Task<object> HandleCreateProjectAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var name = arguments.ContainsKey("name") ? arguments["name"]?.ToString() : null;
        if (string.IsNullOrEmpty(name)) return new { error = "项目名称必填" };

        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            return new { error = "无法确定当前企业" };
        }

        var request = new CreateProjectRequest
        {
            Name = name,
            Description = arguments.ContainsKey("description") ? arguments["description"]?.ToString() : null,
            StartDate = arguments.ContainsKey("startDate") && DateTime.TryParse(arguments["startDate"]?.ToString(), out var start) ? start : null,
            EndDate = arguments.ContainsKey("endDate") && DateTime.TryParse(arguments["endDate"]?.ToString(), out var end) ? end : null
        };

        var project = await _projectService.CreateProjectAsync(request, currentUserId, currentUser.CurrentCompanyId);
        return new { success = true, projectId = project.Id, projectName = project.Name };
    }

    private async Task<object> HandleGetProjectStatisticsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var currentUser = await _userFactory.GetByIdAsync(currentUserId);
        if (currentUser == null || string.IsNullOrEmpty(currentUser.CurrentCompanyId))
        {
            return new { error = "无法确定当前企业" };
        }

        var stats = await _projectService.GetProjectStatisticsAsync(currentUser.CurrentCompanyId);
        return stats;
    }

    #endregion

    #region 公文管理相关

    private async Task<object> HandleGetDocumentsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 20, maxPageSize: 100);
        var request = new DocumentQueryParams
        {
            Page = page,
            PageSize = pageSize,
            Keyword = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : null,
            DocumentType = arguments.ContainsKey("documentType") ? arguments["documentType"]?.ToString() : null,
            Category = arguments.ContainsKey("category") ? arguments["category"]?.ToString() : null,
            FilterType = arguments.ContainsKey("filterType") ? arguments["filterType"]?.ToString() : null
        };

        if (arguments.ContainsKey("status") && Enum.TryParse<DocumentStatus>(arguments["status"]?.ToString(), out var status))
        {
            request.Status = status;
        }

        var (items, total) = await _documentService.GetDocumentsAsync(request);

        return new
        {
            documents = items.Select(d => new
            {
                id = d.Id,
                title = d.Title,
                documentType = d.DocumentType,
                category = d.Category,
                status = d.Status,
                createdBy = d.CreatedBy,
                createdAt = d.CreatedAt,
                workflowInstanceId = d.WorkflowInstanceId
            }).ToList(),
            total = total,
            page = page,
            pageSize = pageSize
        };
    }

    private async Task<object> HandleGetDocumentDetailAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var documentId = arguments.ContainsKey("documentId") ? arguments["documentId"]?.ToString() : null;
        if (string.IsNullOrEmpty(documentId)) return new { error = "未提供公文ID" };

        var doc = await _documentService.GetDocumentAsync(documentId);
        if (doc == null) return new { error = "公文不存在" };

        return new
        {
            id = doc.Id,
            title = doc.Title,
            content = doc.Content,
            documentType = doc.DocumentType,
            category = doc.Category,
            status = doc.Status,
            formData = doc.FormData,
            attachmentIds = doc.AttachmentIds,
            createdBy = doc.CreatedBy,
            createdAt = doc.CreatedAt,
            workflowInstanceId = doc.WorkflowInstanceId
        };
    }

    private async Task<object> HandleGetDocumentStatisticsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var stats = await _documentService.GetStatisticsAsync();
        return stats;
    }

    #endregion

    #region 云存储相关工具处理方法

    private async Task<object> HandleGetFileItemsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var parentId = arguments.ContainsKey("parentId") ? (arguments["parentId"]?.ToString() ?? "root") : "root";
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 50, maxPageSize: 200);

        var query = new FileListQuery
        {
            Page = page,
            PageSize = pageSize
        };

        if (arguments.ContainsKey("search"))
        {
            // 如果提供了 search，直接使用搜索逻辑
            return await HandleSearchFilesAsync(arguments, currentUserId);
        }

        if (arguments.ContainsKey("fileType") && Enum.TryParse<FileItemType>(arguments["fileType"]?.ToString(), out var type))
        {
            query.Type = type;
        }

        var response = await _cloudStorageService.GetFileItemsAsync(parentId, query);

        return new
        {
            items = response.Data.Select(i => new
            {
                id = i.Id,
                name = i.Name,
                type = i.Type, // folder or file
                size = i.Size,
                mimeType = i.MimeType,
                parentId = i.ParentId,
                updatedAt = i.UpdatedAt
            }).ToList(),
            total = response.Total,
            page = response.Page,
            pageSize = response.PageSize
        };
    }

    private async Task<object> HandleSearchFilesAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var keyword = arguments.ContainsKey("keyword") ? (arguments["keyword"]?.ToString() ?? "") : (arguments.ContainsKey("search") ? (arguments["search"]?.ToString() ?? "") : "");
        if (string.IsNullOrEmpty(keyword)) return new { error = "关键词必填" };

        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 20, maxPageSize: 100);

        var request = new FileSearchQuery
        {
            Keyword = keyword,
            Page = page,
            PageSize = pageSize
        };

        var response = await _cloudStorageService.SearchFilesAsync(request);

        return new
        {
            items = response.Data.Select(i => new
            {
                id = i.Id,
                name = i.Name,
                type = i.Type,
                size = i.Size,
                path = i.Path,
                updatedAt = i.UpdatedAt
            }).ToList(),
            total = response.Total,
            page = response.Page,
            pageSize = response.PageSize
        };
    }

    private async Task<object> HandleCreateFolderAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var name = arguments.ContainsKey("name") ? arguments["name"]?.ToString() : null;
        var parentId = arguments.ContainsKey("parentId") ? (arguments["parentId"]?.ToString() ?? "root") : "root";

        if (string.IsNullOrEmpty(name)) return new { error = "文件夹名称必填" };

        var folder = await _cloudStorageService.CreateFolderAsync(name, parentId);
        return new { success = true, folderId = folder.Id, folderName = folder.Name };
    }

    private async Task<object> HandleGetStorageUsageAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var usage = await _cloudStorageService.GetStorageUsageAsync(currentUserId);
        return usage;
    }

    #endregion

    #region 物联网相关工具处理方法

    private async Task<object> HandleGetIoTGatewaysAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var keyword = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : null;
        var (page, pageSize) = ParsePaginationArgs(arguments);
        var (items, total) = await _iotService.GetGatewaysAsync(keyword, null, page, pageSize);
        return new { items, total, page, pageSize };
    }

    private async Task<object> HandleGetIoTDevicesAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var gatewayId = arguments.ContainsKey("gatewayId") ? arguments["gatewayId"]?.ToString() : null;
        var keyword = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : null;
        var (page, pageSize) = ParsePaginationArgs(arguments);
        var (items, total) = await _iotService.GetDevicesAsync(gatewayId, keyword, page, pageSize);
        return new { items, total, page, pageSize };
    }

    private async Task<object> HandleGetIoTPlatformStatisticsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        return await _iotService.GetPlatformStatisticsAsync();
    }

    #endregion

    #region 园区管理相关工具处理方法

    private async Task<object> HandleGetParkBuildingsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments);
        var request = new BuildingListRequest
        {
            Page = page,
            PageSize = pageSize,
            Search = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : null
        };
        return await _parkAssetService.GetBuildingsAsync(request);
    }

    private async Task<object> HandleGetParkLeadsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments);
        var request = new InvestmentLeadListRequest
        {
            Page = page,
            PageSize = pageSize,
            Search = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : null
        };
        return await _parkInvestmentService.GetLeadsAsync(request);
    }

    private async Task<object> HandleGetParkTenantsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments);
        var request = new ParkTenantListRequest
        {
            Page = page,
            PageSize = pageSize,
            Search = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : null
        };
        return await _parkTenantService.GetTenantsAsync(request);
    }

    private async Task<object> HandleGetParkContractsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments);
        var request = new LeaseContractListRequest
        {
            Page = page,
            PageSize = pageSize,
            Status = arguments.ContainsKey("status") ? arguments["status"]?.ToString() : null
        };
        return await _parkTenantService.GetContractsAsync(request);
    }

    private async Task<object> HandleGetParkVisitTasksAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments);
        var request = new VisitTaskListRequest
        {
            Page = page,
            PageSize = pageSize,
            Search = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : null,
            Status = arguments.ContainsKey("status") ? arguments["status"]?.ToString() : null
        };
        return await _parkVisitService.GetVisitTasksAsync(request);
    }

    private async Task<object> HandleGetParkVisitStatisticsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        return await _parkVisitService.GetVisitStatisticsAsync();
    }

    #endregion

    #region 密码本相关工具处理方法

    private async Task<object> HandleGetPasswordBookEntriesAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments);
        var request = new PasswordBookQueryRequest
        {
            Current = page,
            PageSize = pageSize,
            Keyword = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : null,
            Category = arguments.ContainsKey("category") ? arguments["category"]?.ToString() : null
        };
        var (items, total) = await _passwordBookService.GetEntriesAsync(request);
        return new { items, total, page = page, pageSize = pageSize };
    }

    #endregion
}

