using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 计时器执行器 - 处理流程中的等待逻辑
/// </summary>
internal sealed partial class TimerExecutor : Executor
{
    private readonly TimerConfig _config;

    public TimerExecutor(TimerConfig config) : base("TimerExecutor")
    {
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder) => builder;

    [MessageHandler]
    private async ValueTask<Dictionary<string, object?>> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        // 计时器节点返回一个特殊的指令，指示引擎进入等待状态
        return await Task.FromResult(new Dictionary<string, object?>
        {
            ["__sourceHandle"] = "waiting",
            ["waitDuration"] = _config.WaitDuration ?? "00:00:10"
        });
    }
}
