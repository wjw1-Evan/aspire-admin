using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Services;
using Platform.ApiService.Workflows.Utilities;
using System.Text.Json;

namespace Platform.ApiService.Workflows.Executors;

internal sealed partial class EmailExecutor : Executor
{
    private readonly IEmailService _emailService;
    private readonly EmailConfig _config;

    public EmailExecutor(IEmailService emailService, EmailConfig config) : base("EmailExecutor")
    {
        _emailService = emailService;
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder) => builder;

    [MessageHandler]
    private async ValueTask<string> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        var variables = JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();

        var to = DifyVariableResolver.Resolve(_config.To ?? string.Empty, variables);
        var subject = DifyVariableResolver.Resolve(_config.Subject ?? string.Empty, variables);
        var body = DifyVariableResolver.Resolve(_config.Body ?? string.Empty, variables);

        if (!string.IsNullOrEmpty(to))
        {
            await _emailService.SendEmailAsync(to, subject, body);
            return $"Email sent successfully to {to}";
        }

        return "Email skipped: recipient address is empty";
    }
}
