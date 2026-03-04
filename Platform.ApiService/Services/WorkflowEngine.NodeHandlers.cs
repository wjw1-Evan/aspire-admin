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
                // Bug 24 修复：退回到 start 节点时，如果有表单绑定则等待用户重新提交
                if (node.Config?.Form != null)
                {
                    // 有表单绑定，通知发起人重新填写
                    await UpdateCurrentApproverIdsAsync(instanceId, new List<string> { instance.StartedBy });
                    await SendReturnToStartNotificationAsync(instanceId, node, instance.StartedBy);
                }
                else
                {
                    await MoveToNextNodeAsync(instanceId, nodeId);
                }
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
            case "aiJudge":
                await ProcessAiJudgeNodeAsync(instanceId, node);
                break;
            case "notification":
                await ProcessNotificationNodeAsync(instanceId, node);
                break;
            case "httpRequest":
                await ProcessHttpRequestNodeAsync(instanceId, node);
                break;
            case "timer":
                await ProcessTimerNodeAsync(instanceId, node);
                break;
            case "setVariable":
                await ProcessSetVariableNodeAsync(instanceId, node);
                break;
            case "log":
                await ProcessLogNodeAsync(instanceId, node);
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

            // 获取指定的 InputVariable 上下文
            if (!string.IsNullOrEmpty(config.InputVariable))
            {
                if (variables.TryGetValue(config.InputVariable, out var inputVal))
                {
                    prompt = prompt.Replace("{{inputVariable}}", inputVal?.ToString() ?? "");
                }
            }

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
        else
        {
            // Bug 23 修复：所有条件边均不匹配且无默认边时，记录警告并完成流程，避免卡死
            _logger.LogWarning("条件节点无匹配边，流程将终止: InstanceId={InstanceId}, NodeId={NodeId}",
                instanceId, node.Id);
            await CompleteWorkflowAsync(instanceId, WorkflowStatus.Completed);
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

    private static readonly System.Net.Http.HttpClient _sharedHttpClient = new();

    /// <summary>
    /// 处理 HTTP 请求节点
    /// </summary>
    private async Task ProcessHttpRequestNodeAsync(string instanceId, WorkflowNode node)
    {
        if (node.Config.Http == null || string.IsNullOrWhiteSpace(node.Config.Http.Url))
        {
            await MoveToNextNodeAsync(instanceId, node.Id);
            return;
        }

        try
        {
            var config = node.Config.Http;
            var variables = await GetDocumentVariablesAsync(instanceId);

            // 替换 URL 中的变量
            var url = config.Url;
            foreach (var v in variables) url = url.Replace($"{{{v.Key}}}", v.Value?.ToString());

            var requestMessage = new System.Net.Http.HttpRequestMessage(
                new System.Net.Http.HttpMethod(config.Method?.ToUpper() ?? "GET"), url);

            if (!string.IsNullOrWhiteSpace(config.Body))
            {
                var body = config.Body;
                foreach (var v in variables) body = body.Replace($"{{{v.Key}}}", v.Value?.ToString());
                requestMessage.Content = new System.Net.Http.StringContent(body, System.Text.Encoding.UTF8, "application/json");
            }

            if (!string.IsNullOrWhiteSpace(config.Headers))
            {
                try
                {
                    var headersDict = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, string>>(config.Headers);
                    if (headersDict != null)
                    {
                        foreach (var header in headersDict)
                        {
                            requestMessage.Headers.TryAddWithoutValidation(header.Key, header.Value);
                        }
                    }
                }
                catch { /* 忽略头解析错误 */ }
            }

            var response = await _sharedHttpClient.SendAsync(requestMessage);
            var responseContent = await response.Content.ReadAsStringAsync();

            if (!string.IsNullOrWhiteSpace(config.OutputVariable))
            {
                await _instanceFactory.UpdateAsync(instanceId, i =>
                {
                    i.Variables[config.OutputVariable] = responseContent;
                });
            }

            await MoveToNextNodeAsync(instanceId, node.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "HTTP节点执行失败: InstanceId={InstanceId}, NodeId={NodeId}", instanceId, node.Id);
            await MoveToNextNodeAsync(instanceId, node.Id); // 失败也继续前进，或者挂起（此处选择前进以防死锁）
        }
    }

    /// <summary>
    /// 处理计时器节点
    /// </summary>
    private async Task ProcessTimerNodeAsync(string instanceId, WorkflowNode node)
    {
        if (node.Config.Timer == null || string.IsNullOrWhiteSpace(node.Config.Timer.WaitDuration))
        {
            await MoveToNextNodeAsync(instanceId, node.Id);
            return;
        }

        if (TimeSpan.TryParse(node.Config.Timer.WaitDuration, out var delay))
        {
            await _instanceFactory.UpdateAsync(instanceId, i =>
            {
                i.Status = WorkflowStatus.Waiting;
            });

            // ⚠️ 理想情况应该借助 Hangfire/Quartz 加入延迟队列，此处使用简单的后台延迟模拟
            // 实际生产环境应用定时任务轮询处理 Waiting 状态
            _ = Task.Run(async () =>
            {
                await Task.Delay(delay);
                await _instanceFactory.UpdateAsync(instanceId, i => i.Status = WorkflowStatus.Running);
                await MoveToNextNodeAsync(instanceId, node.Id);
            });
        }
        else
        {
            await MoveToNextNodeAsync(instanceId, node.Id);
        }
    }

    /// <summary>
    /// 处理设置变量节点
    /// </summary>
    private async Task ProcessSetVariableNodeAsync(string instanceId, WorkflowNode node)
    {
        if (node.Config.Variable == null || string.IsNullOrWhiteSpace(node.Config.Variable.Name))
        {
            await MoveToNextNodeAsync(instanceId, node.Id);
            return;
        }

        try
        {
            var config = node.Config.Variable;
            var variables = await GetDocumentVariablesAsync(instanceId);
            var val = config.Value ?? string.Empty;

            foreach (var v in variables)
            {
                val = val.Replace($"{{{v.Key}}}", v.Value?.ToString());
            }

            await _instanceFactory.UpdateAsync(instanceId, i =>
            {
                i.Variables[config.Name] = val;
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SetVariable节点执行失败: Node={NodeId}", node.Id);
        }

        await MoveToNextNodeAsync(instanceId, node.Id);
    }

    /// <summary>
    /// 处理日志节点
    /// </summary>
    private async Task ProcessLogNodeAsync(string instanceId, WorkflowNode node)
    {
        if (node.Config.Log != null && !string.IsNullOrWhiteSpace(node.Config.Log.Message))
        {
            var variables = await GetDocumentVariablesAsync(instanceId);
            var msg = node.Config.Log.Message;
            foreach (var v in variables)
            {
                msg = msg.Replace($"{{{v.Key}}}", v.Value?.ToString());
            }

            switch (node.Config.Log.Level?.ToLower())
            {
                case "warning": _logger.LogWarning("Workflow Log [Instance {InstanceId}]: {Message}", instanceId, msg); break;
                case "error": _logger.LogError("Workflow Log [Instance {InstanceId}]: {Message}", instanceId, msg); break;
                case "debug": _logger.LogDebug("Workflow Log [Instance {InstanceId}]: {Message}", instanceId, msg); break;
                default: _logger.LogInformation("Workflow Log [Instance {InstanceId}]: {Message}", instanceId, msg); break;
            }
        }
        await MoveToNextNodeAsync(instanceId, node.Id);
    }

    /// <summary>
    /// 处理 AI 判断节点
    /// </summary>
    private async Task ProcessAiJudgeNodeAsync(string instanceId, WorkflowNode node)
    {
        if (node.Config.AiJudge == null || _openAiClient == null)
        {
            await MoveToNextNodeAsync(instanceId, node.Id);
            return;
        }

        try
        {
            var config = node.Config.AiJudge;
            var variables = await GetDocumentVariablesAsync(instanceId);
            var prompt = config.JudgePrompt;

            if (!string.IsNullOrEmpty(config.InputVariable) && variables.TryGetValue(config.InputVariable, out var inputVal))
            {
                prompt = prompt.Replace("{{inputVariable}}", inputVal?.ToString() ?? "");
            }

            foreach (var v in variables)
            {
                prompt = prompt.Replace($"{{{v.Key}}}", v.Value?.ToString());
            }

            var messages = new List<OpenAI.Chat.ChatMessage>();
            if (!string.IsNullOrEmpty(config.SystemPrompt))
            {
                messages.Add(OpenAI.Chat.ChatMessage.CreateSystemMessage(config.SystemPrompt));
            }
            else
            {
                messages.Add(OpenAI.Chat.ChatMessage.CreateSystemMessage("你是一个逻辑判断引擎。根据用户的描述判断真假，且只允许输出 'true' 或 'false'。不要输出任何其他字符。"));
            }
            messages.Add(OpenAI.Chat.ChatMessage.CreateUserMessage(prompt));

            var response = await _openAiClient.GetChatClient(config.Model ?? "gpt-4o").CompleteChatAsync(messages);
            var result = response.Value.Content[0].Text.Trim().ToLower();

            var finalResult = (result.Contains("true") && !result.Contains("false")) ? "true" : "false";

            await _instanceFactory.UpdateAsync(instanceId, i =>
            {
                i.Variables[config.OutputVariable] = finalResult;
            });

            await MoveToNextNodeAsync(instanceId, node.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI 判断节点执行失败: InstanceId={InstanceId}, NodeId={NodeId}", instanceId, node.Id);
            await _instanceFactory.UpdateAsync(instanceId, i => i.Variables[node.Config.AiJudge.OutputVariable] = "false");
            await MoveToNextNodeAsync(instanceId, node.Id);
        }
    }
}
