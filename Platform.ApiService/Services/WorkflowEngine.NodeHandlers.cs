using Platform.ApiService.Models;
using Microsoft.Extensions.DependencyInjection;
using Platform.ServiceDefaults.Services;
using Platform.ApiService.Models.Workflow;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using OpenAI.Chat;
using Platform.ApiService.Workflows.Executors;
using System.Text.Json;

namespace Platform.ApiService.Services;

public partial class WorkflowEngine
{
    private async Task<Executor> CreateExecutorForNodeAsync(string instanceId, WorkflowNode node)
    {
        await Task.CompletedTask; // Keep async signature
        switch (node.Data.NodeType)
        {
            case "start":
                return new StartExecutor();
            case "end":
                return new EndExecutor();
            case "approval":
                if (node.Data.Config?.Approval == null) throw new InvalidOperationException($"Approval node {node.Id} missing config");
                return new ApprovalExecutor(node.Data.Config.Approval, _instanceFactory, _expressionEvaluator);
            case "condition":
                if (node.Data.Config?.Condition == null) throw new InvalidOperationException($"Condition node {node.Id} missing config");
                return new ConditionExecutor(node.Data.Config.Condition, _expressionEvaluator, _expressionValidator);
            default:
                throw new InvalidOperationException($"Unsupported node type: {node.Data.NodeType}");
        }
    }

    /// <summary>
    /// 处理节点
    /// </summary>
    private async Task ProcessNodeAsync(string instanceId, string nodeId)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null) return;

        var definition = instance.WorkflowDefinitionSnapshot ?? await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null) return;

        var node = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (node == null) return;

        _logger.LogInformation("正在处理节点: Instance={InstanceId}, Node={NodeId}, Type={Type}, NodeType={NodeType}",
            instanceId, nodeId, node.Type, node.Data.NodeType);

        switch (node.Type?.ToLower() ?? node.Data.NodeType?.ToLower())
        {
            case "start":
                await MoveToNextNodeAsync(instanceId, nodeId);
                break;
            case "end":
                await CompleteWorkflowAsync(instanceId, WorkflowStatus.Completed);
                break;
            case "approval":
            case "condition":
                await ProcessNodeViaExecutorAsync(instanceId, node);
                break;
        }
    }

    /// <summary>
    /// 推进到下一节点
    /// </summary>
    private async Task MoveToNextNodeAsync(string instanceId, string currentNodeId, string? sourceHandle = null)
    {
        _logger.LogInformation("DEBUG_WORKFLOW: Moving from {NodeId} for Instance {InstanceId} (Handle={Handle})",
            currentNodeId, instanceId, sourceHandle ?? "default");

        await ClearNodeApproversAsync(instanceId, currentNodeId);

        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null) return;

        var definition = instance.WorkflowDefinitionSnapshot ?? await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null) return;

        // 获取出边
        var outgoingEdges = definition.Graph.Edges.Where(e => e.Source == currentNodeId).ToList();

        // 如果提供了 sourceHandle，则过滤出边
        if (!string.IsNullOrEmpty(sourceHandle))
        {
            var filteredEdges = outgoingEdges.Where(e => string.Equals(e.SourceHandle, sourceHandle, StringComparison.OrdinalIgnoreCase)).ToList();
            if (filteredEdges.Any())
            {
                outgoingEdges = filteredEdges;
            }
        }

        if (outgoingEdges.Count == 0)
        {
            await CompleteWorkflowAsync(instanceId, WorkflowStatus.Completed);
            return;
        }

        foreach (var edge in outgoingEdges)
        {
            var nextNodeId = edge.Target;
            await SetCurrentNodeAsync(instanceId, nextNodeId);
            await ProcessNodeAsync(instanceId, nextNodeId);
        }
    }

    /// <summary>
    /// 使用执行器处理节点逻辑 (统一入口)
    /// 
    /// 业务流程：
    /// 1. 获取流程实例和关联的表单数据
    /// 2. 创建对应的执行器（条件、审批等）
    /// 3. 执行节点逻辑，获取返回结果
    /// 4. 根据结果确定 sourceHandle，路由到下一个组件
    /// </summary>
    private async Task ProcessNodeViaExecutorAsync(string instanceId, WorkflowNode node)
    {
        try
        {
            var instance = await _instanceFactory.GetByIdAsync(instanceId);
            var variables = await GetDocumentVariablesAsync(instanceId);

            // 注入系统变量供执行器使用
            variables["__instanceId"] = instanceId;
            variables["__nodeId"] = node.Id;
            variables["__nodeType"] = node.Data.NodeType;

            _logger.LogInformation("DEBUG_WORKFLOW: 处理节点 {NodeId} (类型: {NodeType})，变量总数: {VarCount}",
                node.Id, node.Data.NodeType, variables.Count);

            var executor = await CreateExecutorForNodeAsync(instanceId, node);
            var input = System.Text.Json.JsonSerializer.Serialize(variables);

            _logger.LogDebug("DEBUG_WORKFLOW: 节点 {NodeId} 输入变量: {Input}", node.Id, input);

            // 获取 HandleAsync 方法并调用
            var handleMethod = executor.GetType().GetMethod("HandleAsync", System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            if (handleMethod == null)
            {
                _logger.LogError("DEBUG_WORKFLOW: 节点 {NodeId} 的 HandleAsync 方法未找到!", node.Id);
                await MoveToNextNodeAsync(instanceId, node.Id);
                return;
            }

            _logger.LogInformation("DEBUG_WORKFLOW: 节点 {NodeId} 调用 HandleAsync...", node.Id);
            var invokeResult = handleMethod.Invoke(executor, new object?[] { input, null, default(CancellationToken) });

            if (invokeResult == null)
            {
                _logger.LogWarning("DEBUG_WORKFLOW: 节点 {NodeId} 的 HandleAsync 返回 NULL!", node.Id);
                await MoveToNextNodeAsync(instanceId, node.Id);
                return;
            }

            object? result = null;
            if (invokeResult is Task<object?> taskObj)
            {
                result = await taskObj;
            }
            else if (invokeResult is Task task)
            {
                await task;
                var resultProperty = task.GetType().GetProperty("Result");
                result = resultProperty?.GetValue(task);
            }
            else
            {
                // Handle ValueTask or other awaitables using dynamic
                result = await (dynamic)invokeResult;
            }

            _logger.LogInformation("DEBUG_WORKFLOW: 节点 {NodeId} 处理完成，结果: {Result}",
                node.Id, JsonSerializer.Serialize(result));

            // 更新输出变量
            await UpdateNodeOutputVariablesAsync(instanceId, node, result);

            // 确定 sourceHandle（用于路由到下一个组件）
            string? sourceHandle = null;
            if (result is System.Collections.IDictionary dict)
            {
                if (dict.Contains("__sourceHandle"))
                {
                    sourceHandle = dict["__sourceHandle"]?.ToString();
                    _logger.LogInformation("DEBUG_WORKFLOW: 节点 {NodeId} 返回 handle: {Handle}", node.Id, sourceHandle);
                }

                if (dict.Contains("__trigger_notifications") && Equals(dict["__trigger_notifications"], true))
                {
                    await SendApprovalNotificationsAsync(instanceId, node);
                }
            }
            else if (node.Data.NodeType == "condition" || node.Type == "condition")
            {
                sourceHandle = result?.ToString();
                _logger.LogInformation("DEBUG_WORKFLOW: 条件节点 {NodeId} 返回 handle: {Handle}", node.Id, sourceHandle);
            }

            // 注入调试信息以便于测试排查
            await _instanceFactory.UpdateAsync(instanceId, i =>
            {
                i.SetVariable($"debug.{node.Id}.sourceHandle", sourceHandle);
                i.SetVariable($"debug.{node.Id}.resultType", result?.GetType().Name);
                i.SetVariable($"debug.{node.Id}.processedAt", System.DateTime.UtcNow);
                i.SetVariable($"debug.{node.Id}.result", JsonSerializer.Serialize(result));
            });

            if (sourceHandle == "waiting")
            {
                _logger.LogInformation("DEBUG_WORKFLOW: 节点 {NodeId} 处于等待状态，停止执行", node.Id);
                await _instanceFactory.UpdateAsync(instanceId, i => i.Status = WorkflowStatus.Waiting);
                return;
            }

            _logger.LogInformation("DEBUG_WORKFLOW: 节点 {NodeId} 推进到下一个节点，handle: {Handle}",
                node.Id, sourceHandle ?? "default");
            await MoveToNextNodeAsync(instanceId, node.Id, sourceHandle);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DEBUG_WORKFLOW: 节点处理异常! NodeId={NodeId}, InstanceId={InstanceId}", node.Id, instanceId);
            System.Console.WriteLine($"DEBUG_WORKFLOW: 异常详情 - {ex}");
            // 记录异常到变量
            await _instanceFactory.UpdateAsync(instanceId, i => i.SetVariable($"debug.{node.Id}.error", ex.ToString()));
            // 记录状态为 Cancelled 并停止
            await _instanceFactory.UpdateAsync(instanceId, i => i.Status = WorkflowStatus.Cancelled);
        }
    }

    private async Task UpdateNodeOutputVariablesAsync(string instanceId, WorkflowNode node, object? result)
    {
        if (result == null) return;

        string? outputVar = null;
        switch (node.Type)
        {
            case "approval":
                outputVar = "last_approval_result";
                break;
            case "condition":
                outputVar = "last_condition_result";
                break;
        }

        if (!string.IsNullOrEmpty(outputVar))
        {
            await _instanceFactory.UpdateAsync(instanceId, i =>
            {
                i.SetVariable(outputVar, result);
                i.SetVariable($"nodes.{node.Id}.output", result);
            });
        }
    }
}

