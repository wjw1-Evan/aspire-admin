using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 人工输入执行器 - 暂停流程等待用户提交输入
/// 类似审批节点，但仅需发起人提交表单即可继续
/// </summary>
internal sealed partial class HumanInputExecutor : Executor
{
    private readonly HumanInputConfig _config;

    public HumanInputExecutor(HumanInputConfig config) : base("HumanInputExecutor")
    {
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder) => builder;

    [MessageHandler]
    private async ValueTask<object?> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        await Task.CompletedTask;

        return new Dictionary<string, object?>
        {
            ["__sourceHandle"] = "waiting",
            ["__status"] = "WaitingForHumanInput",
            ["__trigger_notifications"] = true,
            ["inputLabel"] = _config.InputLabel ?? "请输入",
            ["message"] = $"等待人工输入: {_config.InputLabel ?? "请输入"}"
        };
    }
}
