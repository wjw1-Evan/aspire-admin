using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Workflows.Core;

public interface IExecutor
{
    string NodeType { get; }
    Task<NodeExecutionResult> ExecuteAsync(Dictionary<string, object?> inputs, WorkflowExecutionContext context, CancellationToken cancellationToken = default);
}

public interface IExecutorRegistry
{
    void Register(string nodeType, IExecutor executor);
    IExecutor GetExecutor(string nodeType);
    IEnumerable<string> GetSupportedNodeTypes();
}

public class ExecutorRegistry : IExecutorRegistry
{
    private readonly Dictionary<string, IExecutor> _executors = new(StringComparer.OrdinalIgnoreCase);
    private readonly ILogger<ExecutorRegistry> _logger;

    public ExecutorRegistry(ILogger<ExecutorRegistry> logger)
    {
        _logger = logger;
    }

    public void Register(string nodeType, IExecutor executor)
    {
        _executors[nodeType] = executor;
        _logger.LogInformation("Registered executor for node type: {NodeType}", nodeType);
    }

    public IExecutor GetExecutor(string nodeType)
    {
        if (_executors.TryGetValue(nodeType, out var executor))
        {
            return executor;
        }
        throw new NotSupportedException($"Node type '{nodeType}' is not supported");
    }

    public IEnumerable<string> GetSupportedNodeTypes() => _executors.Keys;
}
