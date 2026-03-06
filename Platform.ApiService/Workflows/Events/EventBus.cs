using System.Collections.Concurrent;

namespace Platform.ApiService.Workflows.Events;

public interface IEventBus
{
    Task PublishAsync<T>(T @event) where T : WorkflowEvent;
    Task PublishAsync(WorkflowEvent @event);
    IDisposable Subscribe<T>(Func<T, Task> handler) where T : WorkflowEvent;
    IDisposable Subscribe(Type eventType, Func<WorkflowEvent, Task> handler);
}

public abstract class WorkflowEvent
{
    public string ExecutionId { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class WorkflowRunStartedEvent : WorkflowEvent
{
    public string WorkflowId { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
}

public class WorkflowRunCompletedEvent : WorkflowEvent
{
    public DateTime EndTime { get; set; }
    public Core.ExecutionStatus Status { get; set; }
    public Dictionary<string, object?> Outputs { get; set; } = new();
}

public class WorkflowRunFailedEvent : WorkflowEvent
{
    public string Error { get; set; } = string.Empty;
    public string? FailedNodeId { get; set; }
}

public class WorkflowRunAbortedEvent : WorkflowEvent
{
    public string Reason { get; set; } = string.Empty;
}

public class SuperstepStartedEvent : WorkflowEvent
{
    public int Superstep { get; set; }
    public List<string> RunnableNodes { get; set; } = new();
}

public class SuperstepCompletedEvent : WorkflowEvent
{
    public int Superstep { get; set; }
    public List<string> CompletedNodes { get; set; } = new();
}

public class NodeRunStartedEvent : WorkflowEvent
{
    public string NodeId { get; set; } = string.Empty;
    public string NodeType { get; set; } = string.Empty;
    public Dictionary<string, object?> Inputs { get; set; } = new();
}

public class NodeRunCompletedEvent : WorkflowEvent
{
    public string NodeId { get; set; } = string.Empty;
    public object? Output { get; set; }
    public TimeSpan Duration { get; set; }
}

public class NodeRunFailedEvent : WorkflowEvent
{
    public string NodeId { get; set; } = string.Empty;
    public string Error { get; set; } = string.Empty;
}

public class NodeRetryEvent : WorkflowEvent
{
    public string NodeId { get; set; } = string.Empty;
    public int RetryCount { get; set; }
}

public class IterationStartedEvent : WorkflowEvent
{
    public string NodeId { get; set; } = string.Empty;
    public int Iteration { get; set; }
    public object? Item { get; set; }
}

public class IterationCompletedEvent : WorkflowEvent
{
    public string NodeId { get; set; } = string.Empty;
    public int TotalIterations { get; set; }
    public List<object?> Results { get; set; } = new();
}

public class HumanInputRequestedEvent : WorkflowEvent
{
    public string NodeId { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public Dictionary<string, object?> FormSchema { get; set; } = new();
}

public class HumanInputReceivedEvent : WorkflowEvent
{
    public string NodeId { get; set; } = string.Empty;
    public Dictionary<string, object?> Inputs { get; set; } = new();
}

public class WorkflowEventBus : IEventBus
{
    private readonly ILogger<WorkflowEventBus> _logger;
    private readonly ConcurrentDictionary<Type, List<Func<WorkflowEvent, Task>>> _handlers = new();

    public WorkflowEventBus(ILogger<WorkflowEventBus> logger)
    {
        _logger = logger;
    }

    public async Task PublishAsync<T>(T @event) where T : WorkflowEvent
    {
        await PublishAsync(@event);
    }

    public async Task PublishAsync(WorkflowEvent @event)
    {
        var eventType = @event.GetType();
        
        if (_handlers.TryGetValue(eventType, out var handlers))
        {
            foreach (var handler in handlers)
            {
                try
                {
                    await handler(@event);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error handling event {EventType}", eventType.Name);
                }
            }
        }

        _logger.LogDebug("Event published: {EventType} for execution {ExecutionId}", 
            eventType.Name, @event.ExecutionId);
    }

    public IDisposable Subscribe<T>(Func<T, Task> handler) where T : WorkflowEvent
    {
        return Subscribe(typeof(T), async e => await handler((T)e));
    }

    public IDisposable Subscribe(Type eventType, Func<WorkflowEvent, Task> handler)
    {
        var handlers = _handlers.GetOrAdd(eventType, _ => new List<Func<WorkflowEvent, Task>>());
        handlers.Add(handler);

        return new Subscription(() => handlers.Remove(handler));
    }

    private class Subscription : IDisposable
    {
        private readonly Action _unsubscribe;

        public Subscription(Action unsubscribe)
        {
            _unsubscribe = unsubscribe;
        }

        public void Dispose() => _unsubscribe();
    }
}
