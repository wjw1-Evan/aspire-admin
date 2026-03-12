using Microsoft.Agents.AI.Workflows;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 结束节点执行器 - 标记工作流结束点
/// </summary>
internal sealed partial class EndExecutor : Executor
{
    public EndExecutor() : base("EndExecutor")
    {
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder) => builder;

    [MessageHandler]
    private async ValueTask<object?> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        return await Task.FromResult<object?>(null);
    }
}
