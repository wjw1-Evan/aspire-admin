using Platform.ApiService.Models;
using Microsoft.Extensions.DependencyInjection;
using Platform.ServiceDefaults.Services;
using Platform.ApiService.Models.Workflow;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using Platform.ApiService.Workflows.Executors;
using Microsoft.EntityFrameworkCore;

namespace Platform.ApiService.Services;

public partial class WorkflowEngine
{
    private async Task<Executor> CreateExecutorForNodeAsync(string instanceId, WorkflowNode node)
    {
        await Task.CompletedTask;
        return node.Data.NodeType.ToLower() switch
        {
            "start" => new StartExecutor(),
            "end" => new EndExecutor(),
            "approval" => node.Data.Config?.Approval != null 
                ? new ApprovalExecutor(_context, node.Data.Config.Approval, _expressionEvaluator) 
                : throw new InvalidOperationException($"Approval node {node.Id} missing config"),
            "condition" => node.Data.Config?.Condition != null 
                ? new ConditionExecutor(node.Data.Config.Condition, _expressionEvaluator, _expressionValidator, _loggerFactory.CreateLogger<ConditionExecutor>()) 
                : throw new InvalidOperationException($"Condition node {node.Id} missing config"),
            _ => throw new InvalidOperationException($"Unsupported node type: {node.Data.NodeType}")
        };
    }

    private async Task ProcessNodeAsync(string instanceId, string nodeId)
    {
        var instance = await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instanceId);
        if (instance == null) return;

        var definition = instance.WorkflowDefinitionSnapshot ?? await _context.Set<WorkflowDefinition>().FirstOrDefaultAsync(x => x.Id == instance.WorkflowDefinitionId);
        if (definition == null) return;

        var node = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (node == null) return;


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

    private async Task MoveToNextNodeAsync(string instanceId, string currentNodeId, string? sourceHandle = null)
    {

        await ClearNodeApproversAsync(instanceId, currentNodeId);

        var instance = await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instanceId);
        if (instance == null) return;

        var definition = instance.WorkflowDefinitionSnapshot ?? await _context.Set<WorkflowDefinition>().FirstOrDefaultAsync(x => x.Id == instance.WorkflowDefinitionId);
        if (definition == null) return;

        var outgoingEdges = definition.Graph.Edges.Where(e => e.Source == currentNodeId).ToList();

        if (!string.IsNullOrEmpty(sourceHandle))
        {
            var filteredEdges = outgoingEdges.Where(e => string.Equals(e.SourceHandle, sourceHandle, StringComparison.OrdinalIgnoreCase)).ToList();
            if (!filteredEdges.Any())
                filteredEdges = outgoingEdges.Where(e => string.Equals(e.SourceHandle, "default", StringComparison.OrdinalIgnoreCase)).ToList();
            if (!filteredEdges.Any())
                filteredEdges = outgoingEdges.Where(e => string.IsNullOrEmpty(e.SourceHandle)).ToList();
            
            if (!filteredEdges.Any())
            {
                _logger.LogWarning(": 没有找到匹配的边来完成节点 {NodeId}", currentNodeId);
                await CompleteWorkflowAsync(instanceId, WorkflowStatus.Completed);
                return;
            }
            outgoingEdges = filteredEdges;
        }

        if (outgoingEdges.Count == 0)
        {
            await CompleteWorkflowAsync(instanceId, WorkflowStatus.Completed);
            return;
        }

        var firstEdge = outgoingEdges.First();
        await SetCurrentNodeAsync(instanceId, firstEdge.Target);
        await ProcessNodeAsync(instanceId, firstEdge.Target);
        
        foreach (var edge in outgoingEdges.Skip(1))
        {
            await ProcessNodeAsync(instanceId, edge.Target);
        }
    }

    private async Task ProcessNodeViaExecutorAsync(string instanceId, WorkflowNode node)
    {
        var instance = await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instanceId);
        if (instance == null) return;

        try
        {
            var variables = await GetDocumentVariablesAsync(instanceId);
            variables["__instanceId"] = instanceId;
            variables["__nodeId"] = node.Id;
            variables["__nodeType"] = node.Data.NodeType;


            var executor = await CreateExecutorForNodeAsync(instanceId, node);
            var input = JsonSerializer.Serialize(variables);

            var handleMethod = executor.GetType().GetMethod("HandleAsync");
            if (handleMethod == null)
            {
                _logger.LogError(": 节点 {NodeId} 的 HandleAsync 方法未找到!", node.Id);
                await MoveToNextNodeAsync(instanceId, node.Id);
                return;
            }

            var invokeResult = handleMethod.Invoke(executor, new object?[] { input, null, default(CancellationToken) });

            if (invokeResult == null)
            {
                _logger.LogWarning(": 节点 {NodeId} 的 HandleAsync 返回 NULL!", node.Id);
                await MoveToNextNodeAsync(instanceId, node.Id);
                return;
            }

            object? result = null;
            if (invokeResult is Task<object?> taskObj) result = await taskObj;
            else if (invokeResult is Task task)
            {
                await task;
                result = task.GetType().GetProperty("Result")?.GetValue(task);
            }
            else result = await (dynamic)invokeResult;


            await UpdateNodeOutputVariablesAsync(instanceId, node, result);

            string? sourceHandle = null;
            if (result is IDictionary<string, object> dict)
            {
                if (dict.TryGetValue("__sourceHandle", out var sh)) sourceHandle = sh?.ToString();
                if (dict.TryGetValue("__trigger_notifications", out var tn) && Equals(tn, true))
                    await SendApprovalNotificationsAsync(instanceId, node);
            }
            else if (result is System.Collections.IDictionary legacyDict)
            {
                if (legacyDict.Contains("__sourceHandle")) sourceHandle = legacyDict["__sourceHandle"]?.ToString();
                if (legacyDict.Contains("__trigger_notifications") && Equals(legacyDict["__trigger_notifications"], true))
                    await SendApprovalNotificationsAsync(instanceId, node);
            }
            else if (node.Data.NodeType == "condition" || node.Type == "condition")
            {
                sourceHandle = result?.ToString();
            }

            instance.SetVariable($"debug.{node.Id}.sourceHandle", sourceHandle);
            instance.SetVariable($"debug.{node.Id}.processedAt", DateTime.UtcNow);
            await _context.SaveChangesAsync();

            if (sourceHandle == "waiting")
            {
                var waitingInstance = await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instanceId);
                if (waitingInstance != null)
                {
                    waitingInstance.Status = WorkflowStatus.Waiting;
                    await _context.SaveChangesAsync();
                }
                return;
            }

            await MoveToNextNodeAsync(instanceId, node.Id, sourceHandle);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, ": 节点 {NodeId} 处理异常", node.Id);
            var errorInstance = await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instanceId);
            if (errorInstance != null)
            {
                errorInstance.Status = WorkflowStatus.Cancelled;
                await _context.SaveChangesAsync();
            }
        }
    }

    private async Task UpdateNodeOutputVariablesAsync(string instanceId, WorkflowNode node, object? result)
    {
        if (result == null) return;
        string? outputVar = node.Data.NodeType switch
        {
            "approval" => "last_approval_result",
            "condition" => "last_condition_result",
            _ => null
        };

        if (!string.IsNullOrEmpty(outputVar))
        {
            // Note: Simplistic update, might need more robust variable merging in production
            var instance = await _context.Set<WorkflowInstance>().FirstOrDefaultAsync(x => x.Id == instanceId);
            if (instance != null)
            {
                instance.SetVariable(outputVar, result);
                instance.SetVariable($"nodes.{node.Id}.output", result);
                await _context.SaveChangesAsync();
            }
        }
    }
}
