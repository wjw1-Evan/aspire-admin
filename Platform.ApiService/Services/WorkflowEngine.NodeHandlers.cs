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
            if (string.IsNullOrEmpty(edge.Source) || string.IsNullOrEmpty(edge.Target))
            {
                System.Console.WriteLine($"[WorkflowEngine] Warning: Edge missing source or target. EdgeID: {edge.Id}");
                continue;
            }

            if (nodeToExecutor.TryGetValue(edge.Source, out var source) && 
                nodeToExecutor.TryGetValue(edge.Target, out var target))
            {
                // System.Console.WriteLine($"[WorkflowEngine] Adding edge: {edge.Source} -> {edge.Target}");
                if (!string.IsNullOrEmpty(edge.Data?.Condition) && edge.Data.Condition != "default")
                {
                    // 添加带条件的边
                    builder.AddEdge<object>(source, target, condition: (msg) => 
                    {
                        return true; // 占位实现
                    });
                }
                else
                {
                    // 普通边
                    builder.AddEdge(source, target);
                }
            }
            else
            {
                System.Console.WriteLine($"[WorkflowEngine] ERROR: Could not find executor for source '{edge.Source}' or target '{edge.Target}'");
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
            case "retrieval":
            case "knowledge":
                var knowledgeConfig = ResolveKnowledgeConfig(node);
                if (knowledgeConfig == null) throw new InvalidOperationException($"Knowledge/Retrieval node {node.Id} missing config");
                return new KnowledgeSearchExecutor(_knowledgeService, knowledgeConfig);
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
            case "loop":
                if (node.Data.Config?.Iteration == null) throw new InvalidOperationException($"Loop node {node.Id} missing config");
                return new IterationExecutor(node.Data.Config.Iteration);
            case "answer":
                if (node.Data.Config?.Answer == null) throw new InvalidOperationException($"Answer node {node.Id} missing config");
                return new AnswerExecutor(node.Data.Config.Answer);
            case "tool":
                if (node.Data.Config?.Tool == null) throw new InvalidOperationException($"Tool node {node.Id} missing config");
                return new ToolExecutor(node.Data.Config.Tool);
            case "approval":
                if (node.Data.Config?.Approval == null) throw new InvalidOperationException($"Approval node {node.Id} missing config");
                return new ApprovalExecutor(node.Data.Config.Approval, _instanceFactory, _expressionEvaluator);
            case "speechToText":
                if (node.Data.Config?.SpeechToText == null) throw new InvalidOperationException($"STT node {node.Id} missing config");
                return new SpeechToTextExecutor(node.Data.Config.SpeechToText);
            case "textToSpeech":
                if (node.Data.Config?.TextToSpeech == null) throw new InvalidOperationException($"TTS node {node.Id} missing config");
                return new TextToSpeechExecutor(node.Data.Config.TextToSpeech);
            case "email":
                if (node.Data.Config?.Email == null) throw new InvalidOperationException($"Email node {node.Id} missing config");
                return new EmailExecutor(_emailService, node.Data.Config.Email);
            case "vision":
                if (node.Data.Config?.Vision == null) throw new InvalidOperationException($"Vision node {node.Id} missing config");
                var visionChatClient = _openAiClient.GetChatClient(node.Data.Config.Vision.Model ?? "gpt-4o-mini").AsIChatClient();
                var visionAgent = new ChatClientAgent(visionChatClient, "VisionAgent");
                return new VisionExecutor(visionAgent, node.Data.Config.Vision);
            case "condition":
            case "ifElse":
                if (node.Data.Config?.Condition == null) throw new InvalidOperationException($"Condition/IfElse node {node.Id} missing config");
                return new ConditionExecutor(node.Data.Config.Condition, _expressionEvaluator);
            case "log":
                return new LogExecutor(_logger as ILogger<LogExecutor> ?? throw new InvalidCastException(), node.Data.Config?.Log ?? new LogConfig());
            case "setVariable":
                return new SetVariableExecutor(node.Data.Config?.Variable ?? new VariableConfig());
            case "timer":
                return new TimerExecutor(node.Data.Config?.Timer ?? new TimerConfig());
            case "notification":
                return new NotificationExecutor(_notificationService, node.Data.Config?.Notification ?? new NotificationConfig());
            case "agent":
                if (node.Data.Config?.Agent == null) throw new InvalidOperationException($"Agent node {node.Id} missing config");
                var agentChatClient = _openAiClient.GetChatClient(node.Data.Config.Agent.Model ?? "gpt-4o-mini").AsIChatClient();
                var agentAgent = new ChatClientAgent(agentChatClient, "Agent");
                return new AiExecutor(agentAgent, MapAgentToAiConfig(node.Data.Config.Agent));
            case "variableAssigner":
                if (node.Data.Config?.VariableAssigner == null) throw new InvalidOperationException($"VariableAssigner node {node.Id} missing config");
                return new VariableAssignerExecutor(node.Data.Config.VariableAssigner);
            case "listOperator":
                if (node.Data.Config?.ListOperator == null) throw new InvalidOperationException($"ListOperator node {node.Id} missing config");
                return new ListOperatorExecutor(node.Data.Config.ListOperator);
            case "documentExtractor":
                if (node.Data.Config?.DocumentExtractor == null) throw new InvalidOperationException($"DocumentExtractor node {node.Id} missing config");
                return new DocumentExtractorExecutor(node.Data.Config.DocumentExtractor);
            case "humanInput":
                if (node.Data.Config?.HumanInput == null) throw new InvalidOperationException($"HumanInput node {node.Id} missing config");
                return new HumanInputExecutor(node.Data.Config.HumanInput);
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
            case "parallel":
                // Bug 7 修复：并行网关不覆盖 CurrentNodeId，而是为每个分支独立处理
                await ProcessParallelGatewayAsync(instanceId, nodeId, definition);
                break;
            case "condition":
            case "ifElse":
            case "approval":
            case "ai":
            case "llm":
            case "agent":
            case "aiJudge":
            case "notification":
            case "httpRequest":
            case "timer":
            case "setVariable":
            case "log":
            case "knowledgeSearch":
            case "retrieval":
            case "knowledge":
            case "code":
            case "template":
            case "variableAggregator":
            case "questionClassifier":
            case "parameterExtractor":
            case "iteration":
            case "loop":
            case "answer":
            case "variableAssigner":
            case "listOperator":
            case "documentExtractor":
            case "humanInput":
            case "tool":
            case "speechToText":
            case "textToSpeech":
            case "email":
            case "vision":
                await ProcessNodeViaExecutorAsync(instanceId, node);
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
            var filteredEdges = outgoingEdges.Where(e => e.SourceHandle == sourceHandle).ToList();
            if (filteredEdges.Any())
            {
                outgoingEdges = filteredEdges;
            }
            else
            {
                // 特殊逻辑：如果是 condition 节点且返回了 "true"/"false" 字符串，尝试匹配 Handle
                var handleEdges = outgoingEdges.Where(e => e.SourceHandle == sourceHandle).ToList();
                if (handleEdges.Any())
                {
                    outgoingEdges = handleEdges;
                }
                else
                {
                    _logger.LogWarning("节点 {NodeId} 返回了句柄 {Handle}，但未找到匹配的出边", currentNodeId, sourceHandle);
                }
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
            var nextNode = definition.Graph.Nodes.FirstOrDefault(n => n.Id == nextNodeId);

            if (nextNode != null && nextNode.Type == "parallel")
            {
                var incomingEdges = definition.Graph.Edges.Where(e => e.Target == nextNodeId).ToList();
                if (incomingEdges.Count > 1)
                {
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
    /// 使用执行器处理节点逻辑 (统一入口)
    /// </summary>
    private async Task ProcessNodeViaExecutorAsync(string instanceId, WorkflowNode node)
    {
        try
        {
            _logger.LogInformation("EXEC_DEBUG: Node={NodeId} Type={Type} - 开始处理", node.Id, node.Type);
            var instance = await _instanceFactory.GetByIdAsync(instanceId);
            var definition = instance != null ? await _definitionFactory.GetByIdAsync(instance.WorkflowDefinitionId) : null;
            
            var variables = await GetDocumentVariablesAsync(instanceId);
            
            // 注入系统变量供执行器使用
            variables["__instanceId"] = instanceId;
            variables["__documentTitle"] = definition?.Name ?? "Untitled Document";

            _logger.LogInformation("EXEC_DEBUG: Node={NodeId} - 创建执行器", node.Id);
            var executor = await CreateExecutorForNodeAsync(instanceId, node);
            _logger.LogInformation("EXEC_DEBUG: Node={NodeId} - 执行器已创建: {ExecutorType}", node.Id, executor.GetType().Name);

            // 构造输入 (简单起见传递所有变量)
            var input = System.Text.Json.JsonSerializer.Serialize(variables);

            // 获取 HandleAsync 方法并调用 (采用反射适配不同的返回值类型)
            var handleMethod = executor.GetType().GetMethod("HandleAsync", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            if (handleMethod == null)
            {
                _logger.LogWarning("EXEC_DEBUG: Node={NodeId} - HandleAsync 未找到，跳过", node.Id);
                await MoveToNextNodeAsync(instanceId, node.Id);
                return;
            }

            // 构造参数: input, context, cancellationToken
            _logger.LogInformation("EXEC_DEBUG: Node={NodeId} - 调用 HandleAsync", node.Id);
            var invokeResult = handleMethod.Invoke(executor, new object?[] { input, null, default(CancellationToken) });
            if (invokeResult == null)
            {
                _logger.LogWarning("EXEC_DEBUG: Node={NodeId} - HandleAsync 返回 null", node.Id);
                await MoveToNextNodeAsync(instanceId, node.Id);
                return;
            }

            // 显式处理 Task/ValueTask 返回值，避免 dynamic await 对 ValueTask 的兼容性问题
            object? result = null;
            var resultType = invokeResult.GetType();
            _logger.LogInformation("EXEC_DEBUG: Node={NodeId} - 等待 HandleAsync 返回, InvokeResultType={Type}", node.Id, resultType.Name);
            try
            {
                if (invokeResult is Task task)
                {
                    await task;
                    var resultProperty = resultType.GetProperty("Result");
                    result = resultProperty?.GetValue(task);
                }
                else if (resultType.IsGenericType && resultType.GetGenericTypeDefinition().Name.StartsWith("ValueTask"))
                {
                    var asTaskMethod = resultType.GetMethod("AsTask", Type.EmptyTypes);
                    if (asTaskMethod != null)
                    {
                        var taskObj = asTaskMethod.Invoke(invokeResult, null);
                        if (taskObj is Task t)
                        {
                            await t;
                            result = t.GetType().GetProperty("Result")?.GetValue(t);
                        }
                    }
                }
                else
                {
                    result = await (dynamic)invokeResult;
                }
                _logger.LogInformation("EXEC_DEBUG: Node={NodeId} - HandleAsync 已返回", node.Id);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "执行器 HandleAsync 等待失败: NodeId={NodeId}, Type={Type}", node.Id, resultType.Name);
            }

            // 更新输出变量
            _logger.LogInformation("EXEC_DEBUG: Node={NodeId} - 更新输出变量", node.Id);
            await UpdateNodeOutputVariablesAsync(instanceId, node, result);

            // 确定 sourceHandle (对于分类器等节点)
            string? sourceHandle = null;
            if (result is Dictionary<string, object?> dict && dict.TryGetValue("__sourceHandle", out var handle))
            {
                sourceHandle = handle?.ToString();
                
                // 处理审批通知触发
                if (dict.ContainsKey("__trigger_notifications"))
                {
                    await SendApprovalNotificationsAsync(instanceId, node);
                }
            }
            else if (node.Type == "questionClassifier" || node.Type == "condition")
            {
                sourceHandle = result?.ToString();
            }
            else if (node.Type == "iteration")
            {
                if (result is string s && (s == "loop" || s == "done"))
                {
                    sourceHandle = s;
                }
            }

            if (sourceHandle == "waiting")
            {
                // 处理等待逻辑
                if (result is Dictionary<string, object?> resDict && resDict.TryGetValue("waitDuration", out var durationObj) && durationObj is string durationStr && TimeSpan.TryParse(durationStr, out var delay))
                {
                    await _instanceFactory.UpdateAsync(instanceId, i => i.Status = WorkflowStatus.Waiting);

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
                    // 人工审批或无限期等待：设置状态为 Waiting 并停止后续 MoveToNextNode
                    await _instanceFactory.UpdateAsync(instanceId, i => i.Status = WorkflowStatus.Waiting);
                }
                return; // 挂起，不继续执行
            }

            _logger.LogInformation("EXEC_DEBUG: Node={NodeId} - 调用 MoveToNextNodeAsync sourceHandle={Handle}", node.Id, sourceHandle ?? "(null)");
            await MoveToNextNodeAsync(instanceId, node.Id, sourceHandle);
            _logger.LogInformation("EXEC_DEBUG: Node={NodeId} - ProcessNodeViaExecutorAsync 完成", node.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "执行器节点处理失败: NodeId={NodeId}, InstanceId={InstanceId}", node.Id, instanceId);
            
            // 记录错误到节点输出
            await _instanceFactory.UpdateAsync(instanceId, i => 
            {
                i.SetVariable($"nodes.{node.Id}.error", ex.Message);
                i.SetVariable($"nodes.{node.Id}.status", "failed");
            });

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
            case "llm": outputVar = node.Data.Config?.Ai?.OutputVariable; break;
            case "aiJudge": outputVar = node.Data.Config?.AiJudge?.OutputVariable; break;
            case "knowledgeSearch":
            case "retrieval":
            case "knowledge":
                outputVar = node.Data.Config?.Knowledge?.OutputVariable ?? node.Data.Config?.Retrieval?.OutputVariable ?? "retrieved_documents";
                break;
            case "code": outputVar = node.Data.Config?.Code?.OutputVariable; break;
            case "template": outputVar = node.Data.Config?.Template?.OutputVariable; break;
            case "variableAggregator": outputVar = node.Data.Config?.VariableAggregator?.OutputVariable; break;
            case "questionClassifier": outputVar = node.Data.Config?.QuestionClassifier?.OutputVariable; break;
            case "parameterExtractor": outputVar = node.Data.Config?.ParameterExtractor?.OutputVariable; break;
            case "iteration":
            case "loop": outputVar = node.Data.Config?.Iteration?.OutputVariable; break;
            case "answer": outputVar = "last_answer"; break;
            case "variableAssigner": outputVar = node.Data.Config?.VariableAssigner?.OutputVariable; break;
            case "listOperator": outputVar = node.Data.Config?.ListOperator?.OutputVariable; break;
            case "documentExtractor": outputVar = node.Data.Config?.DocumentExtractor?.OutputVariable; break;
            case "tool": outputVar = node.Data.Config?.Tool?.OutputVariable; break;
            case "httpRequest": outputVar = node.Data.Config?.Http?.OutputVariable; break;
            case "speechToText": outputVar = node.Data.Config?.SpeechToText?.OutputVariable; break;
            case "textToSpeech": outputVar = node.Data.Config?.TextToSpeech?.OutputVariable; break;
            case "vision": outputVar = node.Data.Config?.Vision?.OutputVariable; break;
            case "agent": outputVar = node.Data.Config?.Agent?.OutputVariable; break;
            case "email": outputVar = "email_result"; break;
            case "notification": outputVar = "notification_result"; break;
            case "setVariable": outputVar = node.Data.Config?.Variable?.Name; break;
            case "log": outputVar = "log_result"; break;
            case "timer": outputVar = "timer_result"; break;
        }

        if (!string.IsNullOrEmpty(outputVar))
        {
            await _instanceFactory.UpdateAsync(instanceId, i => 
            {
                i.SetVariable(outputVar, result);
                i.SetVariable("last_node_result", result); // 为 Iteration 节点记录最后结果
                
                // 标准化路径存储: nodes.{nodeId}.output
                i.SetVariable($"nodes.{node.Id}.output", result);
            });
        }
        else
        {
            await _instanceFactory.UpdateAsync(instanceId, i => 
            {
                i.SetVariable("last_node_result", result);
                i.SetVariable($"nodes.{node.Id}.output", result);
            });
        }

        // 如果结果是字典（如 ParameterExtractor），则解构存储到 nodes.{nodeId}.{key}
        if (result is Dictionary<string, object?> dict)
        {
            await _instanceFactory.UpdateAsync(instanceId, i => 
            {
                foreach (var kv in dict)
                {
                    if (kv.Key.StartsWith("__")) continue; // 跳过系统变量
                    i.SetVariable($"nodes.{node.Id}.{kv.Key}", kv.Value);
                }
            });

            // 如果结果中包含 __variables__，则合并到全局变量
            if (dict.TryGetValue("__variables__", out var varsObj) && varsObj is Dictionary<string, object?> extraVars)
            {
                await _instanceFactory.UpdateAsync(instanceId, i => 
                {
                    foreach (var kv in extraVars)
                    {
                        i.SetVariable(kv.Key, kv.Value);
                    }
                });
            }
        }
    }

    private Task ProcessKnowledgeSearchNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
    private Task ProcessCodeNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
    private Task ProcessTemplateNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
    private Task ProcessVariableAggregatorNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
    private Task ProcessQuestionClassifierNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
    private Task ProcessParameterExtractorNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
    private Task ProcessToolNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
    private Task ProcessSpeechToTextNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
    private Task ProcessTextToSpeechNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
    private Task ProcessEmailNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
    private Task ProcessVisionNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
    private Task ProcessAnswerNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);
    private Task ProcessIterationNodeAsync(string instanceId, WorkflowNode node) => ProcessNodeViaExecutorAsync(instanceId, node);

    /// <summary>
    /// 将 retrieval/knowledge 配置统一为 KnowledgeConfig，供 KnowledgeSearchExecutor 使用
    /// </summary>
    private static KnowledgeConfig? ResolveKnowledgeConfig(WorkflowNode node)
    {
        if (node.Data.Config?.Knowledge != null) return node.Data.Config.Knowledge;
        if (node.Data.Config?.Retrieval != null)
        {
            var r = node.Data.Config.Retrieval;
            return new KnowledgeConfig
            {
                Query = r.Query,
                TopK = r.TopK,
                ScoreThreshold = r.ScoreThreshold,
                OutputVariable = r.OutputVariable ?? "retrieved_documents",
                KnowledgeBaseIds = string.IsNullOrEmpty(r.KnowledgeBaseId) ? new List<string>() : new List<string> { r.KnowledgeBaseId }
            };
        }
        return null;
    }

    /// <summary>
    /// 将 AgentConfig 映射为 AiConfig，供 AiExecutor 使用
    /// </summary>
    private static AiConfig MapAgentToAiConfig(AgentConfig a)
    {
        return new AiConfig
        {
            Model = a.Model,
            SystemPrompt = a.SystemPrompt,
            OutputVariable = a.OutputVariable ?? "agent_result",
            MaxTokens = a.MaxTokens,
            Temperature = a.Temperature
        };
    }
}
