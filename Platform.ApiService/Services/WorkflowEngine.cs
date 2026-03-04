using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Platform.ApiService.Extensions;
using UserCompany = Platform.ApiService.Models.UserCompany;
using OpenAI;
using OpenAI.Chat;
using Microsoft.Extensions.Options;
using MongoDB.Bson;

namespace Platform.ApiService.Services;

/// <summary>
/// 工作流引擎服务接口
/// </summary>
public interface IWorkflowEngine
{
    /// <summary>
    /// 启动工作流
    /// </summary>
    Task<WorkflowInstance> StartWorkflowAsync(string definitionId, string documentId, Dictionary<string, object>? variables = null);

    /// <summary>
    /// 处理审批操作
    /// </summary>
    Task<bool> ProcessApprovalAsync(string instanceId, string nodeId, ApprovalAction action, string? comment = null, string? delegateToUserId = null);

    /// <summary>
    /// 获取指定节点的实际审批人列表
    /// </summary>
    Task<List<string>> GetNodeApproversAsync(string instanceId, string nodeId);

    /// <summary>
    /// 处理条件节点
    /// </summary>
    Task<bool> ProcessConditionAsync(string instanceId, string nodeId, Dictionary<string, object> variables);

    /// <summary>
    /// 完成并行分支
    /// </summary>
    Task<bool> CompleteParallelBranchAsync(string instanceId, string nodeId, string branchId);

    /// <summary>
    /// 退回到指定节点
    /// </summary>
    Task<bool> ReturnToNodeAsync(string instanceId, string targetNodeId, string comment);

    /// <summary>
    /// 获取审批历史
    /// </summary>
    Task<List<ApprovalRecord>> GetApprovalHistoryAsync(string instanceId);

    /// <summary>
    /// 获取流程实例
    /// </summary>
    Task<WorkflowInstance?> GetInstanceAsync(string instanceId);

    /// <summary>
    /// 取消流程
    /// </summary>
    Task<bool> CancelWorkflowAsync(string instanceId, string reason);

    /// <summary>
    /// 继续流程执行（用于后台任务或延迟任务恢复）
    /// </summary>
    Task<bool> ProceedAsync(string instanceId, string nodeId);
}

/// <summary>
/// 工作流引擎服务实现
/// </summary>
public partial class WorkflowEngine : IWorkflowEngine
{
    private readonly IDataFactory<WorkflowDefinition> _definitionFactory;
    private readonly IDataFactory<WorkflowInstance> _instanceFactory;
    private readonly IDataFactory<ApprovalRecord> _approvalRecordFactory;
    private readonly IDataFactory<Document> _documentFactory;
    private readonly IDataFactory<UserCompany> _userCompanyFactory;
    private readonly IDataFactory<FormDefinition> _formFactory;
    private readonly IUserService _userService;
    private readonly IUnifiedNotificationService _notificationService;
    private readonly ITenantContext _tenantContext;
    private readonly IApproverResolverFactory _approverResolverFactory;
    private readonly IWorkflowExpressionEvaluator _expressionEvaluator;
    private readonly OpenAIClient _openAiClient;
    private readonly AiCompletionOptions _aiOptions;
    private readonly ILogger<WorkflowEngine> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    /// <summary>
    /// 初始化工作流引擎
    /// </summary>
    public WorkflowEngine(
        IDataFactory<WorkflowDefinition> definitionFactory,
        IDataFactory<WorkflowInstance> instanceFactory,
        IDataFactory<ApprovalRecord> approvalRecordFactory,
        IDataFactory<Document> documentFactory,
        IDataFactory<UserCompany> userCompanyFactory,
        IDataFactory<FormDefinition> formFactory,
        IUserService userService,
        IUnifiedNotificationService notificationService,
        ITenantContext tenantContext,
        IApproverResolverFactory approverResolverFactory,
        IWorkflowExpressionEvaluator expressionEvaluator,
        OpenAIClient openAiClient,
        IOptions<AiCompletionOptions> aiOptions,
        ILogger<WorkflowEngine> logger,
        IServiceScopeFactory scopeFactory)
    {
        _definitionFactory = definitionFactory;
        _instanceFactory = instanceFactory;
        _approvalRecordFactory = approvalRecordFactory;
        _documentFactory = documentFactory;
        _userCompanyFactory = userCompanyFactory;
        _formFactory = formFactory;
        _userService = userService;
        _notificationService = notificationService;
        _tenantContext = tenantContext;
        _approverResolverFactory = approverResolverFactory;
        _expressionEvaluator = expressionEvaluator;
        _openAiClient = openAiClient;
        _aiOptions = aiOptions.Value;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    /// <summary>
    /// 启动工作流
    /// </summary>
    public async Task<WorkflowInstance> StartWorkflowAsync(string definitionId, string documentId, Dictionary<string, object>? variables = null)
    {
        var userId = _tenantContext.GetCurrentUserId() ?? throw new UnauthorizedAccessException("USER_NOT_AUTHENTICATED");
        var companyId = await _tenantContext.GetCurrentCompanyIdAsync();

        var definition = await _definitionFactory.GetByIdAsync(definitionId);
        if (definition == null || !definition.IsActive)
        {
            throw new InvalidOperationException("流程定义不存在或未启用");
        }

        // 创建流程实例
        var instance = new WorkflowInstance
        {
            WorkflowDefinitionId = definitionId,
            DocumentId = documentId,
            Status = WorkflowStatus.Running,
            StartedBy = userId,
            StartedAt = DateTime.UtcNow,
            WorkflowDefinitionSnapshot = definition, // 🔧 保存快照以保证流程稳定性
            CompanyId = companyId ?? string.Empty
        };

        // 初始化变量
        instance.ResetVariables(variables ?? new Dictionary<string, object>());

        // 🔧 Bug Fix: 保存流程涉及的所有表单定义快照
        var formNodes = definition.Graph.Nodes.Where(n => n.Config?.Form != null).ToList();
        foreach (var node in formNodes)
        {
            var formDefId = node.Config?.Form?.FormDefinitionId;
            if (!string.IsNullOrEmpty(formDefId))
            {
                var formDef = await _formFactory.GetByIdAsync(formDefId);
                if (formDef != null)
                {
                    instance.FormDefinitionSnapshots.Add(new FormSnapshotEntry
                    {
                        NodeId = node.Id,
                        FormDefinition = formDef
                    });
                }
            }
        }

        await _instanceFactory.CreateAsync(instance);

        // 更新公文状态
        await _documentFactory.UpdateAsync(documentId, d =>
        {
            d.Status = Models.Workflow.DocumentStatus.Approving;
            d.WorkflowInstanceId = instance.Id;
            d.UpdatedAt = DateTime.UtcNow;
        });

        // 查找开始节点并处理
        var startNode = definition.Graph.Nodes.FirstOrDefault(n => n.Type == "start");
        if (startNode != null)
        {
            await SetCurrentNodeAsync(instance.Id, startNode.Id);
            await ProcessNodeAsync(instance.Id, startNode.Id);
        }

        return instance;
    }

    /// <summary>
    /// 继续流程执行（用于后台任务或延迟任务恢复）
    /// </summary>
    public async Task<bool> ProceedAsync(string instanceId, string nodeId)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null || instance.Status != WorkflowStatus.Running) return false;

        await MoveToNextNodeAsync(instanceId, nodeId);
        return true;
    }
}
