using MongoDB.Driver;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
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
    private readonly IUserService _userService;
    private readonly IUnifiedNotificationService _notificationService;
    private readonly ILogger<WorkflowEngine> _logger;

    /// <summary>
    /// 初始化工作流引擎
    /// </summary>
    /// <param name="definitionFactory">流程定义工厂</param>
    /// <param name="instanceFactory">流程实例工厂</param>
    /// <param name="approvalRecordFactory">审批记录工厂</param>
    /// <param name="documentFactory">公文工厂</param>
    /// <param name="userCompanyFactory">用户企业关系工厂</param>
    /// <param name="userService">用户服务</param>
    /// <param name="notificationService">通知服务</param>
    /// <param name="logger">日志记录器</param>
    public WorkflowEngine(
        IDatabaseOperationFactory<WorkflowDefinition> definitionFactory,
        IDatabaseOperationFactory<WorkflowInstance> instanceFactory,
        IDatabaseOperationFactory<ApprovalRecord> approvalRecordFactory,
        IDatabaseOperationFactory<Document> documentFactory,
        IDatabaseOperationFactory<UserCompany> userCompanyFactory,
        IUserService userService,
        IUnifiedNotificationService notificationService,
        ILogger<WorkflowEngine> logger)
    {
        _definitionFactory = definitionFactory;
        _instanceFactory = instanceFactory;
        _approvalRecordFactory = approvalRecordFactory;
        _documentFactory = documentFactory;
        _userCompanyFactory = userCompanyFactory;
        _userService = userService;
        _notificationService = notificationService;
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

        // 2. 验证公文存在
        var document = await _documentFactory.GetByIdAsync(documentId);
        if (document == null)
        {
            throw new InvalidOperationException("公文不存在");
        }

        // 3. 查找起始节点
        var startNode = definition.Graph.Nodes.FirstOrDefault(n => n.Type == "start");
        if (startNode == null)
        {
            throw new InvalidOperationException("流程定义中未找到起始节点");
        }

        // 4. 创建流程实例
        var instance = new WorkflowInstance
        {
            WorkflowDefinitionId = definitionId,
            DocumentId = documentId,
            Status = WorkflowStatus.Running,
            CurrentNodeId = startNode.Id,
            Variables = variables ?? new Dictionary<string, object>(),
            StartedBy = userId,
            StartedAt = DateTime.UtcNow,
            CompanyId = companyId
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
    /// 处理审批操作
    /// </summary>
    public async Task<bool> ProcessApprovalAsync(string instanceId, string nodeId, ApprovalAction action, string? comment = null, string? delegateToUserId = null)
    {
        var userId = _instanceFactory.GetRequiredUserId();

        // 1. 获取流程实例
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null || instance.Status != WorkflowStatus.Running)
        {
            throw new InvalidOperationException("流程实例不存在或已结束");
        }

        // 2. 获取流程定义
        var definition = await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null)
        {
            throw new InvalidOperationException("流程定义不存在");
        }

        // 3. 获取当前节点
        var currentNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (currentNode == null || currentNode.Type != "approval")
        {
            throw new InvalidOperationException("节点不存在或不是审批节点");
        }

        if (currentNode.Id != instance.CurrentNodeId)
        {
            throw new InvalidOperationException("当前节点不匹配");
        }

        // 4. 验证审批权限
        var approverId = delegateToUserId ?? userId;
        if (!await CanApproveAsync(instance, currentNode, approverId))
        {
            throw new UnauthorizedAccessException("无权审批此节点");
        }

        // 5. 创建审批记录
        var user = await _userService.GetUserByIdAsync(approverId);
        var userName = user?.Username ?? approverId;
        var approvalRecord = new ApprovalRecord
        {
            WorkflowInstanceId = instanceId,
            NodeId = nodeId,
            ApproverId = approverId,
            ApproverName = userName,
            Action = action,
            Comment = comment,
            DelegateToUserId = delegateToUserId,
            ApprovedAt = DateTime.UtcNow,
            Sequence = instance.ApprovalRecords.Count + 1
        };
        await _approvalRecordFactory.CreateAsync(approvalRecord);

        // 6. 更新实例审批记录
        instance.ApprovalRecords.Add(approvalRecord);
        var instanceUpdate = _instanceFactory.CreateUpdateBuilder()
            .Set(i => i.ApprovalRecords, instance.ApprovalRecords)
            .Build();
        var instanceFilter = _instanceFactory.CreateFilterBuilder()
            .Equal(i => i.Id, instanceId)
            .Build();
        await _instanceFactory.FindOneAndUpdateAsync(instanceFilter, instanceUpdate);

        // 7. 处理审批结果
        if (action == ApprovalAction.Reject)
        {
            // 拒绝：流程结束
            await CompleteWorkflowAsync(instanceId, WorkflowStatus.Rejected);
            var documentUpdate = _documentFactory.CreateUpdateBuilder()
                .Set(d => d.Status, DocumentStatus.Rejected)
                .Build();
            var documentFilter = _documentFactory.CreateFilterBuilder()
                .Equal(d => d.Id, instance.DocumentId)
                .Build();
            await _documentFactory.FindOneAndUpdateAsync(documentFilter, documentUpdate);
            
            // 发送拒绝通知
            try
            {
                var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
                if (document != null)
                {
                    var relatedUsers = new List<string> { instance.StartedBy };
                    if (!relatedUsers.Contains(approverId))
                        relatedUsers.Add(approverId);
                    
                    await _notificationService.CreateWorkflowNotificationAsync(
                        instanceId,
                        document.Title,
                        "workflow_rejected",
                        relatedUsers,
                        comment,
                        instance.CompanyId
                    );
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "发送拒绝通知失败: InstanceId={InstanceId}", instanceId);
            }
            
            return true;
        }
        else if (action == ApprovalAction.Return)
        {
            // 退回：需要指定目标节点，这里先记录，实际退回逻辑在 ReturnToNodeAsync
            throw new InvalidOperationException("请使用 ReturnToNodeAsync 方法处理退回操作");
        }
        else if (action == ApprovalAction.Delegate)
        {
            // 转办：创建新的审批记录给转办目标用户
            if (string.IsNullOrEmpty(delegateToUserId))
            {
                throw new ArgumentException("转办操作必须指定目标用户");
            }
            
            // 转办后，原审批人已完成审批（记录转办操作）
            // 转办目标用户成为新的审批人，流程继续等待新审批人审批
            // 注意：转办不会自动推进流程，需要等待新审批人审批
            
            // 发送转办通知
            try
            {
                var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
                if (document != null)
                {
                    var relatedUsers = new List<string> { delegateToUserId, approverId };
                    if (!relatedUsers.Contains(instance.StartedBy))
                        relatedUsers.Add(instance.StartedBy);
                    
                    await _notificationService.CreateWorkflowNotificationAsync(
                        instanceId,
                        document.Title,
                        "workflow_delegated",
                        relatedUsers,
                        comment,
                        instance.CompanyId
                    );
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "发送转办通知失败: InstanceId={InstanceId}", instanceId);
            }
            
            return true;
        }
        else if (action == ApprovalAction.Approve)
        {
            // 通过：检查是否需要等待其他审批人
            var approvalConfig = currentNode.Config.Approval;
            bool shouldMoveNext = false;
            
            if (approvalConfig != null)
            {
                if (approvalConfig.Type == ApprovalType.All)
                {
                    // 会签：需要所有审批人都通过
                    var allApprovers = await ResolveApproversAsync(instance, approvalConfig.Approvers);
                    // 重新获取实例以获取最新的审批记录（包含刚刚添加的记录）
                    var updatedInstance = await _instanceFactory.GetByIdAsync(instanceId);
                    if (updatedInstance != null)
                    {
                        var approvedCount = updatedInstance.ApprovalRecords
                            .Count(r => r.NodeId == nodeId && r.Action == ApprovalAction.Approve);
                        
                        if (approvedCount < allApprovers.Count)
                        {
                            // 还有审批人未审批，等待（只发送通知，不推进）
                            shouldMoveNext = false;
                        }
                        else
                        {
                            // 所有审批人都已通过，可以推进
                            shouldMoveNext = true;
                        }
                    }
                    else
                    {
                        shouldMoveNext = false;
                    }
                }
                else
                {
                    // 或签：任意一人通过即可，继续推进
                    shouldMoveNext = true;
                }
            }
            else
            {
                // 没有配置，默认推进
                shouldMoveNext = true;
            }

            if (shouldMoveNext)
            {
                // 所有审批完成，推进到下一个节点
                await MoveToNextNodeAsync(instanceId, nodeId);
                
                // 发送审批通过通知（节点完成时）
                try
                {
                    var document = await _documentFactory.GetByIdAsync(instance.DocumentId);
                    if (document != null)
                    {
                        var relatedUsers = new List<string> { instance.StartedBy };
                        if (!relatedUsers.Contains(approverId))
                            relatedUsers.Add(approverId);
                        
                        await _notificationService.CreateWorkflowNotificationAsync(
                            instanceId,
                            document.Title,
                            "workflow_approved",
                            relatedUsers,
                            comment,
                            instance.CompanyId
                        );
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "发送审批通过通知失败: InstanceId={InstanceId}", instanceId);
                }
            }
            else
            {
                // 会签中，还有其他人未审批，只发送通知给当前审批人（可选）
                // 这里不发送通知，因为审批节点开始时已经发送了通知
            }
        }

        return true;
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

        var definition = await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null)
        {
            throw new InvalidOperationException("流程定义不存在");
        }

        // 验证目标节点存在
        var targetNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == targetNodeId);
        if (targetNode == null)
        {
            throw new InvalidOperationException("目标节点不存在");
        }

        // 创建退回记录
        var currentNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == instance.CurrentNodeId);
        var user = await _userService.GetUserByIdAsync(userId);
        var userName = user?.Username ?? userId;
        var approvalRecord = new ApprovalRecord
        {
            WorkflowInstanceId = instanceId,
            NodeId = instance.CurrentNodeId,
            ApproverId = userId,
            ApproverName = userName,
            Action = ApprovalAction.Return,
            Comment = comment,
            ApprovedAt = DateTime.UtcNow,
            Sequence = instance.ApprovalRecords.Count + 1
        };
        await _approvalRecordFactory.CreateAsync(approvalRecord);

        // 更新当前节点
        instance.ApprovalRecords.Add(approvalRecord);
        var instanceUpdate = _instanceFactory.CreateUpdateBuilder()
            .Set(i => i.CurrentNodeId, targetNodeId)
            .Set(i => i.ApprovalRecords, instance.ApprovalRecords)
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
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null)
        {
            return;
        }

        var definition = await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null)
        {
            return;
        }

        // 查找出边
        var outgoingEdges = definition.Graph.Edges.Where(e => e.Source == currentNodeId).ToList();
        
        if (outgoingEdges.Count == 0)
        {
            // 没有出边，流程结束
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
            await SetCurrentNodeAsync(instanceId, nextNodeId);
            await ProcessNodeAsync(instanceId, nextNodeId);
        }
        else
        {
            // 多条出边，可能是条件分支或并行网关
            var currentNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == currentNodeId);
            if (currentNode?.Type == "condition")
            {
                // 条件分支：评估条件选择路径
                await EvaluateConditionAndMoveAsync(instanceId, currentNodeId, instance.Variables);
            }
            else if (currentNode?.Type == "parallel")
            {
                // 并行网关：同时推进到所有分支
                foreach (var edge in outgoingEdges)
                {
                    await ProcessNodeAsync(instanceId, edge.Target);
                }
            }
        }
    }

    /// <summary>
    /// 设置当前节点
    /// </summary>
    private async Task SetCurrentNodeAsync(string instanceId, string nodeId)
    {
        var update = _instanceFactory.CreateUpdateBuilder()
            .Set(i => i.CurrentNodeId, nodeId)
            .Build();
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
            return;
        }

        var definition = await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null)
        {
            return;
        }

        var node = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (node == null)
        {
            return;
        }

        switch (node.Type)
        {
            case "end":
                // 结束节点：完成流程
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
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "发送审批通知失败: InstanceId={InstanceId}, NodeId={NodeId}", instanceId, nodeId);
                }
                break;
            
            case "condition":
                // 条件节点：需要评估条件
                await SetCurrentNodeAsync(instanceId, nodeId);
                await EvaluateConditionAndMoveAsync(instanceId, nodeId, instance.Variables);
                break;
            
            case "parallel":
                // 并行网关：推进到所有分支
                await SetCurrentNodeAsync(instanceId, nodeId);
                var outgoingEdges = definition.Graph.Edges.Where(e => e.Source == nodeId).ToList();
                foreach (var edge in outgoingEdges)
                {
                    await ProcessNodeAsync(instanceId, edge.Target);
                }
                break;
            
            default:
                // 其他节点：直接推进
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
            return;
        }

        var definition = await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null)
        {
            return;
        }

        var node = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (node?.Config.Condition == null)
        {
            return;
        }

        var expression = node.Config.Condition.Expression;
        var outgoingEdges = definition.Graph.Edges.Where(e => e.Source == nodeId).ToList();

        // 简单的表达式评估（支持基本的比较操作）
        foreach (var edge in outgoingEdges)
        {
            if (string.IsNullOrEmpty(edge.Condition))
            {
                continue;
            }

            if (EvaluateExpression(edge.Condition, variables))
            {
                // 条件满足，推进到此路径
                await SetCurrentNodeAsync(instanceId, edge.Target);
                await ProcessNodeAsync(instanceId, edge.Target);
                return;
            }
        }

        // 如果没有条件满足，选择第一条默认路径（没有条件的边）
        var defaultEdge = outgoingEdges.FirstOrDefault(e => string.IsNullOrEmpty(e.Condition));
        if (defaultEdge != null)
        {
            await SetCurrentNodeAsync(instanceId, defaultEdge.Target);
            await ProcessNodeAsync(instanceId, defaultEdge.Target);
        }
    }

    /// <summary>
    /// 评估表达式（简单实现）
    /// </summary>
    private bool EvaluateExpression(string expression, Dictionary<string, object> variables)
    {
        try
        {
            // 简单的表达式解析，支持：变量名 操作符 值
            // 例如：amount > 10000, status == "approved"
            expression = expression.Trim();
            
            if (expression.Contains(">"))
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

        var approvers = await ResolveApproversAsync(instance, node.Config.Approval.Approvers);
        return approvers.Contains(userId);
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
            switch (rule.Type)
            {
                case ApproverType.User:
                    if (!string.IsNullOrEmpty(rule.UserId))
                    {
                        approvers.Add(rule.UserId);
                    }
                    break;
                
                case ApproverType.Role:
                    if (!string.IsNullOrEmpty(rule.RoleId))
                    {
                        // 查询该角色下的所有用户
                        // 通过 UserCompany 查询拥有该角色的用户
                        try
                        {
                            var userCompanyFilter = _userCompanyFactory.CreateFilterBuilder()
                                .Equal(uc => uc.CompanyId, companyId)
                                .Equal(uc => uc.Status, "active")
                                .Build();
                            
                            // 使用 MongoDB 查询数组包含
                            var additionalFilter = Builders<UserCompany>.Filter.AnyEq(uc => uc.RoleIds, rule.RoleId);
                            var combinedFilter = Builders<UserCompany>.Filter.And(userCompanyFilter, additionalFilter);
                            
                            var userCompanies = await _userCompanyFactory.FindAsync(combinedFilter);
                            var userIds = userCompanies
                                .Select(uc => uc.UserId)
                                .Where(id => !string.IsNullOrEmpty(id))
                                .ToList();
                            
                            approvers.AddRange(userIds);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "解析角色审批人失败: RoleId={RoleId}", rule.RoleId);
                        }
                    }
                    break;
                
                case ApproverType.Department:
                    if (!string.IsNullOrEmpty(rule.DepartmentId))
                    {
                        // 查询该部门下的所有用户
                        // 注意：当前系统可能没有部门概念，这里先留空
                        // 如果未来需要支持部门，可以通过 UserCompany 或其他关联表查询
                        _logger.LogWarning("部门审批人解析暂未实现: DepartmentId={DepartmentId}", rule.DepartmentId);
                    }
                    break;
            }
        }

        return approvers.Distinct().ToList();
    }
}
