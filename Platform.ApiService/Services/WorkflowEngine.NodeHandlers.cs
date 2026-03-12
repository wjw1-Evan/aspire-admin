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
using Microsoft.Agents.AI;
using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Workflows.Executors;
using Microsoft.Extensions.AI;
using Microsoft.Agents.AI.OpenAI;
using Platform.ApiService.Workflows.Utilities;
using System.Text.Json;

namespace Platform.ApiService.Services;

public partial class WorkflowEngine
{
    private async Task<Workflow> BuildAgentWorkflowAsync(string instanceId, WorkflowDefinition definition)
    {
        var startNode = definition.Graph.Nodes.FirstOrDefault(n => n.Data.NodeType == "start") ?? throw new InvalidOperationException("Workflow missing start node");
        
        // 使用 WorkflowBuilder 构建工作流图
        var entryExecutor = await CreateExecutorForNodeAsync(instanceId, startNode);
        var builder = new WorkflowBuilder(entryExecutor);
        
        var nodeToExecutor = new Dictionary<string, Executor> { { startNode.Id, entryExecutor } };
        
        // 1. 创建所有 Executor
        foreach (var node in definition.Graph.Nodes.Where(n => n.Id != startNode.Id))
        {
            nodeToExecutor[node.Id] = await CreateExecutorForNodeAsync(instanceId, node);
        }

        // 2. 添加边 (Edges)
        foreach (var edge in definition.Graph.Edges)
        {
            if (string.IsNullOrEmpty(edge.Source) || string.IsNullOrEmpty(edge.Target))
            {
                continue;
            }

            if (nodeToExecutor.TryGetValue(edge.Source, out var source) && 
                nodeToExecutor.TryGetValue(edge.Target, out var target))
            {
                builder.AddEdge(source, target);
            }
        }

        return builder.Build();
    }

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
                return new ConditionExecutor(node.Data.Config.Condition, _expressionEvaluator);
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
    /// </summary>
    private async Task ProcessNodeViaExecutorAsync(string instanceId, WorkflowNode node)
    {
        try
        {
            var instance = await _instanceFactory.GetByIdAsync(instanceId);
            var variables = await GetDocumentVariablesAsync(instanceId);
            
            // 注入系统变量供执行器使用
            variables["__instanceId"] = instanceId;

            var executor = await CreateExecutorForNodeAsync(instanceId, node);
            var input = System.Text.Json.JsonSerializer.Serialize(variables);
            
            Console.WriteLine($"DEBUG_WORKFLOW: Node {node.Id} Input variables: {input}");

            // 获取 HandleAsync 方法并调用
            var handleMethod = executor.GetType().GetMethod("HandleAsync", System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            if (handleMethod == null)
            {
                Console.WriteLine($"DEBUG_WORKFLOW: Node {node.Id} HandleAsync method NOT FOUND!");
                await MoveToNextNodeAsync(instanceId, node.Id);
                return;
            }

            Console.WriteLine($"DEBUG_WORKFLOW: Node {node.Id} Invoking HandleAsync...");
            var invokeResult = handleMethod.Invoke(executor, new object?[] { input, null, default(CancellationToken) });
            
            if (invokeResult == null)
            {
                Console.WriteLine($"DEBUG_WORKFLOW: Node {node.Id} Invoke returned NULL!");
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
            
            Console.WriteLine($"DEBUG_WORKFLOW: Node {node.Id} Processed. Result: {JsonSerializer.Serialize(result)}");

            // 更新输出变量
            await UpdateNodeOutputVariablesAsync(instanceId, node, result);

            // 确定 sourceHandle
            string? sourceHandle = null;
            if (result is System.Collections.IDictionary dict)
            {
                if (dict.Contains("__sourceHandle"))
                {
                    sourceHandle = dict["__sourceHandle"]?.ToString();
                    _logger.LogInformation("DEBUG_WORKFLOW: Node {NodeId} returned handle: {Handle}", node.Id, sourceHandle);
                }
                
                if (dict.Contains("__trigger_notifications") && Equals(dict["__trigger_notifications"], true))
                {
                    await SendApprovalNotificationsAsync(instanceId, node);
                }
            }
            else if (node.Data.NodeType == "condition" || node.Type == "condition")
            {
                sourceHandle = result?.ToString();
                _logger.LogInformation("DEBUG_WORKFLOW: Condition Node {NodeId} returned fallback handle: {Handle}", node.Id, sourceHandle);
            }

            // 注入调试信息以便于测试排查
            await _instanceFactory.UpdateAsync(instanceId, i => 
            {
                i.SetVariable($"debug.{node.Id}.sourceHandle", sourceHandle);
                i.SetVariable($"debug.{node.Id}.resultType", result?.GetType().Name);
            });

            if (sourceHandle == "waiting")
            {
                _logger.LogInformation("DEBUG_WORKFLOW: Node {NodeId} is WAITING. Stopping execution.", node.Id);
                await _instanceFactory.UpdateAsync(instanceId, i => i.Status = WorkflowStatus.Waiting);
                return; 
            }

            _logger.LogInformation("DEBUG_WORKFLOW: Node {NodeId} moving to next with handle: {Handle}", node.Id, sourceHandle ?? "null");
            await MoveToNextNodeAsync(instanceId, node.Id, sourceHandle);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "DEBUG_WORKFLOW: 执行器节点处理抛异常! NodeId={NodeId}, InstanceId={InstanceId}", node.Id, instanceId);
            // 记录异常到变量
            await _instanceFactory.UpdateAsync(instanceId, i => i.SetVariable($"debug.{node.Id}.error", ex.ToString()));
            // ERROR: 不应当盲目 MoveToNextNode，否则会导致跳过审批节点。
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

