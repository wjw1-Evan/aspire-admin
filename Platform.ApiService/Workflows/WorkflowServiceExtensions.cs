using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Workflows.Core;
using Platform.ApiService.Workflows.Events;

namespace Platform.ApiService.Workflows;

public static class WorkflowServiceExtensions
{
    public static IServiceCollection AddWorkflowServices(this IServiceCollection services)
    {
        services.AddSingleton<IEventBus, WorkflowEventBus>();
        services.AddSingleton<IStateManager, StateManager>();
        services.AddSingleton<ICheckpointStore, CheckpointStore>();
        services.AddSingleton<IWorkerPool, WorkerPool>();
        services.AddSingleton<IExecutorRegistry, ExecutorRegistry>();
        services.AddSingleton<IGraphEngine, GraphEngine>();

        return services;
    }
}
