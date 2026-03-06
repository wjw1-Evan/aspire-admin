using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Services;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 知识库检索执行器 - RAG 实现
/// </summary>
internal sealed partial class KnowledgeSearchExecutor : Executor
{
    private readonly IKnowledgeService _knowledgeService;
    private readonly KnowledgeConfig _config;

    public KnowledgeSearchExecutor(IKnowledgeService knowledgeService, KnowledgeConfig config) : base("KnowledgeSearchExecutor")
    {
        _knowledgeService = knowledgeService;
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder)
    {
        return builder;
    }

    [MessageHandler]
    private async ValueTask<string> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        // 反序列化变量
        var variables = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();

        // 1. 获取查询关键词 (解析变量)
        var query = Utilities.DifyVariableResolver.Resolve(_config.Query ?? string.Empty, variables);
        if (string.IsNullOrEmpty(query))
        {
            query = input; // 回退到原始输入
        }

        // 2. 执行检索
        var snippets = await _knowledgeService.SearchAsync(query, _config.KnowledgeBaseIds, _config.TopK);

        // 3. 结果合并为文本块供下游 AI 节点使用
        var contextText = string.Join("\n\n", snippets.Select(s => $"Source: {s.Source}\nContent: {s.Content}"));

        return contextText;
    }
}
