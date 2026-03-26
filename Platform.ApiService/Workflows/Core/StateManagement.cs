using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Workflows.Core;

public interface IStateManager
{
    Task<Dictionary<string, object?>> GetStateAsync(string executionId);
    Task SetStateAsync(string executionId, Dictionary<string, object?> state);
    Task ClearStateAsync(string executionId);
    Task<bool> HasStateAsync(string executionId);
}

public class StateManager : IStateManager
{
    private readonly ConcurrentDictionary<string, Dictionary<string, object?>> _states = new();
    private readonly ILogger<StateManager> _logger;

    public StateManager(ILogger<StateManager> logger)
    {
        _logger = logger;
    }

    public Task<Dictionary<string, object?>> GetStateAsync(string executionId)
    {
        _states.TryGetValue(executionId, out var state);
        return Task.FromResult(state ?? new Dictionary<string, object?>());
    }

    public Task SetStateAsync(string executionId, Dictionary<string, object?> state)
    {
        _states[executionId] = state;
        _logger.LogDebug("State updated for execution {ExecutionId}", executionId);
        return Task.CompletedTask;
    }

    public Task ClearStateAsync(string executionId)
    {
        _states.TryRemove(executionId, out _);
        _logger.LogDebug("State cleared for execution {ExecutionId}", executionId);
        return Task.CompletedTask;
    }

    public Task<bool> HasStateAsync(string executionId)
    {
        return Task.FromResult(_states.ContainsKey(executionId));
    }
}

public interface ICheckpointStore
{
    Task SaveAsync(WorkflowExecutionContext context);
    Task<WorkflowExecutionContext?> LoadAsync(string executionId);
    Task DeleteAsync(string executionId);
    Task<IEnumerable<string>> ListCheckpointsAsync(string workflowId);
}

public class CheckpointStore : ICheckpointStore
{
    private readonly ILogger<CheckpointStore> _logger;
    private readonly ConcurrentDictionary<string, WorkflowExecutionContext> _checkpoints = new();

    public CheckpointStore(ILogger<CheckpointStore> logger)
    {
        _logger = logger;
    }

    public Task SaveAsync(WorkflowExecutionContext context)
    {
        context.CheckpointId = $"{context.ExecutionId}_{context.Superstep}";
        _checkpoints[context.ExecutionId] = context;
        _logger.LogDebug("Checkpoint saved: {CheckpointId}", context.CheckpointId);
        return Task.CompletedTask;
    }

    public Task<WorkflowExecutionContext?> LoadAsync(string executionId)
    {
        _checkpoints.TryGetValue(executionId, out var context);
        return Task.FromResult(context);
    }

    public Task DeleteAsync(string executionId)
    {
        _checkpoints.TryRemove(executionId, out _);
        _logger.LogDebug("Checkpoint deleted: {ExecutionId}", executionId);
        return Task.CompletedTask;
    }

    public Task<IEnumerable<string>> ListCheckpointsAsync(string workflowId)
    {
        var checkpoints = _checkpoints.Values
            .Where(c => c.WorkflowDefinitionId == workflowId)
            .Select(c => c.CheckpointId!)
            .AsEnumerable();
        return Task.FromResult(checkpoints);
    }
}

public interface IWorkerPool
{
    Task<NodeExecutionResult> ExecuteAsync(IExecutor executor, Dictionary<string, object?> inputs, 
        WorkflowExecutionContext context, CancellationToken cancellationToken);
    int GetActiveWorkers();
    int GetQueuedTasks();
}

public class WorkerPool : IWorkerPool
{
    private readonly ILogger<WorkerPool> _logger;
    private readonly SemaphoreSlim _semaphore;
    private readonly int _maxWorkers;
    private int _activeWorkers;

    public WorkerPool(ILogger<WorkerPool> logger, int maxWorkers = 10)
    {
        _logger = logger;
        _maxWorkers = maxWorkers;
        _semaphore = new SemaphoreSlim(maxWorkers);
    }

    public async Task<NodeExecutionResult> ExecuteAsync(IExecutor executor, Dictionary<string, object?> inputs,
        WorkflowExecutionContext context, CancellationToken cancellationToken)
    {
        await _semaphore.WaitAsync(cancellationToken);
        Interlocked.Increment(ref _activeWorkers);

        try
        {
            _logger.LogDebug("Worker executing {NodeType}, active workers: {Active}/{Max}",
                executor.NodeType, _activeWorkers, _maxWorkers);

            var result = await executor.ExecuteAsync(inputs, context, cancellationToken);
            return result;
        }
        finally
        {
            Interlocked.Decrement(ref _activeWorkers);
            _semaphore.Release();
        }
    }

    public int GetActiveWorkers() => _activeWorkers;
    public int GetQueuedTasks() => _semaphore.CurrentCount;
}