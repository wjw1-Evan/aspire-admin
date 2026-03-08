using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Workflows.Utilities;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 文档提取器执行器 - 从变量中的文档/对象提取指定字段
/// </summary>
internal sealed partial class DocumentExtractorExecutor : Executor
{
    private readonly DocumentExtractorConfig _config;

    public DocumentExtractorExecutor(DocumentExtractorConfig config) : base("DocumentExtractorExecutor")
    {
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder) => builder;

    [MessageHandler]
    private async ValueTask<Dictionary<string, object?>> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        var variables = JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();
        var sourceVar = _config.Variable ?? "document";
        var source = DifyVariableResolver.GetValueByPath(sourceVar, variables);

        var extracted = new Dictionary<string, object?>();

        if (source != null && (_config.Extractions?.Any() ?? false))
        {
            var sourceDict = ToDictionary(source);

            foreach (var rule in _config.Extractions)
            {
                var field = rule.Field;
                object? val = null;
                if (sourceDict != null && sourceDict.TryGetValue(field, out var v))
                    val = v;
                else if (source is JsonElement je && je.TryGetProperty(field, out var prop))
                    val = JsonSerializer.Deserialize<object>(prop.GetRawText());
                extracted[field] = val;
            }
        }

        var outputVar = _config.OutputVariable ?? "extracted_data";
        await Task.CompletedTask;

        return new Dictionary<string, object?>
        {
            ["result"] = extracted,
            ["__variables__"] = new Dictionary<string, object?> { [outputVar] = extracted }
        };
    }

    private static Dictionary<string, object?>? ToDictionary(object? obj)
    {
        if (obj == null) return null;
        if (obj is Dictionary<string, object?> d) return d;
        if (obj is JsonElement je && je.ValueKind == JsonValueKind.Object)
        {
            var dict = new Dictionary<string, object?>();
            foreach (var p in je.EnumerateObject())
                dict[p.Name] = JsonSerializer.Deserialize<object>(p.Value.GetRawText());
            return dict;
        }
        return null;
    }
}
