using System.Text.Json;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
namespace Platform.ApiService.Services;
/// <summary>
/// MCP 服务实现
/// </summary>
public partial class McpService : IMcpService
{
    private readonly IDataFactory<AppUser> _userFactory;
    private readonly IDataFactory<ChatSession> _sessionFactory;
    private readonly IDataFactory<ChatMessage> _messageFactory;
    private readonly IDataFactory<Company> _companyFactory;
    private readonly IDataFactory<Role> _roleFactory;
    private readonly IDataFactory<RuleListItem> _ruleFactory;
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
    private readonly IWorkflowEngine _workflowEngine;
    private readonly IDataFactory<WorkflowDefinition> _workflowDefinitionFactory;
    private readonly IDataFactory<WorkflowInstance> _workflowInstanceFactory;
    private readonly IDataFactory<ApprovalRecord> _approvalRecordFactory;
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
    /// <param name="workflowEngine">工作流引擎</param>
    /// <param name="workflowDefinitionFactory">工作流定义数据工厂</param>
    /// <param name="workflowInstanceFactory">工作流实例数据工厂</param>
    /// <param name="approvalRecordFactory">审批记录数据工厂</param>
    /// <param name="logger">日志记录器</param>
    public McpService(
        IDataFactory<AppUser> userFactory,
        IDataFactory<ChatSession> sessionFactory,
        IDataFactory<ChatMessage> messageFactory,
        IDataFactory<Company> companyFactory,
        IDataFactory<Role> roleFactory,
        IDataFactory<RuleListItem> ruleFactory,
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
        IWorkflowEngine workflowEngine,
        IDataFactory<WorkflowDefinition> workflowDefinitionFactory,
        IDataFactory<WorkflowInstance> workflowInstanceFactory,
        IDataFactory<ApprovalRecord> approvalRecordFactory,
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
        _workflowEngine = workflowEngine;
        _workflowDefinitionFactory = workflowDefinitionFactory;
        _workflowInstanceFactory = workflowInstanceFactory;
        _approvalRecordFactory = approvalRecordFactory;
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

                "create_park_lead" => await HandleCreateParkLeadAsync(arguments, currentUserId),
                "update_park_lead" => await HandleUpdateParkLeadAsync(arguments, currentUserId),
                "delete_park_lead" => await HandleDeleteParkLeadAsync(arguments, currentUserId),
                "convert_park_lead_to_project" => await HandleConvertParkLeadToProjectAsync(arguments, currentUserId),

                "create_park_contract" => await HandleCreateParkContractAsync(arguments, currentUserId),
                "update_park_contract" => await HandleUpdateParkContractAsync(arguments, currentUserId),
                "delete_park_contract" => await HandleDeleteParkContractAsync(arguments, currentUserId),

                "create_park_visit_task" => await HandleCreateParkVisitTaskAsync(arguments, currentUserId),
                "update_park_visit_task" => await HandleUpdateParkVisitTaskAsync(arguments, currentUserId),
                "delete_park_visit_task" => await HandleDeleteParkVisitTaskAsync(arguments, currentUserId),

                "get_park_service_categories" => await HandleGetParkServiceCategoriesAsync(arguments, currentUserId),
                "get_park_service_requests" => await HandleGetParkServiceRequestsAsync(arguments, currentUserId),
                "get_park_service_request_detail" => await HandleGetParkServiceRequestDetailAsync(arguments, currentUserId),
                "create_park_service_request" => await HandleCreateParkServiceRequestAsync(arguments, currentUserId),
                "update_park_service_request_status" => await HandleUpdateParkServiceRequestStatusAsync(arguments, currentUserId),
                "delete_park_service_request" => await HandleDeleteParkServiceRequestAsync(arguments, currentUserId),
                "rate_park_service_request" => await HandleRateParkServiceRequestAsync(arguments, currentUserId),
                "get_park_service_statistics" => await HandleGetParkServiceStatisticsAsync(arguments, currentUserId),
                // 密码本相关
                "get_password_book_entries" => await HandleGetPasswordBookEntriesAsync(arguments, currentUserId),
                // 工作流相关
                "get_workflow_definitions" => await HandleGetWorkflowDefinitionsAsync(arguments, currentUserId),
                "get_workflow_instances" => await HandleGetWorkflowInstancesAsync(arguments, currentUserId),
                "get_workflow_instance_detail" => await HandleGetWorkflowInstanceDetailAsync(arguments, currentUserId),
                "process_workflow_approval" => await HandleProcessWorkflowApprovalAsync(arguments, currentUserId),
                // 物联网新增
                "get_iot_datapoints" => await HandleGetIoTDataPointsAsync(arguments, currentUserId),
                "get_latest_iot_data" => await HandleGetLatestIoTDataAsync(arguments, currentUserId),
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
        var sessions = await _sessionFactory.FindAsync(
            s => s.Participants != null && s.Participants.Contains(currentUserId),
            limit: 10);

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
                    var companyId = currentUser.CurrentCompanyId;
                    var users = await _userFactory.FindAsync(
                        u => u.CurrentCompanyId == companyId,
                        q => q.OrderByDescending(u => u.CreatedAt),
                        limit: 100);
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
                var sessions = await _sessionFactory.FindAsync(
                    s => s.Participants != null && s.Participants.Contains(currentUserId),
                    q => q.OrderByDescending(s => s.UpdatedAt),
                    limit: 50);
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
            else if (uri.StartsWith("workflow://"))
            {
                var instanceId = uri.Replace("workflow://", "");
                var instance = await _workflowInstanceFactory.GetByIdAsync(instanceId);
                if (instance != null)
                {
                    var history = await _workflowEngine.GetApprovalHistoryAsync(instanceId);
                    contents.Add(new McpContent
                    {
                        Type = "text",
                        Text = JsonSerializer.Serialize(new { instance, history }, new JsonSerializerOptions { WriteIndented = true })
                    });
                }
            }
            else if (uri.StartsWith("iot://"))
            {
                var deviceId = uri.Replace("iot://", "");
                var device = await _iotService.GetDeviceByIdAsync(deviceId);
                if (device != null)
                {
                    var stats = await _iotService.GetDeviceStatisticsAsync(device.DeviceId);
                    contents.Add(new McpContent
                    {
                        Type = "text",
                        Text = JsonSerializer.Serialize(new { device, stats }, new JsonSerializerOptions { WriteIndented = true })
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
            },
            new()
            {
                Name = "workflow_analysis",
                Description = "分析工作流实例的执行情况和审批效率。",
                Arguments = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["instanceId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "流程实例ID"
                        }
                    },
                    ["required"] = new[] { "instanceId" }
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

            case "workflow_analysis":
                var instanceId = arguments.ContainsKey("instanceId") ? arguments["instanceId"]?.ToString() : "";
                messages.Add(new McpContent
                {
                    Type = "text",
                    Text = $"请分析工作流实例 {instanceId} 的审批历史和当前进度。重点关注是否存在审批瓶颈、审批人是否及时处理，并给出优化建议。"
                });
                break;

            default:
                throw new ArgumentException($"未知的提示词: {promptName}");
        }

        return new McpGetPromptResponse { Messages = messages };
    }

}

