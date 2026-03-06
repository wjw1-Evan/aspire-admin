using Microsoft.Agents.AI.Workflows;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Workflows.Utilities;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 日志执行器 - 支持在工作流控制台中打印调试信息
/// </summary>
internal sealed partial class LogExecutor : Executor
{
    private readonly ILogger<LogExecutor> _logger;
    private readonly LogConfig _config;

    public LogExecutor(ILogger<LogExecutor> logger, LogConfig config) : base("LogExecutor")
    {
        _logger = logger;
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder) => builder;

    [MessageHandler]
    private async ValueTask<object?> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        var variables = JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();

        var message = DifyVariableResolver.Resolve(_config.Message ?? string.Empty, variables);
        
        switch (_config.Level?.ToLower())
        {
            case "warning": _logger.LogWarning("Workflow Execution Log: {Message}", message); break;
            case "error": _logger.LogError("Workflow Execution Log: {Message}", message); break;
            case "debug": _logger.LogDebug("Workflow Execution Log: {Message}", message); break;
            default: _logger.LogInformation("Workflow Execution Log: {Message}", message); break;
        }

        await Task.CompletedTask;
        return new Dictionary<string, object?>
        {
            ["log_result"] = message,
            ["level"] = _config.Level ?? "info"
        };
    }
}
