using MongoDB.Driver;
using MongoDB.Bson;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Platform.ApiService.Extensions;
using UserCompany = Platform.ApiService.Models.UserCompany;

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
}

/// <summary>
/// 工作流引擎服务实现
/// </summary>
public class WorkflowEngine : IWorkflowEngine
{
    private readonly IDatabaseOperationFactory<WorkflowDefinition> _definitionFactory;
    private readonly IDatabaseOperationFactory<WorkflowInstance> _instanceFactory;
    private readonly IDatabaseOperationFactory<ApprovalRecord> _approvalRecordFactory;
    private readonly IDatabaseOperationFactory<Document> _documentFactory;
    private readonly IDatabaseOperationFactory<UserCompany> _userCompanyFactory;
    private readonly IDatabaseOperationFactory<FormDefinition> _formFactory;
    private readonly IUserService _userService;
    private readonly IUnifiedNotificationService _notificationService;
    private readonly ITenantContext _tenantContext;
    private readonly IApproverResolverFactory _approverResolverFactory;
    private readonly IWorkflowExpressionEvaluator _expressionEvaluator;
    private readonly ILogger<WorkflowEngine> _logger;

    /// <summary>
    /// 初始化工作流引擎
    /// </summary>
    /// <param name="definitionFactory">流程定义工厂</param>
    /// <param name="instanceFactory">流程实例工厂</param>
    /// <param name="approvalRecordFactory">审批记录工厂</param>
    /// <param name="documentFactory">公文工厂</param>
    /// <param name="userCompanyFactory">用户企业关系工厂</param>
    /// <param name="formFactory">表单定义工厂</param>
    /// <param name="userService">用户服务</param>
    /// <param name="notificationService">通知服务</param>
    /// <param name="tenantContext">租户上下文</param>
    /// <param name="logger">日志记录器</param>
    public WorkflowEngine(
        IDatabaseOperationFactory<WorkflowDefinition> definitionFactory,
        IDatabaseOperationFactory<WorkflowInstance> instanceFactory,
        IDatabaseOperationFactory<ApprovalRecord> approvalRecordFactory,
        IDatabaseOperationFactory<Document> documentFactory,
        IDatabaseOperationFactory<UserCompany> userCompanyFactory,
        IDatabaseOperationFactory<FormDefinition> formFactory,
        IUserService userService,
        IUnifiedNotificationService notificationService,
        ITenantContext tenantContext,
        IApproverResolverFactory approverResolverFactory,
        IWorkflowExpressionEvaluator expressionEvaluator,
        ILogger<WorkflowEngine> logger)
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
        _logger = logger;
    }

    /// <summary>
    /// 启动工作流
    /// </summary>
    public async Task<WorkflowInstance> StartWorkflowAsync(string definitionId, string documentId, Dictionary<string, object>? variables = null)
    {
        var userId = _definitionFactory.GetRequiredUserId();
        var companyId = await _definitionFactory.GetRequiredCompanyIdAsync();

        // 1. 获取流程定义
        var definition = await _definitionFactory.GetByIdAsync(definitionId);
        if (definition == null || !definition.IsActive)
        {
            throw new InvalidOperationException("流程定义不存在或未启用");
        }

        // 清洗变量，防止 JsonElement 进入 Mongo 序列化
        var sanitizedVars = variables != null
            ? SerializationExtensions.SanitizeDictionary(variables)
            : new Dictionary<string, object>();

        // 2. 验证公文存在
        var document = await _documentFactory.GetByIdAsync(documentId);
        if (document == null)
        {
            throw new InvalidOperationException("公文不存在");
        }

        var startNode = definition.Graph.Nodes.FirstOrDefault(n => n.Type == "start");
        if (startNode == null)
        {
            throw new InvalidOperationException("流程定义中未找到起始节点");
        }

        // 3. 保存表单定义快照（所有绑定表单的节点）
        var formSnapshots = new Dictionary<string, FormDefinition>();
        var formSnapshotErrors = new List<string>();
        
        foreach (var node in definition.Graph.Nodes)
        {
            var formBinding = node.Config?.Form;
            if (formBinding != null && !string.IsNullOrEmpty(formBinding.FormDefinitionId))
            {
                try
                {
                    var form = await _formFactory.GetByIdAsync(formBinding.FormDefinitionId);
                    if (form != null)
                    {
                        formSnapshots[node.Id] = form;
                        _logger.LogDebug("表单快照已保存: NodeId={NodeId}, FormId={FormId}", node.Id, form.Id);
                    }
                    else
                    {
                        var error = $"节点 {node.Id} 绑定的表单 {formBinding.FormDefinitionId} 不存在";
                        formSnapshotErrors.Add(error);
                        _logger.LogWarning(error);
                    }
                }
                catch (Exception ex)
                {
                    var error = $"获取节点 {node.Id} 的表单定义失败: {ex.Message}";
                    formSnapshotErrors.Add(error);
                    _logger.LogError(ex, "获取表单定义失败: NodeId={NodeId}, FormId={FormId}", node.Id, formBinding.FormDefinitionId);
                }
            }
        }

        // 如果有关键表单快照失败，抛出异常
        if (formSnapshotErrors.Any())
        {
            throw new InvalidOperationException($"表单快照保存失败: {string.Join("; ", formSnapshotErrors)}");
        }

        // 4. 创建流程实例（保存定义快照）
        var instance = new WorkflowInstance
        {
            WorkflowDefinitionId = definitionId,
            DocumentId = documentId,
            Status = WorkflowStatus.Running,
            CurrentNodeId = startNode.Id,
            Variables = sanitizedVars,
            StartedBy = userId,
            StartedAt = DateTime.UtcNow,
            CompanyId = companyId,
            WorkflowDefinitionSnapshot = definition, // 保存流程定义快照
            FormDefinitionSnapshots = formSnapshots // 保存表单定义快照
        };

        instance = await _instanceFactory.CreateAsync(instance);

        // 5. 更新公文状态
        var documentUpdate = _documentFactory.CreateUpdateBuilder()
            .Set(d => d.Status, DocumentStatus.Pending)
            .Set(d => d.WorkflowInstanceId, instance.Id)
            .Build();
        var documentFilter = _documentFactory.CreateFilterBuilder()
            .Equal(d => d.Id, documentId)
            .Build();
        await _documentFactory.FindOneAndUpdateAsync(documentFilter, documentUpdate);

        // 6. 推进到第一个节点
        await MoveToNextNodeAsync(instance.Id, startNode.Id);

        // 7. 发送通知给发起人
        try
        {
            await _notificationService.CreateWorkflowNotificationAsync(
                instance.Id,
                document.Title,
                "workflow_started",
                new[] { userId },
                $"流程已启动",
                companyId
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "发送流程启动通知失败: InstanceId={InstanceId}", instance.Id);
        }

        _logger.LogInformation("工作流已启动: InstanceId={InstanceId}, DefinitionId={DefinitionId}, DocumentId={DocumentId}",
            instance.Id, definitionId, documentId);

        return instance;
    }

    /// <summary>
    /// 获取指定节点的实际审批人列表
    /// </summary>
    public async Task<List<string>> GetNodeApproversAsync(string instanceId, string nodeId)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null)
        {
            return new List<string>();
        }

        var definition = await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null)
        {
            return new List<string>();
        }

        var node = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (node?.Config.Approval == null)
        {
            return new List<string>();
        }

        return await ResolveApproversAsync(instance, node.Config.Approval.Approvers);
    }

    /// <summary>
    /// 处理审批操作
    /// </summary>
    public async Task<bool> ProcessApprovalAsync(string instanceId, string nodeId, ApprovalAction action, string? comment = null, string? delegateToUserId = null)
    {
        var userId = _instanceFactory.GetRequiredUserId();
        var companyId = await _instanceFactory.GetRequiredCompanyIdAsync();

        // 使用乐观锁防止并发问题
        const int maxRetries = 3;
        for (int retry = 0; retry < maxRetries; retry++)
        {
            try
            {
                // 1. 获取流程实例
                var instance = await _instanceFactory.GetByIdAsync(instanceId);
                if (instance == null)
                {
                    throw new InvalidOperationException("流程实例不存在");
                }
                
                if (instance.Status != WorkflowStatus.Running)
                {
                    var statusText = instance.Status switch
                    {
                        WorkflowStatus.Completed => "已完成",
                        WorkflowStatus.Cancelled => "已取消", 
                        WorkflowStatus.Rejected => "已拒绝",
                        _ => instance.Status.ToString()
                    };
                    throw new InvalidOperationException($"流程实例已结束，当前状态：{statusText}。请刷新页面查看最新状态。");
                }

                // 2. 获取流程定义（使用快照）
                var definition = instance.WorkflowDefinitionSnapshot;
                if (definition == null)
                {
                    throw new InvalidOperationException("流程定义快照不存在");
                }

                // 3. 🔧 简化的节点验证和智能匹配
                var currentNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == instance.CurrentNodeId);
                if (currentNode == null || currentNode.Type != "approval")
                {
                    throw new InvalidOperationException("当前节点不存在或不是审批节点");
                }

                // 验证节点匹配
                if (nodeId != instance.CurrentNodeId)
                {
                    _logger.LogWarning("请求节点与当前节点不匹配: InstanceId={InstanceId}, RequestNodeId={RequestNodeId}, CurrentNodeId={CurrentNodeId}", 
                        instanceId, nodeId, instance.CurrentNodeId);
                    throw new InvalidOperationException($"节点不匹配。当前节点：{instance.CurrentNodeId}，请求节点：{nodeId}。请刷新页面获取最新状态。");
                }

                // 使用当前节点进行后续处理
                var processingNode = currentNode;
                
                // 4. 验证审批权限
                var approverId = delegateToUserId ?? userId;
                if (!await CanApproveAsync(instance, processingNode, approverId))
                {
                    throw new UnauthorizedAccessException("无权审批此节点");
                }

                // 5. 🔧 重复审批检查 - 只检查当前节点的审批记录
                // 关键修复：使用 processingNode.Id（当前节点ID）而不是 instance.CurrentNodeId 进行精确匹配
                // 这样可以确保即使流程中有多个节点使用了相同的节点ID，也能正确区分不同节点的审批记录
                var currentNodeId = processingNode.Id;
                
                // 检查重复审批
                _logger.LogDebug("检查重复审批: InstanceId={InstanceId}, NodeId={NodeId}, ApproverId={ApproverId}, Action={Action}", 
                    instanceId, currentNodeId, approverId, action);
                
                // 查找该用户在当前节点的审批记录
                var userApprovalRecordsForCurrentNode = instance.ApprovalRecords
                    .Where(r => !string.IsNullOrEmpty(r.NodeId) && 
                                !string.IsNullOrEmpty(r.ApproverId) &&
                                r.NodeId == currentNodeId && 
                                r.ApproverId == approverId)
                    .ToList();
                
                _logger.LogDebug("用户在当前节点的审批记录: InstanceId={InstanceId}, NodeId={NodeId}, ApproverId={ApproverId}, RecordCount={RecordCount}", 
                    instanceId, currentNodeId, approverId, userApprovalRecordsForCurrentNode.Count);
                
                // 检查是否有相同操作的审批记录
                var existingApprovalForCurrentNode = userApprovalRecordsForCurrentNode.FirstOrDefault(r => r.Action == action);
                
                if (existingApprovalForCurrentNode != null)
                {
                    // 用户已经在当前节点执行过相同的操作
                    _logger.LogWarning("用户已在当前节点执行过相同操作: InstanceId={InstanceId}, NodeId={NodeId}, ApproverId={ApproverId}, Action={Action}, ExistingRecordTime={ExistingRecordTime}", 
                        instanceId, currentNodeId, approverId, action, existingApprovalForCurrentNode.ApprovedAt);
                    
                    throw new InvalidOperationException($"您已对此节点执行过{action}操作（{existingApprovalForCurrentNode.ApprovedAt:yyyy-MM-dd HH:mm:ss}）");
                }
                
                _logger.LogDebug("重复审批检查通过: InstanceId={InstanceId}, NodeId={NodeId}, ApproverId={ApproverId}, Action={Action}", 
                    instanceId, currentNodeId, approverId, action);

                // 6. 转办权限验证
                if (action == ApprovalAction.Delegate && !string.IsNullOrEmpty(delegateToUserId))
                {
                    var canDelegateApprove = await CanApproveAsync(instance, processingNode, delegateToUserId);
                    if (!canDelegateApprove)
                    {
                        throw new InvalidOperationException("转办目标用户无权限审批此节点");
                    }
                }

                // 创建审批记录
                var user = await _userService.GetUserByIdAsync(approverId);
                var userName = user?.Username ?? approverId;
                
                // 使用当前节点ID创建审批记录
                var actualNodeId = currentNodeId;
                
                _logger.LogInformation("创建审批记录: InstanceId={InstanceId}, ActualNodeId={ActualNodeId}, RequestedNodeId={RequestedNodeId}, InstanceCurrentNodeId={InstanceCurrentNodeId}, ApproverId={ApproverId}, Action={Action}", 
                    instanceId, actualNodeId, nodeId, instance.CurrentNodeId, approverId, action);
                
                var approvalRecord = new ApprovalRecord
                {
                    Id = GenerateSafeObjectId(), // 使用安全的ObjectId生成方法
                    WorkflowInstanceId = instanceId,
                    NodeId = actualNodeId, // 🔧 关键修复：使用当前节点ID（processingNode.Id），确保审批记录记录在正确的节点上
                    ApproverId = approverId,
                    ApproverName = userName,
                    Action = action,
                    Comment = comment,
                    DelegateToUserId = delegateToUserId,
                    ApprovedAt = DateTime.UtcNow,
                    Sequence = instance.ApprovalRecords.Count + 1,
                    CompanyId = companyId
                };
                
                _logger.LogInformation("审批记录详情: Id={Id}, NodeId={NodeId}, ApproverId={ApproverId}, Action={Action}, Sequence={Sequence}", 
                    approvalRecord.Id, approvalRecord.NodeId, approvalRecord.ApproverId, approvalRecord.Action, approvalRecord.Sequence);

                // 8. 使用原子操作更新实例（包含乐观锁检查）
                var newApprovalRecords = new List<ApprovalRecord>(instance.ApprovalRecords) { approvalRecord };
                
                // 乐观锁：确保实例状态没有被其他操作修改
                // 注意：这里检查的是获取实例时的CurrentNodeId，而不是requestedNode.Id
                // 因为在智能节点匹配中，我们可能已经将requestedNode调整为当前节点
                var instanceFilter = _instanceFactory.CreateFilterBuilder()
                    .Equal(i => i.Id, instanceId)
                    .Equal(i => i.Status, WorkflowStatus.Running) // 确保状态未变
                    .Equal(i => i.CurrentNodeId, instance.CurrentNodeId) // 确保当前节点未变（使用获取时的节点ID）
                    .Build();

                var instanceUpdate = _instanceFactory.CreateUpdateBuilder()
                    .Set(i => i.ApprovalRecords, newApprovalRecords)
                    .Set(i => i.UpdatedAt, DateTime.UtcNow)
                    .Build();

                var updatedInstance = await _instanceFactory.FindOneAndUpdateAsync(instanceFilter, instanceUpdate, 
                    new MongoDB.Driver.FindOneAndUpdateOptions<WorkflowInstance> { ReturnDocument = MongoDB.Driver.ReturnDocument.After });
                if (updatedInstance == null)
                {
                    // 实例已被其他操作修改，重试
                    if (retry < maxRetries - 1)
                    {
                        _logger.LogWarning("审批操作冲突，重试 {Retry}/{MaxRetries}: InstanceId={InstanceId}, RequestedNodeId={RequestedNodeId}, InstanceCurrentNodeId={InstanceCurrentNodeId}", 
                            retry + 1, maxRetries, instanceId, nodeId, instance.CurrentNodeId);
                        await Task.Delay(100 * (retry + 1)); // 指数退避
                        continue;
                    }
                    throw new InvalidOperationException("流程实例已被其他操作修改，请重试");
                }

                // 9. 创建独立的审批记录（用于查询和审计）
                _logger.LogInformation("保存独立审批记录: Id={Id}, NodeId={NodeId}, ApproverId={ApproverId}, Action={Action}", 
                    approvalRecord.Id, approvalRecord.NodeId, approvalRecord.ApproverId, approvalRecord.Action);
                await _approvalRecordFactory.CreateAsync(approvalRecord);
                
                // 验证保存的审批记录
                var savedRecord = await _approvalRecordFactory.GetByIdAsync(approvalRecord.Id);
                if (savedRecord != null)
                {
                    _logger.LogInformation("验证保存的审批记录: Id={Id}, NodeId={NodeId}, ApproverId={ApproverId}, Action={Action}", 
                        savedRecord.Id, savedRecord.NodeId, savedRecord.ApproverId, savedRecord.Action);
                }
                else
                {
                    _logger.LogError("审批记录保存失败: Id={Id}", approvalRecord.Id);
                }

                // 10. 根据审批动作处理（可能会推进流程）
                var result = await HandleApprovalActionAsync(updatedInstance, processingNode, approvalRecord);
                
                _logger.LogInformation("审批操作成功: InstanceId={InstanceId}, CurrentNodeId={CurrentNodeId}, Action={Action}, ApproverId={ApproverId}, FlowMoved={FlowMoved}",
                    instanceId, instance.CurrentNodeId, action, approverId, result);
                
                return result;
            }
            catch (InvalidOperationException)
            {
                throw; // 业务异常不重试
            }
            catch (UnauthorizedAccessException)
            {
                throw; // 权限异常不重试
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "审批操作失败，重试 {Retry}/{MaxRetries}: InstanceId={InstanceId}, NodeId={NodeId}", 
                    retry + 1, maxRetries, instanceId, nodeId);
                if (retry == maxRetries - 1)
                {
                    throw;
                }
                await Task.Delay(100 * (retry + 1)); // 指数退避
            }
        }

        return false;
    }

    /// <summary>
    /// 处理审批动作
    /// </summary>
    private async Task<bool> HandleApprovalActionAsync(WorkflowInstance instance, WorkflowNode node, ApprovalRecord approvalRecord)
    {
        switch (approvalRecord.Action)
        {
            case ApprovalAction.Approve:
                return await HandleApprovalAsync(instance, node, approvalRecord);

            case ApprovalAction.Reject:
                return await HandleRejectionAsync(instance, approvalRecord);

            case ApprovalAction.Return:
                // 退回逻辑需要指定目标节点
                throw new NotImplementedException("退回功能需要指定目标节点，请使用 ReturnToNodeAsync 方法");

            case ApprovalAction.Delegate:
                return await HandleDelegationAsync(instance, node, approvalRecord);

            default:
                throw new ArgumentException($"不支持的审批动作: {approvalRecord.Action}");
        }
    }

    /// <summary>
    /// 处理审批通过
    /// </summary>
    private async Task<bool> HandleApprovalAsync(WorkflowInstance instance, WorkflowNode node, ApprovalRecord approvalRecord)
    {
        var approvalConfig = node.Config.Approval;
        bool shouldMoveNext = false;

        _logger.LogDebug("处理审批通过: InstanceId={InstanceId}, NodeId={NodeId}, ApproverId={ApproverId}", 
            instance.Id, node.Id, approvalRecord.ApproverId);

        if (approvalConfig != null)
        {
            if (approvalConfig.Type == ApprovalType.All)
            {
                // 会签：需要所有审批人都通过
                var allApprovers = await ResolveApproversAsync(instance, approvalConfig.Approvers);
                // 注意：这里使用的instance已经包含了当前的审批记录（在ProcessApprovalAsync中已更新）
                var approvedCount = instance.ApprovalRecords
                    .Count(r => r.NodeId == node.Id && r.Action == ApprovalAction.Approve);

                _logger.LogDebug("会签节点审批检查: InstanceId={InstanceId}, NodeId={NodeId}, Approved={Approved}/{Total}", 
                    instance.Id, node.Id, approvedCount, allApprovers.Count);

                // 使用去重后的审批人数量进行比较
                var approvedApprovers = instance.ApprovalRecords
                    .Where(r => r.NodeId == node.Id && r.Action == ApprovalAction.Approve)
                    .Select(r => r.ApproverId)
                    .Distinct()
                    .ToList();
                var distinctApprovedCount = approvedApprovers.Count;

                if (distinctApprovedCount >= allApprovers.Count)
                {
                    shouldMoveNext = true;
                    _logger.LogDebug("会签节点所有审批人已通过，准备推进: InstanceId={InstanceId}, NodeId={NodeId}", 
                        instance.Id, node.Id);
                }
                else
                {
                    shouldMoveNext = false;
                    _logger.LogDebug("会签节点等待其他审批人: InstanceId={InstanceId}, NodeId={NodeId}, ApprovedCount={ApprovedCount}/{Total}",
                        instance.Id, node.Id, distinctApprovedCount, allApprovers.Count);
                }
            }
            else
            {
                // 或签：任意一人通过即可推进
                shouldMoveNext = true;
                _logger.LogDebug("或签节点任意一人通过即可推进: InstanceId={InstanceId}, NodeId={NodeId}", 
                    instance.Id, node.Id);
            }
        }
        else
        {
            // 没有配置，默认推进
            shouldMoveNext = true;
            _logger.LogDebug("审批节点无特殊配置，默认推进: InstanceId={InstanceId}, NodeId={NodeId}", 
                instance.Id, node.Id);
        }

        if (shouldMoveNext)
        {
            // 推进到下一个节点
            _logger.LogInformation("审批节点完成，推进到下一个节点: InstanceId={InstanceId}, NodeId={NodeId}", 
                instance.Id, node.Id);
            
            try
            {
                await MoveToNextNodeAsync(instance.Id, node.Id);
                await SendApprovalNotificationAsync(instance, "workflow_approved", approvalRecord.Comment);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "流程推进失败: InstanceId={InstanceId}, NodeId={NodeId}", instance.Id, node.Id);
                throw;
            }
        }
        else
        {
            _logger.LogDebug("审批节点未完成，等待其他审批人: InstanceId={InstanceId}, NodeId={NodeId}", 
                instance.Id, node.Id);
        }

        return true;
    }

    /// <summary>
    /// 处理审批拒绝
    /// </summary>
    private async Task<bool> HandleRejectionAsync(WorkflowInstance instance, ApprovalRecord approvalRecord)
    {
        // 拒绝：流程结束
        await CompleteWorkflowAsync(instance.Id, WorkflowStatus.Rejected);
        
        // 更新公文状态
        var documentUpdate = _documentFactory.CreateUpdateBuilder()
            .Set(d => d.Status, DocumentStatus.Rejected)
            .Build();
        var documentFilter = _documentFactory.CreateFilterBuilder()
            .Equal(d => d.Id, instance.DocumentId)
            .Build();
        await _documentFactory.FindOneAndUpdateAsync(documentFilter, documentUpdate);

        // 发送拒绝通知
        await SendApprovalNotificationAsync(instance, "workflow_rejected", approvalRecord.Comment);

        return true;
    }

    /// <summary>
    /// 处理审批转办
    /// </summary>
    private async Task<bool> HandleDelegationAsync(WorkflowInstance instance, WorkflowNode node, ApprovalRecord approvalRecord)
    {
        if (string.IsNullOrEmpty(approvalRecord.DelegateToUserId))
        {
            throw new ArgumentException("转办操作必须指定目标用户");
        }

        // 转办后，原审批人已完成审批（记录转办操作）
        // 转办目标用户成为新的审批人，流程继续等待新审批人审批
        // 注意：转办不会自动推进流程，需要等待新审批人审批

        // 发送转办通知
        await SendDelegationNotificationAsync(instance, approvalRecord);

        return true;
    }

    /// <summary>
    /// 发送审批通知
    /// </summary>
    private async Task SendApprovalNotificationAsync(WorkflowInstance instance, string notificationType, string? comment)
    {
        try
        {
            var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
            if (document != null)
            {
                var relatedUsers = new List<string> { instance.StartedBy };
                
                // 添加所有审批人
                foreach (var record in instance.ApprovalRecords)
                {
                    if (!relatedUsers.Contains(record.ApproverId))
                        relatedUsers.Add(record.ApproverId);
                }

                await _notificationService.CreateWorkflowNotificationAsync(
                    instance.Id,
                    document.Title,
                    notificationType,
                    relatedUsers,
                    comment,
                    instance.CompanyId
                );
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "发送审批通知失败: InstanceId={InstanceId}, Type={Type}", instance.Id, notificationType);
        }
    }

    /// <summary>
    /// 发送转办通知
    /// </summary>
    private async Task SendDelegationNotificationAsync(WorkflowInstance instance, ApprovalRecord approvalRecord)
    {
        try
        {
            var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
            if (document != null)
            {
                var relatedUsers = new List<string> { approvalRecord.DelegateToUserId!, approvalRecord.ApproverId };
                if (!relatedUsers.Contains(instance.StartedBy))
                    relatedUsers.Add(instance.StartedBy);

                await _notificationService.CreateWorkflowNotificationAsync(
                    instance.Id,
                    document.Title,
                    "workflow_delegated",
                    relatedUsers,
                    approvalRecord.Comment,
                    instance.CompanyId
                );
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "发送转办通知失败: InstanceId={InstanceId}", instance.Id);
        }
    }

    /// <summary>
    /// 处理条件节点
    /// </summary>
    public async Task<bool> ProcessConditionAsync(string instanceId, string nodeId, Dictionary<string, object> variables)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null || instance.Status != WorkflowStatus.Running)
        {
            throw new InvalidOperationException("流程实例不存在或已结束");
        }

        var definition = await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null)
        {
            throw new InvalidOperationException("流程定义不存在");
        }

        var currentNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (currentNode == null || currentNode.Type != "condition")
        {
            throw new InvalidOperationException("节点不存在或不是条件节点");
        }

        // 清洗变量，避免 JsonElement
        variables = SerializationExtensions.SanitizeDictionary(variables);

        // 更新流程变量
        foreach (var kvp in variables)
        {
            instance.Variables[kvp.Key] = kvp.Value;
        }

        var instanceUpdate = _instanceFactory.CreateUpdateBuilder()
            .Set(i => i.Variables, instance.Variables)
            .Build();
        var instanceFilter = _instanceFactory.CreateFilterBuilder()
            .Equal(i => i.Id, instanceId)
            .Build();
        await _instanceFactory.FindOneAndUpdateAsync(instanceFilter, instanceUpdate);

        // 评估条件并推进
        await EvaluateConditionAndMoveAsync(instanceId, nodeId, instance.Variables);

        return true;
    }

    /// <summary>
    /// 完成并行分支
    /// </summary>
    public async Task<bool> CompleteParallelBranchAsync(string instanceId, string nodeId, string branchId)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null || instance.Status != WorkflowStatus.Running)
        {
            throw new InvalidOperationException("流程实例不存在或已结束");
        }

        // 记录分支完成
        if (!instance.ParallelBranches.ContainsKey(nodeId))
        {
            instance.ParallelBranches[nodeId] = new List<string>();
        }

        if (!instance.ParallelBranches[nodeId].Contains(branchId))
        {
            instance.ParallelBranches[nodeId].Add(branchId);
        }

        var instanceUpdate = _instanceFactory.CreateUpdateBuilder()
            .Set(i => i.ParallelBranches, instance.ParallelBranches)
            .Build();
        var instanceFilter = _instanceFactory.CreateFilterBuilder()
            .Equal(i => i.Id, instanceId)
            .Build();
        await _instanceFactory.FindOneAndUpdateAsync(instanceFilter, instanceUpdate);

        // 检查是否所有分支都完成
        var definition = await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null)
        {
            throw new InvalidOperationException("流程定义不存在");
        }

        var parallelNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (parallelNode?.Config.Parallel != null)
        {
            var allBranches = parallelNode.Config.Parallel.Branches;
            var completedBranches = instance.ParallelBranches.GetValueOrDefault(nodeId, new List<string>());

            if (allBranches.All(b => completedBranches.Contains(b)))
            {
                // 所有分支完成，推进到下一个节点
                await MoveToNextNodeAsync(instanceId, nodeId);
            }
        }

        return true;
    }

    /// <summary>
    /// 退回到指定节点
    /// </summary>
    public async Task<bool> ReturnToNodeAsync(string instanceId, string targetNodeId, string comment)
    {
        var userId = _instanceFactory.GetRequiredUserId();

        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null || instance.Status != WorkflowStatus.Running)
        {
            throw new InvalidOperationException("流程实例不存在或已结束");
        }

        var definition = instance.WorkflowDefinitionSnapshot ?? await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null)
        {
            throw new InvalidOperationException("流程定义不存在");
        }

        // 验证当前节点权限
        var currentNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == instance.CurrentNodeId);
        if (currentNode == null)
        {
            throw new InvalidOperationException("当前节点不存在");
        }

        // 验证用户是否有权限在当前节点执行退回操作
        if (!await CanApproveAsync(instance, currentNode, userId))
        {
            throw new UnauthorizedAccessException("无权在当前节点执行退回操作");
        }

        // 验证目标节点存在
        var targetNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == targetNodeId);
        if (targetNode == null)
        {
            throw new InvalidOperationException("目标节点不存在");
        }

        // 验证目标节点是否可以退回到（只能退回到已经经过的节点）
        var hasPassedTargetNode = instance.ApprovalRecords.Any(r => r.NodeId == targetNodeId);
        if (!hasPassedTargetNode && targetNode.Type != "start")
        {
            throw new InvalidOperationException("只能退回到已经经过的节点或开始节点");
        }

        // 创建退回记录
        var user = await _userService.GetUserByIdAsync(userId);
        var userName = user?.Username ?? userId;
        var companyId = await _tenantContext.GetCurrentCompanyIdAsync();
        var approvalRecord = new ApprovalRecord
        {
            Id = GenerateSafeObjectId(), // 使用安全的ObjectId生成方法
            WorkflowInstanceId = instanceId,
            NodeId = instance.CurrentNodeId,
            ApproverId = userId,
            ApproverName = userName,
            Action = ApprovalAction.Return,
            Comment = comment,
            ApprovedAt = DateTime.UtcNow,
            Sequence = instance.ApprovalRecords.Count + 1,
            CompanyId = companyId ?? string.Empty
        };
        await _approvalRecordFactory.CreateAsync(approvalRecord);

        // 更新当前节点
        instance.ApprovalRecords.Add(approvalRecord);
        var instanceUpdate = _instanceFactory.CreateUpdateBuilder()
            .Set(i => i.CurrentNodeId, targetNodeId)
            .Set(i => i.ApprovalRecords, instance.ApprovalRecords)
            .Set(i => i.ParallelBranches, new Dictionary<string, List<string>>()) // 🔧 退回时简单清理所有并行状态，确保状态一致性
            .Build();
        var instanceFilter = _instanceFactory.CreateFilterBuilder()
            .Equal(i => i.Id, instanceId)
            .Build();
        await _instanceFactory.FindOneAndUpdateAsync(instanceFilter, instanceUpdate);

        // 发送退回通知
        try
        {
            var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
            if (document != null)
            {
                var relatedUsers = new List<string> { instance.StartedBy, userId };

                await _notificationService.CreateWorkflowNotificationAsync(
                    instanceId,
                    document.Title,
                    "workflow_returned",
                    relatedUsers,
                    comment,
                    instance.CompanyId
                );
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "发送退回通知失败: InstanceId={InstanceId}", instanceId);
        }

        _logger.LogInformation("流程已退回: InstanceId={InstanceId}, FromNode={FromNode}, ToNode={ToNode}",
            instanceId, instance.CurrentNodeId, targetNodeId);

        return true;
    }

    /// <summary>
    /// 获取审批历史
    /// </summary>
    public async Task<List<ApprovalRecord>> GetApprovalHistoryAsync(string instanceId)
    {
        var filter = _approvalRecordFactory.CreateFilterBuilder()
            .Equal(r => r.WorkflowInstanceId, instanceId)
            .Build();
        var sort = _approvalRecordFactory.CreateSortBuilder()
            .Ascending(r => r.Sequence)
            .Build();

        return await _approvalRecordFactory.FindAsync(filter, sort);
    }

    /// <summary>
    /// 获取流程实例
    /// </summary>
    public async Task<WorkflowInstance?> GetInstanceAsync(string instanceId)
    {
        return await _instanceFactory.GetByIdAsync(instanceId);
    }

    /// <summary>
    /// 取消流程
    /// </summary>
    public async Task<bool> CancelWorkflowAsync(string instanceId, string reason)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null)
        {
            return false;
        }

        await CompleteWorkflowAsync(instanceId, WorkflowStatus.Cancelled);

        // 更新公文状态
        var documentUpdate = _documentFactory.CreateUpdateBuilder()
            .Set(d => d.Status, DocumentStatus.Draft)
            .Build();
        var documentFilter = _documentFactory.CreateFilterBuilder()
            .Equal(d => d.Id, instance.DocumentId)
            .Build();
        await _documentFactory.FindOneAndUpdateAsync(documentFilter, documentUpdate);

        // 发送取消通知
        try
        {
            var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
            if (document != null)
            {
                var relatedUsers = new List<string> { instance.StartedBy };
                // 添加所有审批人
                foreach (var record in instance.ApprovalRecords)
                {
                    if (!relatedUsers.Contains(record.ApproverId))
                        relatedUsers.Add(record.ApproverId);
                }

                await _notificationService.CreateWorkflowNotificationAsync(
                    instanceId,
                    document.Title,
                    "workflow_cancelled",
                    relatedUsers,
                    reason,
                    instance.CompanyId
                );
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "发送取消通知失败: InstanceId={InstanceId}", instanceId);
        }

        return true;
    }

    /// <summary>
    /// 推进到下一个节点
    /// </summary>
    private async Task MoveToNextNodeAsync(string instanceId, string currentNodeId)
    {
        _logger.LogInformation("开始推进流程: InstanceId={InstanceId}, CurrentNodeId={CurrentNodeId}", 
            instanceId, currentNodeId);

        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null)
        {
            _logger.LogError("流程实例不存在，无法推进: InstanceId={InstanceId}", instanceId);
            throw new InvalidOperationException($"流程实例不存在，无法推进: InstanceId={instanceId}");
        }

        // 优先使用快照中的流程定义，如果没有快照则使用最新定义（向后兼容）
        var definition = instance.WorkflowDefinitionSnapshot;
        if (definition == null)
        {
            definition = await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
            if (definition == null)
            {
                _logger.LogError("流程定义不存在，无法推进: InstanceId={InstanceId}, DefinitionId={DefinitionId}", 
                    instanceId, instance.WorkflowDefinitionId);
                return;
            }
            _logger.LogWarning("使用数据库中的流程定义（快照不存在）: InstanceId={InstanceId}, DefinitionId={DefinitionId}", 
                instanceId, instance.WorkflowDefinitionId);
        }
        else
        {
            _logger.LogDebug("使用流程定义快照: InstanceId={InstanceId}, DefinitionId={DefinitionId}", 
                instanceId, instance.WorkflowDefinitionId);
        }

        // 查找出边
        var outgoingEdges = definition.Graph.Edges.Where(e => e.Source == currentNodeId).ToList();
        _logger.LogInformation("查找出边: InstanceId={InstanceId}, CurrentNodeId={CurrentNodeId}, EdgeCount={EdgeCount}", 
            instanceId, currentNodeId, outgoingEdges.Count);

        if (outgoingEdges.Count == 0)
        {
            // 没有出边，流程结束
            _logger.LogWarning("工作流定义可能有问题：节点没有出边，流程意外结束: InstanceId={InstanceId}, CurrentNodeId={CurrentNodeId}. 请检查工作流定义中是否正确配置了节点之间的连接。", 
                instanceId, currentNodeId);
            
            // 输出工作流定义的所有边，用于调试
            if (definition.Graph.Edges.Any())
            {
                _logger.LogInformation("工作流定义中的所有边: InstanceId={InstanceId}, Edges={Edges}", 
                    instanceId, string.Join("; ", definition.Graph.Edges.Select(e => $"{e.Source}->{e.Target}")));
            }
            else
            {
                _logger.LogError("工作流定义中没有任何边: InstanceId={InstanceId}, DefinitionId={DefinitionId}", 
                    instanceId, instance.WorkflowDefinitionId);
            }
            
            // 🔧 关键修复：没有出边时，完成流程并记录日志，但不抛出异常（这是正常的流程结束）
            _logger.LogInformation("流程已到达终点，完成流程: InstanceId={InstanceId}, CurrentNodeId={CurrentNodeId}", 
                instanceId, currentNodeId);
            await CompleteWorkflowAsync(instanceId, WorkflowStatus.Completed);

            // 发送完成通知（流程意外结束的情况）
            try
            {
                var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
                if (document != null)
                {
                    var relatedUsers = new List<string> { instance.StartedBy };
                    // 添加所有审批人
                    if (instance.ApprovalRecords != null)
                    {
                        foreach (var record in instance.ApprovalRecords)
                        {
                            if (!relatedUsers.Contains(record.ApproverId))
                                relatedUsers.Add(record.ApproverId);
                        }
                    }

                    await _notificationService.CreateWorkflowNotificationAsync(
                        instanceId,
                        document.Title,
                        "workflow_completed",
                        relatedUsers,
                        "审批流程已完成",
                        instance.CompanyId
                    );

                    // 更新公文状态
                    var documentUpdate = _documentFactory.CreateUpdateBuilder()
                        .Set(d => d.Status, DocumentStatus.Approved)
                        .Build();
                    var documentFilter = _documentFactory.CreateFilterBuilder()
                        .Equal(d => d.Id, instance.DocumentId)
                        .Build();
                    await _documentFactory.FindOneAndUpdateAsync(documentFilter, documentUpdate);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "发送完成通知失败: InstanceId={InstanceId}", instanceId);
            }

            return;
        }

        if (outgoingEdges.Count == 1)
        {
            // 单条出边，直接推进
            var nextNodeId = outgoingEdges[0].Target;
            _logger.LogInformation("单条出边，直接推进: InstanceId={InstanceId}, FromNode={FromNode}, ToNode={ToNode}", 
                instanceId, currentNodeId, nextNodeId);
            
            try
            {
                await SetCurrentNodeAsync(instanceId, nextNodeId);
                
                // 🔧 验证节点是否成功更新
                var verifyInstance = await _instanceFactory.GetByIdAsync(instanceId);
                if (verifyInstance != null && verifyInstance.CurrentNodeId != nextNodeId)
                {
                    _logger.LogError("流程推进失败：节点ID未更新: InstanceId={InstanceId}, ExpectedNodeId={ExpectedNodeId}, ActualNodeId={ActualNodeId}", 
                        instanceId, nextNodeId, verifyInstance.CurrentNodeId);
                    throw new InvalidOperationException($"流程推进失败：节点ID未更新，期望节点 {nextNodeId}，实际节点 {verifyInstance.CurrentNodeId}");
                }
                
                _logger.LogInformation("流程推进成功: InstanceId={InstanceId}, FromNode={FromNode}, ToNode={ToNode}", 
                    instanceId, currentNodeId, nextNodeId);
                
                await ProcessNodeAsync(instanceId, nextNodeId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "流程推进失败: InstanceId={InstanceId}, FromNode={FromNode}, ToNode={ToNode}", 
                    instanceId, currentNodeId, nextNodeId);
                throw; // 重新抛出异常，让调用方知道推进失败
            }
        }
        else
        {
            // 多条出边，可能是条件分支或并行网关
            var currentNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == currentNodeId);
            _logger.LogInformation("多条出边，检查节点类型: InstanceId={InstanceId}, CurrentNodeId={CurrentNodeId}, NodeType={NodeType}", 
                instanceId, currentNodeId, currentNode?.Type);
                
            if (currentNode?.Type == "condition")
            {
                // 条件分支：评估条件选择路径
                _logger.LogInformation("条件分支节点，评估条件: InstanceId={InstanceId}, NodeId={NodeId}", 
                    instanceId, currentNodeId);
                await EvaluateConditionAndMoveAsync(instanceId, currentNodeId, instance.Variables);
            }
            else if (currentNode?.Type == "parallel")
            {
                // 并行网关：同时推进到所有分支
                _logger.LogInformation("并行网关节点，推进到所有分支: InstanceId={InstanceId}, NodeId={NodeId}, BranchCount={BranchCount}", 
                    instanceId, currentNodeId, outgoingEdges.Count);
                foreach (var edge in outgoingEdges)
                {
                    _logger.LogInformation("推进到并行分支: InstanceId={InstanceId}, FromNode={FromNode}, ToNode={ToNode}", 
                        instanceId, currentNodeId, edge.Target);
                    await ProcessNodeAsync(instanceId, edge.Target);
                }
            }
            else
            {
                // 其他情况，选择第一条边推进
                var nextNodeId = outgoingEdges[0].Target;
                _logger.LogInformation("其他情况，选择第一条边推进: InstanceId={InstanceId}, FromNode={FromNode}, ToNode={ToNode}", 
                    instanceId, currentNodeId, nextNodeId);
                await SetCurrentNodeAsync(instanceId, nextNodeId);
                await ProcessNodeAsync(instanceId, nextNodeId);
            }
        }
    }

    /// <summary>
    /// 设置当前节点及其关联状态（审批人、超时时间）
    /// </summary>
    private async Task SetCurrentNodeAsync(string instanceId, string nodeId)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null) return;
        
        var definition = instance.WorkflowDefinitionSnapshot ?? await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null) return;

        var node = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (node == null) return;

        var oldNodeId = instance.CurrentNodeId ?? "未知";
        _logger.LogInformation("设置当前节点: InstanceId={InstanceId}, OldNodeId={OldNodeId}, NewNodeId={NewNodeId}", 
            instanceId, oldNodeId, nodeId);
            
        var updateBuilder = _instanceFactory.CreateUpdateBuilder()
            .Set(i => i.CurrentNodeId, nodeId);

        // 解析审批人
        if (node.Type == "approval" && node.Config.Approval != null)
        {
            var approvers = await ResolveApproversAsync(instance, node.Config.Approval.Approvers);
            updateBuilder.Set(i => i.CurrentApproverIds, approvers);
            
            // 设置超时时间
            if (node.Config.Approval.TimeoutHours > 0)
            {
                updateBuilder.Set(i => i.TimeoutAt, DateTime.UtcNow.AddHours(node.Config.Approval.TimeoutHours.Value));
            }
            else
            {
                updateBuilder.Set(i => i.TimeoutAt, null);
            }
        }
        else
        {
            updateBuilder.Set(i => i.CurrentApproverIds, new List<string>());
            updateBuilder.Set(i => i.TimeoutAt, null);
        }

        var update = updateBuilder.Build();
        var filter = _instanceFactory.CreateFilterBuilder()
            .Equal(i => i.Id, instanceId)
            .Build();
            
        await _instanceFactory.FindOneAndUpdateAsync(filter, update);
    }

    /// <summary>
    /// 处理节点
    /// </summary>
    private async Task ProcessNodeAsync(string instanceId, string nodeId)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null)
        {
            _logger.LogError("流程实例不存在，无法处理节点: InstanceId={InstanceId}, NodeId={NodeId}", instanceId, nodeId);
            return;
        }

        // 优先使用快照中的流程定义，如果没有快照则使用最新定义（向后兼容）
        var definition = instance.WorkflowDefinitionSnapshot;
        if (definition == null)
        {
            definition = await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
            if (definition == null)
            {
                _logger.LogError("流程定义不存在，无法处理节点: InstanceId={InstanceId}, NodeId={NodeId}, DefinitionId={DefinitionId}", 
                    instanceId, nodeId, instance.WorkflowDefinitionId);
                return;
            }
            _logger.LogWarning("使用数据库中的流程定义（快照不存在）: InstanceId={InstanceId}, NodeId={NodeId}, DefinitionId={DefinitionId}", 
                instanceId, nodeId, instance.WorkflowDefinitionId);
        }
        else
        {
            _logger.LogDebug("使用流程定义快照处理节点: InstanceId={InstanceId}, NodeId={NodeId}, DefinitionId={DefinitionId}", 
                instanceId, nodeId, instance.WorkflowDefinitionId);
        }

        var node = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (node == null)
        {
            _logger.LogError("节点不存在，无法处理: InstanceId={InstanceId}, NodeId={NodeId}", instanceId, nodeId);
            return;
        }

        _logger.LogInformation("处理节点: InstanceId={InstanceId}, NodeId={NodeId}, NodeType={NodeType}, NodeLabel={NodeLabel}", 
            instanceId, nodeId, node.Type, node.Label);

        switch (node.Type)
        {
            case "end":
                // 结束节点：完成流程
                _logger.LogInformation("到达结束节点，完成流程: InstanceId={InstanceId}, NodeId={NodeId}", instanceId, nodeId);
                await CompleteWorkflowAsync(instanceId, WorkflowStatus.Completed);
                var documentUpdate = _documentFactory.CreateUpdateBuilder()
                    .Set(d => d.Status, DocumentStatus.Approved)
                    .Build();
                var documentFilter = _documentFactory.CreateFilterBuilder()
                    .Equal(d => d.Id, instance.DocumentId)
                    .Build();
                await _documentFactory.FindOneAndUpdateAsync(documentFilter, documentUpdate);

                // 发送完成通知
                try
                {
                    var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
                    if (document != null)
                    {
                        var relatedUsers = new List<string> { instance.StartedBy };
                        // 添加所有审批人
                        foreach (var record in instance.ApprovalRecords)
                        {
                            if (!relatedUsers.Contains(record.ApproverId))
                                relatedUsers.Add(record.ApproverId);
                        }

                        await _notificationService.CreateWorkflowNotificationAsync(
                            instanceId,
                            document.Title,
                            "workflow_completed",
                            relatedUsers,
                            "审批流程已完成",
                            instance.CompanyId
                        );
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "发送完成通知失败: InstanceId={InstanceId}", instanceId);
                }
                break;

            case "approval":
                // 审批节点：等待审批，不自动推进
                _logger.LogInformation("到达审批节点，等待审批: InstanceId={InstanceId}, NodeId={NodeId}", instanceId, nodeId);
                await SetCurrentNodeAsync(instanceId, nodeId);

                // 发送通知给审批人
                try
                {
                    var approvalConfig = node.Config.Approval;
                    if (approvalConfig != null)
                    {
                        var approvers = await ResolveApproversAsync(instance, approvalConfig.Approvers);
                        if (approvers.Any())
                        {
                            var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
                            if (document != null)
                            {
                                await _notificationService.CreateWorkflowNotificationAsync(
                                    instanceId,
                                    document.Title,
                                    "workflow_approval_required",
                                    approvers,
                                    $"节点：{node.Label ?? nodeId}",
                                    instance.CompanyId
                                );
                                
                                _logger.LogInformation("已发送审批通知: InstanceId={InstanceId}, NodeId={NodeId}, ApproverCount={ApproverCount}", 
                                    instanceId, nodeId, approvers.Count);
                            }
                        }
                        else
                        {
                            _logger.LogWarning("审批节点没有找到有效的审批人: InstanceId={InstanceId}, NodeId={NodeId}", instanceId, nodeId);
                        }
                    }
                    else
                    {
                        _logger.LogWarning("审批节点缺少审批配置: InstanceId={InstanceId}, NodeId={NodeId}", instanceId, nodeId);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "发送审批通知失败: InstanceId={InstanceId}, NodeId={NodeId}", instanceId, nodeId);
                }
                break;

            case "condition":
                // 条件节点：需要评估条件
                _logger.LogInformation("到达条件节点，评估条件: InstanceId={InstanceId}, NodeId={NodeId}", instanceId, nodeId);
                await SetCurrentNodeAsync(instanceId, nodeId);
                await EvaluateConditionAndMoveAsync(instanceId, nodeId, instance.Variables);
                break;

            case "parallel":
                // 并行网关：推进到所有分支
                _logger.LogInformation("到达并行网关，推进到所有分支: InstanceId={InstanceId}, NodeId={NodeId}", instanceId, nodeId);
                await SetCurrentNodeAsync(instanceId, nodeId);
                var outgoingEdges = definition.Graph.Edges.Where(e => e.Source == nodeId).ToList();
                foreach (var edge in outgoingEdges)
                {
                    _logger.LogInformation("推进到并行分支: InstanceId={InstanceId}, FromNode={FromNode}, ToNode={ToNode}", 
                        instanceId, nodeId, edge.Target);
                    await ProcessNodeAsync(instanceId, edge.Target);
                }
                break;

            default:
                // 其他节点：直接推进
                _logger.LogInformation("处理其他类型节点，直接推进: InstanceId={InstanceId}, NodeId={NodeId}, NodeType={NodeType}", 
                    instanceId, nodeId, node.Type);
                await MoveToNextNodeAsync(instanceId, nodeId);
                break;
        }
    }

    /// <summary>
    /// 评估条件并推进
    /// </summary>
    private async Task EvaluateConditionAndMoveAsync(string instanceId, string nodeId, Dictionary<string, object> variables)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null)
        {
            _logger.LogError("流程实例不存在，无法评估条件: InstanceId={InstanceId}, NodeId={NodeId}", instanceId, nodeId);
            return;
        }

        // 优先使用快照中的流程定义，如果没有快照则使用最新定义（向后兼容）
        var definition = instance.WorkflowDefinitionSnapshot;
        if (definition == null)
        {
            definition = await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
            if (definition == null)
            {
                _logger.LogError("流程定义不存在，无法评估条件: InstanceId={InstanceId}, NodeId={NodeId}, DefinitionId={DefinitionId}", 
                    instanceId, nodeId, instance.WorkflowDefinitionId);
                return;
            }
            _logger.LogWarning("使用数据库中的流程定义（快照不存在）: InstanceId={InstanceId}, NodeId={NodeId}, DefinitionId={DefinitionId}", 
                instanceId, nodeId, instance.WorkflowDefinitionId);
        }
        else
        {
            _logger.LogDebug("使用流程定义快照评估条件: InstanceId={InstanceId}, NodeId={NodeId}, DefinitionId={DefinitionId}", 
                instanceId, nodeId, instance.WorkflowDefinitionId);
        }

        var node = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (node?.Config.Condition == null)
        {
            _logger.LogWarning("条件节点缺少条件配置: InstanceId={InstanceId}, NodeId={NodeId}", instanceId, nodeId);
            return;
        }

        var expression = node.Config.Condition.Expression;
        var outgoingEdges = definition.Graph.Edges.Where(e => e.Source == nodeId).ToList();

        _logger.LogInformation("评估条件节点: InstanceId={InstanceId}, NodeId={NodeId}, Expression={Expression}, EdgeCount={EdgeCount}", 
            instanceId, nodeId, expression, outgoingEdges.Count);

        // 简单的表达式评估（支持基本的比较操作）
        foreach (var edge in outgoingEdges)
        {
            if (string.IsNullOrEmpty(edge.Condition))
            {
                _logger.LogDebug("跳过无条件的边: InstanceId={InstanceId}, EdgeId={EdgeId}, Target={Target}", 
                    instanceId, edge.Id, edge.Target);
                continue;
            }

            _logger.LogDebug("评估边条件: InstanceId={InstanceId}, EdgeId={EdgeId}, Condition={Condition}, Target={Target}", 
                instanceId, edge.Id, edge.Condition, edge.Target);

            if (_expressionEvaluator.Evaluate(edge.Condition, variables))
            {
                // 条件满足，推进到此路径
                _logger.LogInformation("条件满足，推进到目标节点: InstanceId={InstanceId}, EdgeId={EdgeId}, Condition={Condition}, Target={Target}", 
                    instanceId, edge.Id, edge.Condition, edge.Target);
                await SetCurrentNodeAsync(instanceId, edge.Target);
                await ProcessNodeAsync(instanceId, edge.Target);
                return;
            }
        }

        // 如果没有条件满足，选择第一条默认路径（没有条件的边）
        var defaultEdge = outgoingEdges.FirstOrDefault(e => string.IsNullOrEmpty(e.Condition));
        if (defaultEdge != null)
        {
            _logger.LogInformation("没有条件满足，使用默认路径: InstanceId={InstanceId}, EdgeId={EdgeId}, Target={Target}", 
                instanceId, defaultEdge.Id, defaultEdge.Target);
            await SetCurrentNodeAsync(instanceId, defaultEdge.Target);
            await ProcessNodeAsync(instanceId, defaultEdge.Target);
        }
        else
        {
            _logger.LogWarning("没有条件满足且没有默认路径，流程无法继续: InstanceId={InstanceId}, NodeId={NodeId}", instanceId, nodeId);
        }
    }

    /// <summary>
    /// 评估表达式（增强版实现）
    /// </summary>
    private bool EvaluateExpression(string expression, Dictionary<string, object> variables)
    {
        try
        {
            // 简单的表达式解析，支持：变量名 操作符 值
            // 例如：amount > 10000, status == "approved", level >= 3
            expression = expression.Trim();

            // 支持 >= 操作符
            if (expression.Contains(">="))
            {
                var parts = expression.Split(new[] { ">=" }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length == 2)
                {
                    var left = parts[0].Trim();
                    var right = parts[1].Trim();

                    if (variables.TryGetValue(left, out var leftValue))
                    {
                        if (double.TryParse(right, out var rightNum))
                        {
                            return Convert.ToDouble(leftValue) >= rightNum;
                        }
                    }
                }
            }
            // 支持 <= 操作符
            else if (expression.Contains("<="))
            {
                var parts = expression.Split(new[] { "<=" }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length == 2)
                {
                    var left = parts[0].Trim();
                    var right = parts[1].Trim();

                    if (variables.TryGetValue(left, out var leftValue))
                    {
                        if (double.TryParse(right, out var rightNum))
                        {
                            return Convert.ToDouble(leftValue) <= rightNum;
                        }
                    }
                }
            }
            // 支持 != 操作符
            else if (expression.Contains("!="))
            {
                var parts = expression.Split(new[] { "!=" }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length == 2)
                {
                    var left = parts[0].Trim();
                    var right = parts[1].Trim().Trim('"', '\'');

                    if (variables.TryGetValue(left, out var leftValue))
                    {
                        return leftValue?.ToString() != right;
                    }
                }
            }
            // 支持 > 操作符
            else if (expression.Contains(">"))
            {
                var parts = expression.Split('>', StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length == 2)
                {
                    var left = parts[0].Trim();
                    var right = parts[1].Trim();

                    if (variables.TryGetValue(left, out var leftValue))
                    {
                        if (double.TryParse(right, out var rightNum))
                        {
                            return Convert.ToDouble(leftValue) > rightNum;
                        }
                    }
                }
            }
            // 支持 < 操作符
            else if (expression.Contains("<"))
            {
                var parts = expression.Split('<', StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length == 2)
                {
                    var left = parts[0].Trim();
                    var right = parts[1].Trim();

                    if (variables.TryGetValue(left, out var leftValue))
                    {
                        if (double.TryParse(right, out var rightNum))
                        {
                            return Convert.ToDouble(leftValue) < rightNum;
                        }
                    }
                }
            }
            // 支持 == 操作符
            else if (expression.Contains("=="))
            {
                var parts = expression.Split(new[] { "==" }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length == 2)
                {
                    var left = parts[0].Trim();
                    var right = parts[1].Trim().Trim('"', '\'');

                    if (variables.TryGetValue(left, out var leftValue))
                    {
                        return leftValue?.ToString() == right;
                    }
                }
            }
            // 支持布尔值直接判断
            else if (variables.TryGetValue(expression, out var boolValue))
            {
                if (boolValue is bool b)
                {
                    return b;
                }
                if (bool.TryParse(boolValue?.ToString(), out var parsedBool))
                {
                    return parsedBool;
                }
            }

            _logger.LogWarning("无法解析表达式: {Expression}", expression);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "表达式评估失败: {Expression}", expression);
        }

        return false;
    }

    /// <summary>
    /// 完成工作流
    /// </summary>
    private async Task CompleteWorkflowAsync(string instanceId, WorkflowStatus status)
    {
        var update = _instanceFactory.CreateUpdateBuilder()
            .Set(i => i.Status, status)
            .Set(i => i.CompletedAt, DateTime.UtcNow)
            .Build();
        var filter = _instanceFactory.CreateFilterBuilder()
            .Equal(i => i.Id, instanceId)
            .Build();
        await _instanceFactory.FindOneAndUpdateAsync(filter, update);
    }

    /// <summary>
    /// 检查是否可以审批
    /// </summary>
    private async Task<bool> CanApproveAsync(WorkflowInstance instance, WorkflowNode node, string userId)
    {
        if (node.Config.Approval == null)
        {
            return false;
        }

        try
        {
            var approvers = await ResolveApproversAsync(instance, node.Config.Approval.Approvers);
            var canApprove = approvers.Contains(userId);
            
            if (!canApprove)
            {
                _logger.LogWarning("用户无权限审批节点: UserId={UserId}, NodeId={NodeId}, InstanceId={InstanceId}", 
                    userId, node.Id, instance.Id);
            }
            
            return canApprove;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "检查审批权限失败: UserId={UserId}, NodeId={NodeId}, InstanceId={InstanceId}", 
                userId, node.Id, instance.Id);
            return false;
        }
    }

    /// <summary>
    /// 解析审批人列表
    /// </summary>
    private async Task<List<string>> ResolveApproversAsync(WorkflowInstance instance, List<ApproverRule> rules)
    {
        var approvers = new List<string>();
        var companyId = await _instanceFactory.GetRequiredCompanyIdAsync();

        foreach (var rule in rules)
        {
            try
            {
                var resolved = await _approverResolverFactory.ResolveAsync(rule, companyId);
                approvers.AddRange(resolved);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "解析审批人规则失败: Type={Type}", rule.Type);
            }
        }

        var distinctApprovers = approvers.Distinct().ToList();
        return distinctApprovers;
    }

    /// <summary>
    /// 安全生成ObjectId字符串
    /// </summary>
    private static string GenerateSafeObjectId()
    {
        try
        {
            return ObjectId.GenerateNewId().ToString();
        }
        catch (Exception)
        {
            // 如果ObjectId生成失败，使用GUID作为备选方案
            return Guid.NewGuid().ToString("N");
        }
    }
}
