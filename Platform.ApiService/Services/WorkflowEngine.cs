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
    /// <param name="definitionId">工作流定义ID</param>
    /// <param name="documentId">关联文档ID</param>
    /// <param name="startedBy">启动人用户ID</param>
    /// <param name="variables">初始变量</param>
    Task<WorkflowInstance> StartWorkflowAsync(string definitionId, string documentId, string startedBy, Dictionary<string, object?>? variables = null);

    /// <summary>
    /// 处理审批操作
    /// </summary>
    /// <param name="instanceId">工作流实例ID</param>
    /// <param name="nodeId">节点ID</param>
    /// <param name="action">审批动作</param>
    /// <param name="currentUserId">当前操作人用户ID</param>
    /// <param name="comment">审批意见</param>
    /// <param name="delegateToUserId">转办目标用户ID</param>
    Task<bool> ProcessApprovalAsync(string instanceId, string nodeId, ApprovalAction action, string currentUserId, string? comment = null, string? delegateToUserId = null);

    /// <summary>
    /// 获取指定节点的实际审批人列表
    /// </summary>
    Task<List<string>> GetNodeApproversAsync(string instanceId, string nodeId);

    /// <summary>
    /// 退回到指定节点
    /// </summary>
    /// <param name="instanceId">工作流实例ID</param>
    /// <param name="targetNodeId">目标节点ID</param>
    /// <param name="comment">退回意见</param>
    /// <param name="currentUserId">当前操作人用户ID</param>
    Task<bool> ReturnToNodeAsync(string instanceId, string targetNodeId, string comment, string currentUserId);

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
    private readonly DbContext _context;

    private readonly IUserService _userService;
    private readonly IUnifiedNotificationService _notificationService;
    private readonly IApproverResolverFactory _approverResolverFactory = null!;
    private readonly IWorkflowExpressionEvaluator _expressionEvaluator;
    private readonly IWorkflowExpressionValidator _expressionValidator;
    private readonly ILogger<WorkflowEngine> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILoggerFactory _loggerFactory;

    /// <summary>
    /// 初始化工作流引擎
    /// </summary>
    public WorkflowEngine(DbContext context,
        IUserService userService,
        IUnifiedNotificationService notificationService,
        IApproverResolverFactory approverResolverFactory,
        IWorkflowExpressionEvaluator expressionEvaluator,
        IWorkflowExpressionValidator expressionValidator,
        ILogger<WorkflowEngine> logger,
        IServiceScopeFactory scopeFactory,
        ILoggerFactory loggerFactory)
    {
        _context = context;
        _userService = userService;
        _notificationService = notificationService;
        _approverResolverFactory = approverResolverFactory;
        _expressionEvaluator = expressionEvaluator;
        _expressionValidator = expressionValidator;
        _logger = logger;
        _scopeFactory = scopeFactory;
        _loggerFactory = loggerFactory;
    }

    /// <summary>
    /// 启动工作流
    /// </summary>
    /// <param name="definitionId">工作流定义ID</param>
    /// <param name="documentId">关联文档ID</param>
    /// <param name="startedBy">启动人用户ID</param>
    /// <param name="variables">初始变量</param>
    public async Task<WorkflowInstance> StartWorkflowAsync(string definitionId, string documentId, string startedBy, Dictionary<string, object?>? variables = null)
    {
        var definition = await _context.Set<WorkflowDefinition>().FirstOrDefaultAsync(x => x.Id == definitionId);
        if (definition == null || !definition.IsActive)
        {
            throw new InvalidOperationException("流程定义不存在或未启用");
        }

        // 创建流程实例
        var instance = new WorkflowInstance
        {
            WorkflowDefinitionId = definitionId,
            DocumentId = string.IsNullOrEmpty(documentId) ? null : documentId,
            StartedBy = startedBy,
            StartedAt = DateTime.UtcNow,
            WorkflowDefinitionSnapshot = definition, // 🔧 保存快照以保证流程稳定性
            CompanyId = definition.CompanyId
        };

        _logger.LogInformation("Creating workflow instance: DefinitionId={DefinitionId}, DocumentId={DocumentId}, StartedBy={StartedBy}",
            instance.WorkflowDefinitionId, instance.DocumentId, startedBy);

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
                    var formDefs = await _context.Set<FormDefinition>().Where(f => f.Id == formDefId).ToListAsync();
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
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[DIAGNOSTIC] AuditObject failed for path: {Path}", path);
                }
            }
        }
        AuditObject(instance, "WorkflowInstance");

        await _context.Set<WorkflowInstance>().AddAsync(instance);
        await _context.SaveChangesAsync();

        // 更新公文状态
        if (!string.IsNullOrEmpty(documentId))
        {
            var entity = await _context.Set<Document>().FirstOrDefaultAsync(x => x.Id == documentId);
        if (entity != null)
        {
                entity.Status = Models.Workflow.DocumentStatus.Approving;
                entity.WorkflowInstanceId = instance.Id;
            await _context.SaveChangesAsync();
        }

        }

        // 查找开始节点并处理
        var startNode = definition.Graph.Nodes.FirstOrDefault(n => n.Data.NodeType == "start");
        if (startNode != null)
        {
            await SetCurrentNodeAsync(instance.Id, startNode.Id);
            await ProcessNodeAsync(instance.Id, startNode.Id);
        }

        // 返回数据库中的最新状态（因为自动节点可能已经改变了状态）
        return await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instance.Id) ?? instance;
    }

    /// <summary>
    /// 继续流程执行（用于后台任务或延迟任务恢复）
    /// </summary>
    public async Task<bool> ProceedAsync(string instanceId, string nodeId)
    {
        var instance = await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instanceId);
        if (instance == null || instance.Status != WorkflowStatus.Running) return false;

        await MoveToNextNodeAsync(instanceId, nodeId);
        return true;
    }
}