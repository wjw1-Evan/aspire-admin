using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using OpenAI.Chat;
using System;

namespace Platform.ApiService.Services;

public partial class WorkflowEngine
{
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

        _logger.LogInformation("正在处理节点: Instance={InstanceId}, Node={NodeId}, Type={Type}",
            instanceId, nodeId, node.Type);

        switch (node.Type)
        {
            case "start":
                await MoveToNextNodeAsync(instanceId, nodeId);
                break;
            case "end":
                await CompleteWorkflowAsync(instanceId, WorkflowStatus.Completed);
                break;
            case "approval":
                await SendApprovalNotificationsAsync(instanceId, node);
                break;
            case "condition":
                await EvaluateConditionAndMoveAsync(instanceId, node);
                break;
            case "parallel":
                // Bug 7 修复：并行网关不覆盖 CurrentNodeId，而是为每个分支独立处理
                await ProcessParallelGatewayAsync(instanceId, nodeId, definition);
                break;
            case "ai":
                await ProcessAiNodeAsync(instanceId, node);
                break;
            case "notification":
                await ProcessNotificationNodeAsync(instanceId, node);
                break;
        }
    }

    /// <summary>
    /// Bug 7 修复：并行网关处理 - 不覆盖 CurrentNodeId
    /// </summary>
    private async Task ProcessParallelGatewayAsync(string instanceId, string nodeId, WorkflowDefinition definition)
    {
        var outgoingEdges = definition.Graph.Edges.Where(e => e.Source == nodeId).ToList();
        if (outgoingEdges.Count == 0)
        {
            // 没有出边的并行节点作为汇聚点，直接推进到下一个节点
            await MoveToNextNodeAsync(instanceId, nodeId);
            return;
        }

        // 初始化并行分支跟踪
        var branchTargets = outgoingEdges.Select(e => e.Target).ToList();
        await _instanceFactory.UpdateAsync(instanceId, i =>
        {
            // 记录当前并行分支需要完成的目标
            if (!i.ParallelBranches.ContainsKey(nodeId))
            {
                i.ParallelBranches[nodeId] = new List<string>();
            }
        });

        // 分别处理每个分支（不修改 CurrentNodeId，因为并行执行没有单一"当前节点"）
        foreach (var edge in outgoingEdges)
        {
            await ProcessNodeAsync(instanceId, edge.Target);
        }
    }

    /// <summary>
    /// AI节点处理
    /// </summary>
    private async Task ProcessAiNodeAsync(string instanceId, WorkflowNode node)
    {
        if (node.Config.Ai == null || _openAiClient == null)
        {
            await MoveToNextNodeAsync(instanceId, node.Id);
            return;
        }

        try
        {
            var config = node.Config.Ai;
            var variables = await GetDocumentVariablesAsync(instanceId);
            var prompt = config.PromptTemplate;
            foreach (var v in variables)
            {
                prompt = prompt.Replace($"{{{v.Key}}}", v.Value?.ToString());
            }

            var messages = new List<OpenAI.Chat.ChatMessage>();
            if (!string.IsNullOrEmpty(config.SystemPrompt))
            {
                messages.Add(OpenAI.Chat.ChatMessage.CreateSystemMessage(config.SystemPrompt));
            }
            messages.Add(OpenAI.Chat.ChatMessage.CreateUserMessage(prompt));

            var response = await _openAiClient.GetChatClient(config.Model ?? "gpt-4o").CompleteChatAsync(messages);
            var result = response.Value.Content[0].Text;

            await _instanceFactory.UpdateAsync(instanceId, i =>
            {
                i.Variables[config.OutputVariable] = result;
            });

            await MoveToNextNodeAsync(instanceId, node.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI节点处理失败: InstanceId={InstanceId}, NodeId={NodeId}", instanceId, node.Id);
            await MoveToNextNodeAsync(instanceId, node.Id);
        }
    }

    /// <summary>
    /// 条件节点评估
    /// </summary>
    private async Task EvaluateConditionAndMoveAsync(string instanceId, WorkflowNode node)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null) return;

        var definition = instance.WorkflowDefinitionSnapshot ?? await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null) return;

        var variables = await GetDocumentVariablesAsync(instanceId);
        var outgoingEdges = definition.Graph.Edges.Where(e => e.Source == node.Id).ToList();

        foreach (var edge in outgoingEdges)
        {
            if (string.IsNullOrEmpty(edge.Condition) || (edge.Condition == "default")) continue;

            if (_expressionEvaluator.Evaluate(edge.Condition, variables))
            {
                await SetCurrentNodeAsync(instanceId, edge.Target);
                await ProcessNodeAsync(instanceId, edge.Target);
                return;
            }
        }

        var defaultEdge = outgoingEdges.FirstOrDefault(e => e.Condition == "default" || string.IsNullOrEmpty(e.Condition));
        if (defaultEdge != null)
        {
            await SetCurrentNodeAsync(instanceId, defaultEdge.Target);
            await ProcessNodeAsync(instanceId, defaultEdge.Target);
        }
    }

    /// <summary>
    /// 推进到下一节点
    /// </summary>
    private async Task MoveToNextNodeAsync(string instanceId, string currentNodeId)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null) return;

        var definition = instance.WorkflowDefinitionSnapshot ?? await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null) return;

        var outgoingEdges = definition.Graph.Edges.Where(e => e.Source == currentNodeId).ToList();
        if (outgoingEdges.Count == 0)
        {
            await CompleteWorkflowAsync(instanceId, WorkflowStatus.Completed);
            return;
        }

        foreach (var edge in outgoingEdges)
        {
            var nextNodeId = edge.Target;
            var nextNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nextNodeId);

            // Bug 7 修复：并行汇聚检测
            if (nextNode != null && nextNode.Type == "parallel")
            {
                var incomingEdges = definition.Graph.Edges.Where(e => e.Target == nextNodeId).ToList();
                if (incomingEdges.Count > 1)
                {
                    // 多入边 = 汇聚点，需要等待所有分支完成
                    await CompleteParallelBranchAsync(instanceId, nextNodeId, edge.Source);
                    continue;
                }
            }

            await SetCurrentNodeAsync(instanceId, nextNodeId);
            await ProcessNodeAsync(instanceId, nextNodeId);
        }
    }

    /// <summary>
    /// 完成一个并行分支
    /// </summary>
    public async Task<bool> CompleteParallelBranchAsync(string instanceId, string nodeId, string branchId)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null || instance.Status != WorkflowStatus.Running) return false;

        var definition = instance.WorkflowDefinitionSnapshot ?? await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null) return false;

        await _instanceFactory.UpdateAsync(instanceId, i =>
        {
            if (!i.ParallelBranches.ContainsKey(nodeId)) i.ParallelBranches[nodeId] = new List<string>();
            if (!i.ParallelBranches[nodeId].Contains(branchId)) i.ParallelBranches[nodeId].Add(branchId);
        });

        instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null) return false;

        var parallelNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (parallelNode != null)
        {
            var allBranches = definition.Graph.Edges.Where(e => e.Target == nodeId).Select(e => e.Source).ToList();

            var completedBranches = instance.ParallelBranches.GetValueOrDefault(nodeId, new List<string>());
            if (allBranches.All(b => completedBranches.Contains(b)))
            {
                // 所有分支完成，推进到汇聚点的下一个节点
                await SetCurrentNodeAsync(instanceId, nodeId);
                await MoveToNextNodeAsync(instanceId, nodeId);
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
        if (instance == null || instance.Status != WorkflowStatus.Running) return false;

        await _instanceFactory.UpdateAsync(instanceId, i =>
        {
            foreach (var v in variables) i.Variables[v.Key] = v.Value;
            i.UpdatedAt = DateTime.UtcNow;
        });

        var definition = instance.WorkflowDefinitionSnapshot ?? await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId);
        if (definition == null) return false;

        var node = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (node == null) return false;

        await EvaluateConditionAndMoveAsync(instanceId, node);
        return true;
    }
}
