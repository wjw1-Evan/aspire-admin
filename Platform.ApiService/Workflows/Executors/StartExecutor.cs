using Microsoft.Agents.AI.Workflows;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 开始节点执行器 - 标记工作流起始点
/// </summary>
internal sealed partial class StartExecutor : Executor
{
    public StartExecutor() : base("StartExecutor")
    {
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder) => builder;

    [MessageHandler]
    private async ValueTask<object?> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        return await Task.FromResult<object?>(null);
    }
}
