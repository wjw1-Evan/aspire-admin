#pragma warning disable CS1591
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

public class AiAgentService : IAiAgentService
{
    private readonly IDataFactory<AiAgent> _agentFactory;
    private readonly IDataFactory<AiAgentRun> _runFactory;
    private readonly IAiAgentOrchestrator _orchestrator;
    private readonly ILogger<AiAgentService> _logger;

    public AiAgentService(
        IDataFactory<AiAgent> agentFactory,
        IDataFactory<AiAgentRun> runFactory,
        IAiAgentOrchestrator orchestrator,
        ILogger<AiAgentService> logger)
    {
        _agentFactory = agentFactory ?? throw new ArgumentNullException(nameof(agentFactory));
        _runFactory = runFactory ?? throw new ArgumentNullException(nameof(runFactory));
        _orchestrator = orchestrator ?? throw new ArgumentNullException(nameof(orchestrator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<AiAgent> CreateAgentAsync(AiAgent agent)
    {
        return await _agentFactory.CreateAsync(agent);
    }

    public async Task<AiAgent?> GetAgentByIdAsync(string id)
    {
        return await _agentFactory.GetByIdAsync(id);
    }

    public async Task<List<AiAgent>> GetAgentsAsync()
    {
        return await _agentFactory.FindAsync(_ => true, q => q.OrderByDescending(a => a.CreatedAt));
    }

    public async Task<AiAgent> UpdateAgentAsync(AiAgent agent)
    {
        await _agentFactory.UpdateAsync(agent.Id, a =>
        {
            a.Name = agent.Name;
            a.Description = agent.Description;
            a.Persona = agent.Persona;
            a.AllowedSkills = agent.AllowedSkills;
            a.Model = agent.Model;
            a.Temperature = agent.Temperature;
            a.IsEnabled = agent.IsEnabled;
            a.UpdatedAt = DateTime.UtcNow; // Added this line based on common update patterns
        });
        return agent;
    }

    public async Task<bool> DeleteAgentAsync(string id)
    {
        return await _agentFactory.SoftDeleteAsync(id);
    }

    public async Task<AiAgentRun> CreateRunAsync(string agentId, string goal)
    {
        var run = new AiAgentRun
        {
            AgentId = agentId,
            Goal = goal,
            Status = AiAgentRunStatus.Queued,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        return await _runFactory.CreateAsync(run);
    }

    public async Task<AiAgentRun?> GetRunByIdAsync(string id)
    {
        return await _runFactory.GetByIdAsync(id);
    }

    public async Task<List<AiAgentRun>> GetAgentRunsAsync(string agentId)
    {
        return await _runFactory.FindAsync(r => r.AgentId == agentId, q => q.OrderByDescending(r => r.CreatedAt));
    }

    public async Task StartAgentRunAsync(string runId, string? sessionId = null)
    {
        var run = await _runFactory.GetByIdAsync(runId);
        if (run == null)
        {
            _logger.LogWarning("无法启动 AI Agent 执行任务: 未找到运行记录 {RunId}", runId);
            return;
        }

        _logger.LogInformation("启动 AI Agent 执行任务: {RunId}, 会话 ID: {SessionId}", runId, sessionId ?? "N/A");

        // 异步执行编排逻辑
        _ = Task.Run(async () =>
        {
            try
            {
                await _orchestrator.ExecuteRunAsync(runId, run.CreatedBy ?? "system", sessionId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Orchestrator 执行异常 {RunId}", runId);
            }
        });
    }

    public async Task InitializeSeedAgentsAsync()
    {
        var existingAgents = await _agentFactory.FindAsync(a => true, null, 100);

        // 1. 项目管家
        if (!existingAgents.Any(a => a.Name == "项目管家"))
        {
            await CreateAgentAsync(new AiAgent
            {
                Name = "项目管家",
                Description = "负责项目进度分析、任务分配及协作流程处理。",
                Persona = "你是一个专业且严谨的项目管家。你擅长协调团队任务，分析项目瓶颈。在执行任务时，你会优先检查任务的优先级和截止日期，并能通过调用公文和流程工具来推进工作。你拥有编辑和执行项目任务的完全权限，能够主动更新任务状态、调整优先级或标记任务完成，以确保项目目标达成。你也负责管理任务管理中心 (task-management) 的相关功能，能引导用户在此页面高效处理待办。",
                AllowedSkills = new List<string> {
                    "get_tasks", "get_task_detail", "create_task", "update_task", "assign_task", "complete_task", "get_task_statistics",
                    "get_projects", "get_project_detail", "create_project", "get_project_statistics",
                    "get_documents", "get_document_detail", "get_document_statistics",
                    "get_workflow_definitions", "get_workflow_instances", "get_workflow_instance_detail", "process_workflow_approval"
                },
                Model = "gpt-4-turbo",
                Temperature = 0.3
            });
        }

        // 2. 物联专家
        if (!existingAgents.Any(a => a.Name == "物联专家"))
        {
            await CreateAgentAsync(new AiAgent
            {
                Name = "物联专家",
                Description = "专注于物联网设备监控、遥测数据分析与异常诊断。",
                Persona = "你是一名资深的物联网专家，精通各类传感器数据与网关协议。你能够敏锐地捕捉到设备波动中的异常信号，并通过实时数据点分析给出专业的诊断建议与控制指令。",
                AllowedSkills = new List<string> { "get_iot_gateways", "get_iot_devices", "get_iot_platform_statistics", "get_iot_datapoints", "get_latest_iot_data" },
                Model = "gpt-4-turbo",
                Temperature = 0.2
            });
        }

        // 3. 资产助手
        if (!existingAgents.Any(a => a.Name == "资产助手"))
        {
            await CreateAgentAsync(new AiAgent
            {
                Name = "资产助手",
                Description = "负责云端文件检索、密码本管理及用户记忆维护。",
                Persona = "你是一个贴心且高效的数字资产助手。你对用户的各种云端文档、账号记录了如指掌。你不仅能快速帮用户找回遗忘的信息，还能检索历史交流的上下文，并根据对话内容主动记录并学习用户的偏好与习惯。你也负责处理系统通知与个人待办事项，确保用户不会错过任何重要提醒。",
                AllowedSkills = new List<string> {
                    "search_cloud_files", "search_password_book", "get_file_items", "search_files", "create_folder", "get_storage_usage",
                    "memorize_user_fact", "forget_user_fact", "get_password_book_entries",
                    "get_chat_sessions", "get_chat_messages",
                    "get_unified_notifications", "get_unread_notification_stats", "mark_notification_read", "get_task_notifications", "get_system_messages",
                    "get_todos", "create_todo", "update_todo", "complete_todo", "delete_todo"
                },
                Model = "gpt-4-turbo",
                Temperature = 0.5
            });
        }

        // 4. 园区管家
        // 4. 招商顾问
        if (!existingAgents.Any(a => a.Name == "招商顾问"))
        {
            await CreateAgentAsync(new AiAgent
            {
                Name = "招商顾问",
                Description = "专注于园区招商分析、线索跟踪与租赁合同管理。",
                Persona = "你是一名资深的园区招商顾问。你对楼宇的租赁状态、招商线索的质量以及条款复杂的租赁合同有着敏锐的洞察力。你擅长协调潜在客户需求与园区资产，通过数据分析提供最优的招商策略建议。",
                AllowedSkills = new List<string> { "get_park_buildings", "get_park_leads", "get_park_contracts" },
                Model = "gpt-4-turbo",
                Temperature = 0.2
            });
        }

        // 5. 园区运营专家
        if (!existingAgents.Any(a => a.Name == "园区运营专家"))
        {
            await CreateAgentAsync(new AiAgent
            {
                Name = "园区运营专家",
                Description = "专注于租户服务、企业服务申请处理、园区走访及运营效率提升。",
                Persona = "你是一名资深的园区运营专家。你高度关注租户满意度，擅长处理企业提出的各类服务申请（报修、投诉、入驻等）。你定期执行园区走访任务，并能从运营统计数据中发现提升服务质量的机会，确保园区生态的健康运行。",
                AllowedSkills = new List<string> {
                    "get_park_tenants", "get_park_visit_tasks", "get_park_visit_statistics",
                    "get_park_service_categories", "get_park_service_requests", "get_park_service_request_detail",
                    "create_park_service_request", "get_park_service_statistics"
                },
                Model = "gpt-4-turbo",
                Temperature = 0.3
            });
        }

        // 5. 行政专家
        if (!existingAgents.Any(a => a.Name == "行政专家"))
        {
            await CreateAgentAsync(new AiAgent
            {
                Name = "行政专家",
                Description = "负责用户查询、组织架构、角色权限、公司信息及系统配置管理。",
                Persona = "你是一个专业且高效的行政专家。你对公司的组织架构、人员分布以及系统的权限配置了如指掌。你擅长快速检索用户信息，发现周边的协作机会（寻找附近同事），解释权限规则，并能调阅审计日志来追溯系统操作历史。你协助管理系统的各项基础配置条目，处理信息极其严谨，确保数据的准确性与合规性。",
                AllowedSkills = new List<string> {
                    "get_user_info", "search_users", "get_nearby_users", "get_company_info", "search_companies",
                    "get_all_roles", "get_role_info", "get_my_activity_logs",
                    "get_xiaoke_configs", "get_xiaoke_config", "get_default_xiaoke_config"
                },
                Model = "gpt-4-turbo",
                Temperature = 0.2
            });
        }
    }
}
