using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using OpenAI;
using OpenAI.Chat;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using System.Linq;
using System.Text;
using System.Text.Json;

using ChatMessage = OpenAI.Chat.ChatMessage;
using AssistantChatMessage = OpenAI.Chat.AssistantChatMessage;

namespace Platform.ApiService.Services;

/// <summary>
/// AI 智能体编排引擎
/// 实现 ReAct (Thought -> Action -> Observation) 循环。
/// </summary>
public class AiAgentOrchestrator : IAiAgentOrchestrator
{
    private readonly OpenAIClient _openAiClient;
    private readonly IMcpService _mcpService;
    private readonly IDataFactory<AiAgent> _agentFactory;
    private readonly IDataFactory<AiAgentRun> _runFactory;
    private readonly IDataFactory<UserMemory> _memoryFactory;
    private readonly IChatSseConnectionManager _sseManager;
    private readonly ILogger<AiAgentOrchestrator> _logger;

    /// <summary>
    /// 初始化智能体编排引擎
    /// </summary>
    public AiAgentOrchestrator(
        OpenAIClient openAiClient,
        IMcpService mcpService,
        IDataFactory<AiAgent> agentFactory,
        IDataFactory<AiAgentRun> runFactory,
        IDataFactory<UserMemory> memoryFactory,
        IChatSseConnectionManager sseManager,
        ILogger<AiAgentOrchestrator> logger)
    {
        _openAiClient = openAiClient;
        _mcpService = mcpService;
        _agentFactory = agentFactory;
        _runFactory = runFactory;
        _memoryFactory = memoryFactory;
        _sseManager = sseManager;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task ExecuteRunAsync(string runId, string userId, string? sessionId = null)
    {
        var run = await _runFactory.GetByIdAsync(runId);
        if (run == null) return;

        var agent = await _agentFactory.GetByIdAsync(run.AgentId);
        if (agent == null)
        {
            await FailRunAsync(run, "未找到关联的智能体", userId, sessionId);
            return;
        }

        try
        {
            run.Status = AiAgentRunStatus.Executing;
            await _runFactory.UpdateAsync(run.Id, r => r.Status = AiAgentRunStatus.Executing);

            // 获取特定模型的 ChatClient
            var chatClient = _openAiClient.GetChatClient(agent.Model ?? "gpt-4-turbo");

            // 1. 获取所有可用工具的描述
            var toolsResponse = await _mcpService.ListToolsAsync();
            var allowedTools = toolsResponse.Tools.Where(t => agent.AllowedSkills.Contains(t.Name)).ToList();

            // 2. 构造基础 Prompt
            var promptBuilder = new StringBuilder();
            promptBuilder.AppendLine(agent.Persona);
            promptBuilder.AppendLine("\n你现在作为一个自主智能体工作。你可以调用以下工具来完成任务：");
            foreach (var tool in allowedTools)
            {
                promptBuilder.AppendLine($"- {tool.Name}: {tool.Description}");
            }

            promptBuilder.AppendLine("\n使用以下格式进行回复：");
            promptBuilder.AppendLine("Thought: 你应该总是思考下一步要做什么");
            promptBuilder.AppendLine("Action: 要采取的操作，必须是工具名称之一");
            promptBuilder.AppendLine("Action Input: 执行操作所需的参数 (JSON 格式)");
            promptBuilder.AppendLine("Observation: 操作的结果 (你会收到这个)");
            promptBuilder.AppendLine("... (以上 Thought/Action/Observation 可以重复)");
            promptBuilder.AppendLine("Thought: 我现在知道最终答案了");
            promptBuilder.AppendLine("Final Answer: 对原始指令的最终回答摘要");

            // 3. 注入记忆
            var memories = await _memoryFactory.FindAsync(m => m.UserId == userId, q => q.OrderByDescending(m => m.Importance), 10);
            if (memories.Any())
            {
                promptBuilder.AppendLine("\n有关用户的额外背景信息（长期记忆）：");
                foreach (var m in memories) promptBuilder.AppendLine($"- [{m.Category}] {m.Content}");
            }

            promptBuilder.AppendLine($"\n当前任务指令: {run.Goal}");

            // 4. 开始多步推理循环
            int maxSteps = 10;
            var history = new List<ChatMessage> { new SystemChatMessage(promptBuilder.ToString()) };

            for (int step = 0; step < maxSteps; step++)
            {
                var completion = await chatClient.CompleteChatAsync(history);
                var rawResponse = completion.Value.Content[0].Text;

                await LogStepAsync(run, "Thought", rawResponse, userId, sessionId);

                // 解析 Action
                if (TryParseAction(rawResponse, out var actionName, out var actionInput))
                {
                    await LogStepAsync(run, "Action", $"{actionName}({actionInput})", userId, sessionId);

                    var mcpArgs = string.IsNullOrWhiteSpace(actionInput)
                        ? new Dictionary<string, object>()
                        : JsonSerializer.Deserialize<Dictionary<string, object>>(actionInput) ?? new();

                    var toolResult = await _mcpService.CallToolAsync(new McpCallToolRequest { Name = actionName, Arguments = mcpArgs }, userId);
                    var observationText = toolResult.IsError ? $"Error: {toolResult.Content[0].Text}" : toolResult.Content[0].Text ?? "Success";

                    await LogStepAsync(run, "Observation", observationText, userId, sessionId);
                    history.Add(new AssistantChatMessage(rawResponse));
                    history.Add(new UserChatMessage($"Observation: {observationText}"));
                }
                else if (rawResponse.Contains("Final Answer:"))
                {
                    var finalAnswer = ExtractFinalAnswer(rawResponse);
                    await _runFactory.UpdateAsync(run.Id, r =>
                    {
                        r.FinalOutput = finalAnswer;
                        r.Status = AiAgentRunStatus.Finished;
                    });

                    // 广播完成消息
                    var finishUpdate = new { type = "agent_finished", runId = run.Id, output = finalAnswer };
                    await _sseManager.SendToUserAsync(userId, $"data: {JsonSerializer.Serialize(finishUpdate)}\n\n");

                    if (!string.IsNullOrEmpty(sessionId))
                    {
                        var chatUpdate = new { sessionId, type = "agent_complete", output = finalAnswer };
                        await _sseManager.SendToUserAsync(userId, $"event: MessageChunk\ndata: {JsonSerializer.Serialize(chatUpdate)}\n\n");
                    }
                    return;
                }
                else
                {
                    // 无法解析，强制 LLM 继续
                    history.Add(new AssistantChatMessage(rawResponse));
                    history.Add(new UserChatMessage("请继续按照 Thought/Action/Observation 格式执行，如果已完成请输出 Final Answer。"));
                }
            }

            await FailRunAsync(run, "执行步骤超过上限", userId, sessionId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Agent Run 执行失败");
            await FailRunAsync(run, ex.Message, userId, sessionId);
        }
    }

    private bool TryParseAction(string text, out string action, out string input)
    {
        action = string.Empty;
        input = string.Empty;

        var actionMatch = System.Text.RegularExpressions.Regex.Match(text, @"Action:\s*(.*)");
        var inputMatch = System.Text.RegularExpressions.Regex.Match(text, @"Action Input:\s*(.*)");

        if (actionMatch.Success)
        {
            action = actionMatch.Groups[1].Value.Trim();
            if (inputMatch.Success) input = inputMatch.Groups[1].Value.Trim();
            return true;
        }
        return false;
    }

    private string ExtractFinalAnswer(string text)
    {
        var match = System.Text.RegularExpressions.Regex.Match(text, @"Final Answer:\s*(.*)", System.Text.RegularExpressions.RegexOptions.Singleline);
        return match.Success ? match.Groups[1].Value.Trim() : text;
    }

    private async Task LogStepAsync(AiAgentRun run, string type, string content, string userId, string? sessionId)
    {
        var stepLog = new AiAgentStepLog { Type = type, Content = content, Timestamp = DateTime.UtcNow };
        run.Logs.Add(stepLog);
        await _runFactory.UpdateAsync(run.Id, r => r.Logs.Add(stepLog));

        // 实时广播给前端 (智能体专用 Channel)
        var agentUpdate = new { type = "agent_update", runId = run.Id, stepType = type, content = content };
        await _sseManager.SendToUserAsync(userId, $"data: {JsonSerializer.Serialize(agentUpdate)}\n\n");

        // 如果关联了聊天会话，也广播到会话中 (Xiaoke 专用 Channel)
        if (!string.IsNullOrEmpty(sessionId))
        {
            var chatUpdate = new { sessionId, stepType = type, content, type = "agent_track" };
            await _sseManager.SendToUserAsync(userId, $"event: MessageChunk\ndata: {JsonSerializer.Serialize(chatUpdate)}\n\n");
        }
    }

    private async Task FailRunAsync(AiAgentRun run, string error, string userId, string? sessionId)
    {
        await _runFactory.UpdateAsync(run.Id, r =>
        {
            r.Status = AiAgentRunStatus.Failed;
            r.ErrorMessage = error;
        });

        var agentUpdate = new { type = "agent_error", runId = run.Id, error = error };
        await _sseManager.SendToUserAsync(userId, $"data: {JsonSerializer.Serialize(agentUpdate)}\n\n");

        if (!string.IsNullOrEmpty(sessionId))
        {
            var chatUpdate = new { sessionId, error, type = "agent_failed" };
            await _sseManager.SendToUserAsync(userId, $"event: MessageChunk\ndata: {JsonSerializer.Serialize(chatUpdate)}\n\n");
        }
    }
}
