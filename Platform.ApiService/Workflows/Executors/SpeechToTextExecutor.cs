using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Services;
using Platform.ApiService.Workflows.Utilities;
using System.Text.Json;

namespace Platform.ApiService.Workflows.Executors;

internal sealed partial class SpeechToTextExecutor : Executor
{
    private readonly SpeechToTextConfig _config;

    public SpeechToTextExecutor(SpeechToTextConfig config) : base("SpeechToTextExecutor")
    {
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder) => builder;

    [MessageHandler]
    private async ValueTask<string> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        var variables = JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();

        var audioInput = DifyVariableResolver.Resolve(_config.InputVariable ?? string.Empty, variables);
        
        // Mock transcription logic
        await Task.Delay(100, cancellationToken); // Simulate processing
        return $"[Transcribed from {audioInput}] The weather is beautiful today.";
    }
}
