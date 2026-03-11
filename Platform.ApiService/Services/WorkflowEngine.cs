using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using System.Text.Json;
using Platform.ApiService.Extensions;
using UserCompany = Platform.ApiService.Models.UserCompany;
using OpenAI;
using OpenAI.Chat;
using Microsoft.Extensions.Options;
using MongoDB.Bson;
using Microsoft.Agents.AI;
using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Workflows.Executors;

namespace Platform.ApiService.Services;

/// <summary>
/// 工作流引擎服务接口
/// </summary>
public interface IWorkflowEngine
{
    /// <summary>
    /// 启动工作流
    /// </summary>
    Task<WorkflowInstance> StartWorkflowAsync(string definitionId, string documentId, Dictionary<string, object?>? variables = null);

    /// <summary>
    /// 处理审批操作
    /// </summary>
    Task<bool> ProcessApprovalAsync(string instanceId, string nodeId, ApprovalAction action, string? comment = null, string? delegateToUserId = null);

    /// <summary>
    /// 获取指定节点的实际审批人列表
    /// </summary>
    Task<List<string>> GetNodeApproversAsync(string instanceId, string nodeId);


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

    /// <summary>
    /// 处理人工输入提交 - 验证用户后继续流程
    /// </summary>
    Task<bool> ProcessHumanInputSubmitAsync(string instanceId, string nodeId);
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
    private readonly IKnowledgeService _knowledgeService;
    private readonly IEmailService _emailService;
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
        IKnowledgeService knowledgeService,
        IEmailService emailService,
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
        _knowledgeService = knowledgeService;
        _emailService = emailService;
        _openAiClient = openAiClient;
        _aiOptions = aiOptions.Value;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    /// <summary>
    /// 启动工作流
    /// </summary>
    public async Task<WorkflowInstance> StartWorkflowAsync(string definitionId, string documentId, Dictionary<string, object?>? variables = null)
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
            DocumentId = string.IsNullOrEmpty(documentId) ? null : documentId,
            Status = WorkflowStatus.Running,
            StartedBy = userId,
            StartedAt = DateTime.UtcNow,
            WorkflowDefinitionSnapshot = definition, // 🔧 保存快照以保证流程稳定性
            CompanyId = companyId ?? string.Empty
        };

        _logger.LogInformation("Creating workflow instance: DefinitionId={DefinitionId}, DocumentId={DocumentId}, CompanyId={CompanyId}, UserId={UserId}",
            instance.WorkflowDefinitionId, instance.DocumentId, instance.CompanyId, userId);

        // 初始化变量
        instance.ResetVariables(variables ?? new Dictionary<string, object?>());

        // 🔧 Bug Fix: 保存流程涉及的所有表单定义快照
        var formNodes = definition.Graph.Nodes.Where(n => n.Data.Config?.Form != null).ToList();
        var formCache = new Dictionary<string, FormDefinition>();
        foreach (var node in formNodes)
        {
            var formDefId = node.Data.Config?.Form?.FormDefinitionId;
            if (!string.IsNullOrEmpty(formDefId))
            {
                if (!formCache.TryGetValue(formDefId, out var formDef))
                {
                    var formDefs = await _formFactory.FindAsync(f => f.Id == formDefId, includes: [f => f.Fields]);
                    formDef = formDefs.FirstOrDefault();
                    if (formDef != null) formCache[formDefId] = formDef;
                }

                if (formDef != null)
                {
                    instance.FormDefinitionSnapshots.Add(new FormSnapshotEntry
                    {
                        NodeId = node.Id,
                        FormDefinitionJson = JsonSerializer.Serialize(formDef)
                    });
                }
            }
        }

        // 🔍 Diagnostic Audit: Find any empty strings in ObjectId fields
        void AuditObject(object? obj, string path)
        {
            if (obj == null) return;

            // Handle Collections
            if (obj is System.Collections.IEnumerable enumerable && !(obj is string))
            {
                int i = 0;
                foreach (var item in enumerable)
                {
                    AuditObject(item, $"{path}[{i++}]");
                }
                return;
            }

            var type = obj.GetType();
            if (type.FullName?.StartsWith("System.") == true) return;

            foreach (var p in type.GetProperties())
            {
                try
                {
                    if (p.GetIndexParameters().Length > 0) continue;
                    var val = p.GetValue(obj);
                    if (val is string s && s == string.Empty)
                    {
                        var attr = p.GetCustomAttribute<MongoDB.Bson.Serialization.Attributes.BsonRepresentationAttribute>();
                        // 仅对 ObjectId 映射字段报告空字符串（可能导致 MongoDB 写入异常），Condition 等业务空串为合法
                        if (attr?.Representation == MongoDB.Bson.BsonType.ObjectId)
                            _logger.LogError("[DIAGNOSTIC] Empty string in ObjectId field: {Path}.{Prop}", path, p.Name);
                    }
                    else if (val != null && p.PropertyType.IsClass && p.PropertyType != typeof(string))
                    {
                        AuditObject(val, $"{path}.{p.Name}");
                    }
                }
                catch { }
            }
        }
        AuditObject(instance, "WorkflowInstance");

        await _instanceFactory.CreateAsync(instance);

        // 更新公文状态
        if (!string.IsNullOrEmpty(documentId))
        {
            await _documentFactory.UpdateAsync(documentId, d =>
            {
                d.Status = Models.Workflow.DocumentStatus.Approving;
                d.WorkflowInstanceId = instance.Id;
                d.UpdatedAt = DateTime.UtcNow;
            });
        }

        // 查找开始节点并处理
        var startNode = definition.Graph.Nodes.FirstOrDefault(n => n.Data.NodeType == "start");
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
