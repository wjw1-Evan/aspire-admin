using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Services;
using Platform.ApiService.Workflows.Utilities;
using System.Text.Json;

namespace Platform.ApiService.Workflows.Executors;

internal sealed partial class TextToSpeechExecutor : Executor
{
    private readonly TextToSpeechConfig _config;

    public TextToSpeechExecutor(TextToSpeechConfig config) : base("TextToSpeechExecutor")
    {
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder) => builder;

    [MessageHandler]
    private async ValueTask<string> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        var variables = JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();

        var textInput = DifyVariableResolver.Resolve(_config.InputVariable ?? string.Empty, variables);
        
        // Mock speech generation logic
        await Task.Delay(100, cancellationToken); // Simulate processing
        var voice = _config.Voice ?? "default";
        return $"/uploads/audio/{Guid.NewGuid()}.mp3 (Generated from '{textInput}' using voice {voice})";
    }
}
