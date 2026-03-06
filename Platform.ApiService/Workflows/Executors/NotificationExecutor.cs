using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Services;
using Platform.ApiService.Workflows.Utilities;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 通知执行器 - 处理工作流中的各类通知发送
/// </summary>
internal sealed partial class NotificationExecutor : Executor
{
    private readonly IUnifiedNotificationService _notificationService;
    private readonly NotificationConfig _config;

    public NotificationExecutor(IUnifiedNotificationService notificationService, NotificationConfig config) : base("NotificationExecutor")
    {
        _notificationService = notificationService;
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder) => builder;

    [MessageHandler]
    private async ValueTask<string> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        var variables = JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();

        // 获取系统变量 (由引擎注入)
        variables.TryGetValue("__instanceId", out var instanceIdObj);
        variables.TryGetValue("__documentTitle", out var docTitleObj);
        
        var instanceId = instanceIdObj?.ToString() ?? "unknown";
        var docTitle = docTitleObj?.ToString() ?? "Workflow Document";
        
        var message = DifyVariableResolver.Resolve(_config.RemarksTemplate ?? string.Empty, variables);
        
        // 模拟发送通知给所有接收者
        var relatedUserIds = _config.Recipients
            .Where(r => r.Type == ApproverType.User && !string.IsNullOrEmpty(r.UserId))
            .Select(r => r.UserId!)
            .ToList();

        if (relatedUserIds.Any())
        {
            await _notificationService.CreateWorkflowNotificationAsync(
                instanceId,
                docTitle,
                _config.ActionType,
                relatedUserIds,
                message);
        }

        return $"Notification sent: {message}";
    }
}
