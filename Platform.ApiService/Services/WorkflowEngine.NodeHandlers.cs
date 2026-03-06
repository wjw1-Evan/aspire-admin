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

namespace Platform.ApiService.Services;

public partial class WorkflowEngine
{
    private async Task<Workflow> BuildAgentWorkflowAsync(string instanceId, WorkflowDefinition definition)
    {
        var startNode = definition.Graph.Nodes.FirstOrDefault(n => n.Data.NodeType == "start") ?? throw new InvalidOperationException("Workflow missing start node");
        
        // 使用 WorkflowBuilder 构建工作流图
        // 注意：第一个传入的 executor 是入口点
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
            if (nodeToExecutor.TryGetValue(edge.Source, out var source) && 
                nodeToExecutor.TryGetValue(edge.Target, out var target))
            {
                if (!string.IsNullOrEmpty(edge.Data?.Condition) && edge.Data.Condition != "default")
                {
                    // 添加带条件的边
                    builder.AddEdge<object>(source, target, condition: (msg) => 
                    {
                        // 逻辑：评估 edge.Data.Condition
                        return true; // 占位实现
                    });
                }
                else
                {
                    // 普通边
                    builder.AddEdge(source, target);
                }
            }
        }

        return builder.Build();
    }

    private async Task<Executor> CreateExecutorForNodeAsync(string instanceId, WorkflowNode node)
    {
        await Task.CompletedTask; // Keep async signature
        switch (node.Data.NodeType)
        {
            case "ai":
            case "llm":
                if (node.Data.Config?.Ai == null) throw new InvalidOperationException($"AI node {node.Id} missing config");
                // In RC3, ChatClientAgent is the concrete implementation of AIAgent
                // OpenAIClient.GetChatClient(model).AsIChatClient() converts the OpenAI client to the generic IChatClient
                var aiChatClient = _openAiClient.GetChatClient(node.Data.Config.Ai.Model ?? "gpt-4o-mini").AsIChatClient();
                var aiAgent = new ChatClientAgent(aiChatClient, "AiAgent");
                return new AiExecutor(aiAgent, node.Data.Config.Ai);
            case "aiJudge":
                if (node.Data.Config?.AiJudge == null) throw new InvalidOperationException($"AI Judge node {node.Id} missing config");
                var judgeChatClient = _openAiClient.GetChatClient(node.Data.Config.AiJudge.Model ?? "gpt-4o-mini").AsIChatClient();
                var judgeAgent = new ChatClientAgent(judgeChatClient, "JudgeAgent");
                return new AiJudgeExecutor(judgeAgent, node.Data.Config.AiJudge);
            case "knowledgeSearch":
                if (node.Data.Config?.Knowledge == null) throw new InvalidOperationException($"Knowledge Search node {node.Id} missing config");
                return new KnowledgeSearchExecutor(_knowledgeService, node.Data.Config.Knowledge);
            case "code":
                if (node.Data.Config?.Code == null) throw new InvalidOperationException($"Code node {node.Id} missing config");
                return new CodeExecutor(node.Data.Config.Code);
            case "template":
                if (node.Data.Config?.Template == null) throw new InvalidOperationException($"Template node {node.Id} missing config");
                return new TemplateExecutor(node.Data.Config.Template);
            case "variableAggregator":
                if (node.Data.Config?.VariableAggregator == null) throw new InvalidOperationException($"Variable Aggregator node {node.Id} missing config");
                return new VariableAggregatorExecutor(node.Data.Config.VariableAggregator);
            case "questionClassifier":
                if (node.Data.Config?.QuestionClassifier == null) throw new InvalidOperationException($"Question Classifier node {node.Id} missing config");
                var classifierChatClient = _openAiClient.GetChatClient(node.Data.Config.QuestionClassifier.Model ?? "gpt-4o-mini").AsIChatClient();
                var classifierAgent = new ChatClientAgent(classifierChatClient, "ClassifierAgent");
                return new QuestionClassifierExecutor(classifierAgent, node.Data.Config.QuestionClassifier);
            case "parameterExtractor":
                if (node.Data.Config?.ParameterExtractor == null) throw new InvalidOperationException($"Parameter Extractor node {node.Id} missing config");
                var extractorChatClient = _openAiClient.GetChatClient(node.Data.Config.ParameterExtractor.Model ?? "gpt-4o-mini").AsIChatClient();
                var extractorAgent = new ChatClientAgent(extractorChatClient, "ExtractorAgent");
                return new ParameterExtractorExecutor(extractorAgent, node.Data.Config.ParameterExtractor);
            case "httpRequest":
                if (node.Data.Config?.Http == null) throw new InvalidOperationException($"HTTP node {node.Id} missing config");
                return new HttpRequestExecutor(node.Data.Config.Http);
            case "iteration":
                if (node.Data.Config?.Iteration == null) throw new InvalidOperationException($"Iteration node {node.Id} missing config");
                return new IterationExecutor(node.Data.Config.Iteration);
            case "answer":
                if (node.Data.Config?.Answer == null) throw new InvalidOperationException($"Answer node {node.Id} missing config");
                return new AnswerExecutor(node.Data.Config.Answer);
            case "tool":
                if (node.Data.Config?.Tool == null) throw new InvalidOperationException($"Tool node {node.Id} missing config");
                return new ToolExecutor(node.Data.Config.Tool);
            case "approval":
                if (node.Data.Config?.Approval == null) throw new InvalidOperationException($"Approval node {node.Id} missing config");
                return new ApprovalExecutor(node.Data.Config.Approval, _instanceFactory);
            // 其他节点类型...
            default:
                // 默认使用一个透传执行器或基础逻辑执行器
                var defaultChatClient = _openAiClient.GetChatClient("gpt-4o-mini").AsIChatClient();
                var defaultAgent = new ChatClientAgent(defaultChatClient, "DefaultAgent");
                return new AiExecutor(defaultAgent, new AiConfig());
        }
    }

    /// <summary>
    /// 处理节点
    /// </summary>
    private async Task ProcessNodeAsync(string instanceId, string nodeId)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null) return;

        _logger.LogInformation("DEBUG_WORKFLOW: Processing Node {NodeId} for Instance {InstanceId}", nodeId, instanceId);

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
                if (node.Data.Config?.Form != null)
                {
                    // 有表单绑定，通知发起人重新填写
                    await UpdateCurrentApproverIdsAsync(instanceId, nodeId, new List<string> { instance.StartedBy });
                    await SendReturnToStartNotificationAsync(instanceId, node, instance.StartedBy);
                }
                else
                {
                    await MoveToNextNodeAsync(instanceId, nodeId);
                }
                break;
            case "end":
                _logger.LogInformation("DEBUG_WORKFLOW: End node reached for Instance {InstanceId}", instanceId);
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
            case "knowledgeSearch":
                await ProcessKnowledgeSearchNodeAsync(instanceId, node);
                break;
            case "code":
                await ProcessCodeNodeAsync(instanceId, node);
                break;
            case "template":
                await ProcessTemplateNodeAsync(instanceId, node);
                break;
            case "variableAggregator":
                await ProcessVariableAggregatorNodeAsync(instanceId, node);
                break;
            case "questionClassifier":
                await ProcessQuestionClassifierNodeAsync(instanceId, node);
            break;
            case "parameterExtractor":
                await ProcessParameterExtractorNodeAsync(instanceId, node);
                break;
            case "iteration":
                await ProcessIterationNodeAsync(instanceId, node);
                break;
            case "answer":
                await ProcessAnswerNodeAsync(instanceId, node);
                break;
            case "tool":
                await ProcessToolNodeAsync(instanceId, node);
                break;
        }
    }

    /// <summary>
    /// Bug 7 修复：并行网关处理 - 不覆盖 CurrentNodeId
    /// </summary>
    private async Task ProcessParallelGatewayAsync(string instanceId, string nodeId, WorkflowDefinition definition)
    {
        var outgoingEdges = definition.Graph.Edges.Where(e => e.Source == nodeId).ToList();
        _logger.LogInformation("=== 并行网关 {NodeId}: 出边数={Count}, Targets=[{Targets}] ===",
            nodeId, outgoingEdges.Count, string.Join(", ", outgoingEdges.Select(e => e.Target)));

        if (outgoingEdges.Count == 0)
        {
            // 没有出边的并行节点作为汇聚点，直接推进到下一个节点
            _logger.LogInformation("并行网关 {NodeId} 无出边，作为汇聚点推进", nodeId);
            await MoveToNextNodeAsync(instanceId, nodeId);
            return;
        }

        // 初始化并行分支跟踪
        var branchTargets = outgoingEdges.Select(e => e.Target).ToList();
        // 初始化并行分支跟踪
        await _instanceFactory.UpdateAsync(instanceId, i =>
        {
            // 记录当前并行分支需要完成的目标
            if (!i.GetParallelBranches(nodeId).Any())
            {
                i.AddParallelBranch(nodeId, "INITIAL_MARKER"); // 确保节点条目存在
            }
        });

        // 分别处理每个分支（不修改 CurrentNodeId，因为并行执行没有单一"当前节点"）
        foreach (var edge in outgoingEdges)
        {
            _logger.LogInformation("并行网关 {NodeId}: 启动分支 -> {Target}", nodeId, edge.Target);
            await ProcessNodeAsync(instanceId, edge.Target);
        }
        _logger.LogInformation("=== 并行网关 {NodeId}: 所有分支已启动 ===", nodeId);
    }

    /// <summary>
    /// AI节点处理 - 使用 Microsoft.Agents.AI 优化
    /// </summary>
    private async Task ProcessAiNodeAsync(string instanceId, WorkflowNode node)
    {
        if (node.Data.Config.Ai == null || _openAiClient == null)
        {
            await MoveToNextNodeAsync(instanceId, node.Id);
            return;
        }

        try
        {
            var config = node.Data.Config.Ai;
            var variables = await GetDocumentVariablesAsync(instanceId);
            var prompt = config.PromptTemplate;

            // 替换变量
            if (!string.IsNullOrEmpty(config.InputVariable) && variables.TryGetValue(config.InputVariable, out var inputVal))
            {
                prompt = prompt.Replace("{{inputVariable}}", inputVal?.ToString() ?? "");
            }

            foreach (var v in variables)
            {
                prompt = prompt.Replace($"{{{v.Key}}}", v.Value?.ToString());
            }

            // 使用标准的 OpenAI.Chat 补全
            var chatClient = _openAiClient.GetChatClient(config.Model ?? "gpt-4o-mini");
            
            _logger.LogInformation("DEBUG_AI: Executing AI Node {NodeId} with model {Model}", node.Id, config.Model);
            
            var messages = new List<OpenAI.Chat.ChatMessage>();
            if (!string.IsNullOrEmpty(config.SystemPrompt))
            {
                messages.Add(OpenAI.Chat.ChatMessage.CreateSystemMessage(config.SystemPrompt));
            }
            messages.Add(OpenAI.Chat.ChatMessage.CreateUserMessage(prompt));

            var response = await chatClient.CompleteChatAsync(messages);
            var result = response.Value.Content[0].Text;

            await _instanceFactory.UpdateAsync(instanceId, i =>
            {
                i.SetVariable(config.OutputVariable, result);
            });

            await MoveToNextNodeAsync(instanceId, node.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI节点处理失败 (Agent框架): InstanceId={InstanceId}, NodeId={NodeId}", instanceId, node.Id);
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
            var condition = edge.Data?.Condition;
            if (string.IsNullOrEmpty(condition) || condition == "default") continue;

            if (_expressionEvaluator.Evaluate(condition, variables))
            {
                await SetCurrentNodeAsync(instanceId, edge.Target);
                await ProcessNodeAsync(instanceId, edge.Target);
                return;
            }
        }

        var defaultEdge = outgoingEdges.FirstOrDefault(e => e.Data?.Condition == "default" || string.IsNullOrEmpty(e.Data?.Condition));
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
        _logger.LogInformation("DEBUG_WORKFLOW: Moving from {NodeId} for Instance {InstanceId}", currentNodeId, instanceId);
        await ClearNodeApproversAsync(instanceId, currentNodeId); // 清除已完成节点的待办人员，避免残留

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
            i.AddParallelBranch(nodeId, branchId);
        });

        instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null) return false;

        var parallelNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (parallelNode != null)
        {
            var allBranches = definition.Graph.Edges.Where(e => e.Target == nodeId).Select(e => e.Source).ToList();

            var completedBranches = instance.GetParallelBranches(nodeId);
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
    public async Task<bool> ProcessConditionAsync(string instanceId, string nodeId, Dictionary<string, object?> variables)
    {
        var instance = await _instanceFactory.GetByIdAsync(instanceId);
        if (instance == null || instance.Status != WorkflowStatus.Running) return false;

        await _instanceFactory.UpdateAsync(instanceId, i =>
        {
            foreach (var v in variables) i.SetVariable(v.Key, v.Value);
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
        if (node.Data.Config.Http == null || string.IsNullOrWhiteSpace(node.Data.Config.Http.Url))
        {
            await MoveToNextNodeAsync(instanceId, node.Id);
            return;
        }

        try
        {
            var config = node.Data.Config.Http;
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

            if (config.Headers != null && config.Headers.Count > 0)
            {
                try
                {
                    foreach (var header in config.Headers)
                    {
                        requestMessage.Headers.TryAddWithoutValidation(header.Key, header.Value);
                    }
                }
                catch { /* 忽略头解析错误 */ }
            }

            using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(10));
            var response = await _sharedHttpClient.SendAsync(requestMessage, cts.Token);
            var responseContent = await response.Content.ReadAsStringAsync(cts.Token);

            if (!string.IsNullOrWhiteSpace(config.OutputVariable))
            {
                await _instanceFactory.UpdateAsync(instanceId, i =>
                {
                    i.SetVariable(config.OutputVariable, responseContent);
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
        if (node.Data.Config.Timer == null || string.IsNullOrWhiteSpace(node.Data.Config.Timer.WaitDuration))
        {
            await MoveToNextNodeAsync(instanceId, node.Id);
            return;
        }

        if (TimeSpan.TryParse(node.Data.Config.Timer.WaitDuration, out var delay))
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

                using var scope = _scopeFactory.CreateScope();
                var scopedInstanceFactory = scope.ServiceProvider.GetRequiredService<IDataFactory<WorkflowInstance>>();
                var scopedEngine = scope.ServiceProvider.GetRequiredService<IWorkflowEngine>();

                await scopedInstanceFactory.UpdateAsync(instanceId, i => i.Status = WorkflowStatus.Running);
                await scopedEngine.ProceedAsync(instanceId, node.Id);
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
        if (node.Data.Config.Variable == null || string.IsNullOrWhiteSpace(node.Data.Config.Variable.Name))
        {
            await MoveToNextNodeAsync(instanceId, node.Id);
            return;
        }

        try
        {
            var config = node.Data.Config.Variable;
            var variables = await GetDocumentVariablesAsync(instanceId);
            var val = config.Value ?? string.Empty;

            foreach (var v in variables)
            {
                val = val.Replace($"{{{v.Key}}}", v.Value?.ToString());
            }

            await _instanceFactory.UpdateAsync(instanceId, i =>
            {
                i.SetVariable(config.Name, val);
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
        if (node.Data.Config.Log != null && !string.IsNullOrWhiteSpace(node.Data.Config.Log.Message))
        {
            var variables = await GetDocumentVariablesAsync(instanceId);
            var msg = node.Data.Config.Log.Message;
            foreach (var v in variables)
            {
                msg = msg.Replace($"{{{v.Key}}}", v.Value?.ToString());
            }

            switch (node.Data.Config.Log.Level?.ToLower())
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
    /// 处理 AI 判断节点 - 使用 Microsoft.Agents.AI 优化
    /// </summary>
    private async Task ProcessAiJudgeNodeAsync(string instanceId, WorkflowNode node)
    {
        if (node.Data.Config.AiJudge == null || _openAiClient == null)
        {
            await MoveToNextNodeAsync(instanceId, node.Id);
            return;
        }

        try
        {
            var config = node.Data.Config.AiJudge;
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

            var chatClient = _openAiClient.GetChatClient(config.Model ?? "gpt-4o-mini");
            var systemPrompt = config.SystemPrompt ?? "你是一个逻辑判断引擎。根据用户的描述判断真假，且只允许输出 'true' 或 'false'。不要输出任何其他字符。";

            _logger.LogInformation("DEBUG_AI: Executing AI Judge Node {NodeId}", node.Id);
            
            var messages = new List<OpenAI.Chat.ChatMessage>
            {
                OpenAI.Chat.ChatMessage.CreateSystemMessage(systemPrompt),
                OpenAI.Chat.ChatMessage.CreateUserMessage(prompt)
            };

            var response = await chatClient.CompleteChatAsync(messages);
            var result = response.Value.Content[0].Text.Trim().ToLower();

            var finalResult = (result.Contains("true") && !result.Contains("false")) ? "true" : "false";

            await _instanceFactory.UpdateAsync(instanceId, i => i.SetVariable(config.OutputVariable, finalResult));
            await MoveToNextNodeAsync(instanceId, node.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI 判断节点执行失败(Agent框架): InstanceId={InstanceId}, NodeId={NodeId}", instanceId, node.Id);
            await _instanceFactory.UpdateAsync(instanceId, i => i.SetVariable(node.Data.Config.AiJudge.OutputVariable, "false"));
            await MoveToNextNodeAsync(instanceId, node.Id);
        }
    }

    /// <summary>
    /// 使用执行器处理节点逻辑 (统一入口)
    /// </summary>
    private async Task ProcessNodeViaExecutorAsync(string instanceId, WorkflowNode node)
    {
        try
        {
            var executor = await CreateExecutorForNodeAsync(instanceId, node);
            var variables = await GetDocumentVariablesAsync(instanceId);
            
            // 构造输入 (简单起见传递所有变量)
            var input = System.Text.Json.JsonSerializer.Serialize(variables);

            // 获取 HandleAsync 方法并调用 (采用反射适配不同的返回值类型)
            var handleMethod = executor.GetType().GetMethod("HandleAsync", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            if (handleMethod == null)
            {
                await MoveToNextNodeAsync(instanceId, node.Id);
                return;
            }

            // 构造参数: input, context, cancellationToken
            var task = (Task)handleMethod.Invoke(executor, new object?[] { input, null, default(CancellationToken) })!;
            await task;

            // 获取结果
            var resultProperty = task.GetType().GetProperty("Result");
            var result = resultProperty?.GetValue(task);

            // 更新输出变量
            await UpdateNodeOutputVariablesAsync(instanceId, node, result);

            await MoveToNextNodeAsync(instanceId, node.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "执行器节点处理失败: NodeId={NodeId}, InstanceId={InstanceId}", node.Id, instanceId);
            await MoveToNextNodeAsync(instanceId, node.Id);
        }
    }

    private async Task UpdateNodeOutputVariablesAsync(string instanceId, WorkflowNode node, object? result)
    {
        if (result == null) return;

        string? outputVar = null;
        switch (node.Type)
        {
            case "ai": outputVar = node.Data.Config?.Ai?.OutputVariable; break;
            case "knowledgeSearch": outputVar = node.Data.Config?.Knowledge?.OutputVariable; break;
            case "code": outputVar = node.Data.Config?.Code?.OutputVariable; break;
            case "template": outputVar = node.Data.Config?.Template?.OutputVariable; break;
            case "variableAggregator": outputVar = node.Data.Config?.VariableAggregator?.OutputVariable; break;
            case "questionClassifier": outputVar = node.Data.Config?.QuestionClassifier?.OutputVariable; break;
            case "parameterExtractor": outputVar = node.Data.Config?.ParameterExtractor?.OutputVariable; break;
            case "iteration": outputVar = node.Data.Config?.Iteration?.OutputVariable; break;
            case "answer": outputVar = "last_answer"; break;
            case "tool": outputVar = node.Data.Config?.Tool?.OutputVariable; break;
            case "httpRequest": outputVar = node.Data.Config?.Http?.OutputVariable; break;
        }

        if (!string.IsNullOrEmpty(outputVar))
        {
            await _instanceFactory.UpdateAsync(instanceId, i => i.SetVariable(outputVar, result));
        }
    }

    private Task ProcessKnowledgeSearchNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
    private Task ProcessCodeNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
    private Task ProcessTemplateNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
    private Task ProcessVariableAggregatorNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
    private Task ProcessQuestionClassifierNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
    private Task ProcessParameterExtractorNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
    private Task ProcessIterationNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
    private Task ProcessAnswerNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
    private Task ProcessToolNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
}
