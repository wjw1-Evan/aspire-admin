using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Workflows.Events;

namespace Platform.ApiService.Workflows.Core;

public interface IGraphEngine
{
    Task<WorkflowExecutionContext> ExecuteAsync(WorkflowExecutionContext context, CancellationToken cancellationToken = default);
    Task<WorkflowExecutionContext?> ResumeAsync(string executionId, Dictionary<string, object>? inputs = null, CancellationToken cancellationToken = default);
    Task<bool> PauseAsync(string executionId, string? nodeId = null);
    Task<bool> StopAsync(string executionId);
    Task<WorkflowExecutionContext?> GetExecutionAsync(string executionId);
}

public class GraphEngine : IGraphEngine
{
    private readonly ILogger<GraphEngine> _logger;
    private readonly IExecutorRegistry _executorRegistry;
    private readonly IStateManager _stateManager;
    private readonly IEventBus _eventBus;
    private readonly ICheckpointStore _checkpointStore;
    private readonly IWorkerPool _workerPool;
    private readonly ConcurrentDictionary<string, WorkflowExecutionContext> _activeExecutions = new();

    public GraphEngine(
        ILogger<GraphEngine> logger,
        IExecutorRegistry executorRegistry,
        IStateManager stateManager,
        IEventBus eventBus,
        ICheckpointStore checkpointStore,
        IWorkerPool workerPool)
    {
        _logger = logger;
        _executorRegistry = executorRegistry;
        _stateManager = stateManager;
        _eventBus = eventBus;
        _checkpointStore =checkpointStore;
        _workerPool = workerPool;
    }

    public async Task<WorkflowExecutionContext> ExecuteAsync(WorkflowExecutionContext context, CancellationToken cancellationToken = default)
    {
        _activeExecutions[context.ExecutionId] = context;
        
        try
        {
            await _eventBus.PublishAsync(new WorkflowRunStartedEvent
            {
                ExecutionId = context.ExecutionId,
                WorkflowId = context.WorkflowDefinitionId,
                StartTime = DateTime.UtcNow
            });

            while (context.Status == ExecutionStatus.Running)
            {
                context = await ExecuteSuperstepAsync(context, cancellationToken);
                
                if (cancellationToken.IsCancellationRequested)
                {
                    context.Status = ExecutionStatus.Cancelled;
                    break;
                }
            }

            await _eventBus.PublishAsync(new WorkflowRunCompletedEvent
            {
                ExecutionId = context.ExecutionId,
                EndTime = DateTime.UtcNow,
                Status = context.Status,
                Outputs = context.Outputs
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Workflow execution failed: {ExecutionId}", context.ExecutionId);
            context.Status = ExecutionStatus.Failed;
            context.Error = ex.Message;

            await _eventBus.PublishAsync(new WorkflowRunFailedEvent
            {
                ExecutionId = context.ExecutionId,
                Error = ex.Message,
                FailedNodeId = context.CurrentNodeId
            });
        }
        finally
        {
            _activeExecutions.TryRemove(context.ExecutionId, out _);
            await _checkpointStore.SaveAsync(context);
        }

        return context;
    }

    private async Task<WorkflowExecutionContext> ExecuteSuperstepAsync(WorkflowExecutionContext context, CancellationToken cancellationToken)
    {
        context.Superstep++;
        _logger.LogDebug("Executing superstep {Superstep} for execution {ExecutionId}", context.Superstep, context.ExecutionId);

        var runnableNodes = GetRunnableNodes(context);
        
        if (runnableNodes.Count == 0)
        {
            if (IsGraphComplete(context))
            {
                context.Status = ExecutionStatus.Completed;
            }
            else
            {
                context.Status = ExecutionStatus.Paused;
            }
            return context;
        }

        await _eventBus.PublishAsync(new SuperstepStartedEvent
        {
            ExecutionId = context.ExecutionId,
            Superstep = context.Superstep,
            RunnableNodes = runnableNodes
        });

        var parallelTasks = runnableNodes.Select(node => ExecuteNodeAsync(context, node, cancellationToken));
        var results = await Task.WhenAll(parallelTasks);

        foreach (var result in results)
        {
            context = MergeExecutionContext(context, result);
        }

        await _checkpointStore.SaveAsync(context);

        await _eventBus.PublishAsync(new SuperstepCompletedEvent
        {
            ExecutionId = context.ExecutionId,
            Superstep = context.Superstep,
            CompletedNodes = runnableNodes
        });

        return context;
    }

    private List<string> GetRunnableNodes(WorkflowExecutionContext context)
    {
        var runnableNodes = new List<string>();
        var completedNodes = context.CompletedNodes;
        var definition = context.WorkflowDefinition;

        foreach (var node in definition.Graph.Nodes)
        {
            if (completedNodes.Contains(node.Id)) continue;
            if (node.Data.IsDisabled) continue;

            var incomingEdges = definition.Graph.Edges
                .Where(e => e.Target == node.Id && e.SourceHandle == "source")
                .ToList();

            if (incomingEdges.All(e => completedNodes.Contains(e.Source)))
            {
                runnableNodes.Add(node.Id);
            }
        }

        return runnableNodes;
    }

    private bool IsGraphComplete(WorkflowExecutionContext context)
    {
        var endNodes = context.WorkflowDefinition.Graph.Nodes
            .Where(n => n.Data.NodeType == "end")
            .ToList();

        return endNodes.Any(n => context.CompletedNodes.Contains(n.Id));
    }

    private async Task<WorkflowExecutionContext> ExecuteNodeAsync(
        WorkflowExecutionContext context, 
        string nodeId, 
        CancellationToken cancellationToken)
    {
        var node = context.WorkflowDefinition.Graph.Nodes.FirstOrDefault(n => n.Id == nodeId);
        if (node == null) return context;

        _logger.LogInformation("Executing node {NodeId} ({NodeType})", nodeId, node.Data.NodeType);

        await _eventBus.PublishAsync(new NodeRunStartedEvent
        {
            ExecutionId = context.ExecutionId,
            NodeId = nodeId,
            NodeType = node.Data.NodeType,
            Inputs = context.Variables
        });

        var executor = _executorRegistry.GetExecutor(node.Data.NodeType);
        var nodeInputs = ResolveNodeInputs(context, node);

        try
        {
            var result = await executor.ExecuteAsync(nodeInputs, context, cancellationToken);

            context.NodeResults[nodeId] = result;
            context.CompletedNodes.Add(nodeId);
            context.Variables[result.OutputVariable] = result.Output;

            await _eventBus.PublishAsync(new NodeRunCompletedEvent
            {
                ExecutionId = context.ExecutionId,
                NodeId = nodeId,
                Output = result.Output,
                Duration = result.Duration
            });

            if (result.NeedsHumanInput)
            {
                context.Status = ExecutionStatus.WaitingForInput;
                context.PendingHumanInputNode = nodeId;
            }

            if (result.RetryCount > 0)
            {
                await _eventBus.PublishAsync(new NodeRetryEvent
                {
                    ExecutionId = context.ExecutionId,
                    NodeId = nodeId,
                    RetryCount = result.RetryCount
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Node execution failed: {NodeId}", nodeId);

            if (node.Data.Retry?.Enabled == true && node.Data.Retry.MaxAttempts > 0)
            {
                var currentRetry = context.NodeRetryCount.GetValueOrDefault(nodeId, 0);
                if (currentRetry < node.Data.Retry.MaxAttempts)
                {
                    context.NodeRetryCount[nodeId] = currentRetry + 1;
                    await Task.Delay(TimeSpan.FromSeconds(node.Data.Retry.Interval), cancellationToken);
                    return await ExecuteNodeAsync(context, nodeId, cancellationToken);
                }
            }

            await _eventBus.PublishAsync(new NodeRunFailedEvent
            {
                ExecutionId = context.ExecutionId,
                NodeId = nodeId,
                Error = ex.Message
            });

            context.Status = ExecutionStatus.Failed;
            context.Error = $"Node {nodeId} failed: {ex.Message}";
        }

        return context;
    }

    private Dictionary<string, object?> ResolveNodeInputs(WorkflowExecutionContext context, WorkflowNode node)
    {
        var inputs = new Dictionary<string, object?>();
        
        var incomingEdges = context.WorkflowDefinition.Graph.Edges
            .Where(e => e.Target == node.Id)
            .ToList();

        foreach (var edge in incomingEdges)
        {
            var sourceResult = context.NodeResults.GetValueOrDefault(edge.Source);
            if (sourceResult != null)
            {
                inputs[edge.Source] = sourceResult.Output;
            }
        }

        foreach (var variable in context.Variables)
        {
            if (!inputs.ContainsKey(variable.Key))
            {
                inputs[variable.Key] = variable.Value;
            }
        }

        return inputs;
    }

    private WorkflowExecutionContext MergeExecutionContext(WorkflowExecutionContext original, WorkflowExecutionContext updated)
    {
        foreach (var result in updated.NodeResults)
        {
            original.NodeResults[result.Key] = result.Value;
        }

        foreach (var node in updated.CompletedNodes)
        {
            if (!original.CompletedNodes.Contains(node))
            {
                original.CompletedNodes.Add(node);
            }
        }

        foreach (var variable in updated.Variables)
        {
            original.Variables[variable.Key] = variable.Value;
        }

        if (updated.Status != ExecutionStatus.Running)
        {
            original.Status = updated.Status;
        }

        return original;
    }

    public async Task<WorkflowExecutionContext?> ResumeAsync(string executionId, Dictionary<string, object>? inputs = null, CancellationToken cancellationToken = default)
    {
        var context = await _checkpointStore.LoadAsync(executionId);
        if (context == null) return null;

        if (inputs != null)
        {
            foreach (var input in inputs)
            {
                context.Variables[input.Key] = input.Value;
            }
        }

        context.Status = ExecutionStatus.Running;
        return await ExecuteAsync(context, cancellationToken);
    }

    public async Task<bool> PauseAsync(string executionId, string? nodeId = null)
    {
        if (_activeExecutions.TryGetValue(executionId, out var context))
        {
            context.Status = ExecutionStatus.Paused;
            context.PendingHumanInputNode = nodeId;
            await _checkpointStore.SaveAsync(context);
            return true;
        }
        return false;
    }

    public async Task<bool> StopAsync(string executionId)
    {
        if (_activeExecutions.TryGetValue(executionId, out var context))
        {
            context.Status = ExecutionStatus.Stopped;
            await _checkpointStore.SaveAsync(context);
            return true;
        }
        return false;
    }

    public Task<WorkflowExecutionContext?> GetExecutionAsync(string executionId)
    {
        if (_activeExecutions.TryGetValue(executionId, out var context))
        {
            return Task.FromResult<WorkflowExecutionContext?>(context);
        }
        return _checkpointStore.LoadAsync(executionId);
    }
}

public class WorkflowExecutionContext
{
    public string ExecutionId { get; set; } = Guid.NewGuid().ToString();
    public string WorkflowDefinitionId { get; set; } = string.Empty;
    public WorkflowDefinition WorkflowDefinition { get; set; } = new();
    public ExecutionStatus Status { get; set; } = ExecutionStatus.Pending;
    public int Superstep { get; set; }
    public Dictionary<string, object?> Variables { get; set; } = new();
    public Dictionary<string, NodeExecutionResult> NodeResults { get; set; } = new();
    public HashSet<string> CompletedNodes { get; set; } = new();
    public Dictionary<string, int> NodeRetryCount { get; set; } = new();
    public string? CurrentNodeId { get; set; }
    public string? PendingHumanInputNode { get; set; }
    public string? Error { get; set; }
    public Dictionary<string, object?> Outputs { get; set; } = new();
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public string? CheckpointId { get; set; }
}

public enum ExecutionStatus
{
    Pending,
    Running,
    Paused,
    WaitingForInput,
    Completed,
    Failed,
    Cancelled,
    Stopped
}

public class NodeExecutionResult
{
    public string NodeId { get; set; } = string.Empty;
    public object? Output { get; set; }
    public string OutputVariable { get; set; } = "result";
    public bool NeedsHumanInput { get; set; }
    public int RetryCount { get; set; }
    public TimeSpan Duration { get; set; }
    public Dictionary<string, object?> Metadata { get; set; } = new();
}
