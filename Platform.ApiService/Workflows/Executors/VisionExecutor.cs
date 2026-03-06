using Microsoft.Agents.AI;
using Microsoft.Agents.AI.Workflows;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Services;
using Platform.ApiService.Workflows.Utilities;
using System.Text.Json;

namespace Platform.ApiService.Workflows.Executors;

internal sealed partial class VisionExecutor : Executor
{
    private readonly AIAgent _agent;
    private readonly VisionConfig _config;

    public VisionExecutor(AIAgent agent, VisionConfig config) : base("VisionExecutor")
    {
        _agent = agent;
        _config = config;
    }

    protected override ProtocolBuilder ConfigureProtocol(ProtocolBuilder builder) => builder;

    [MessageHandler]
    private async ValueTask<string> HandleAsync(string input, IWorkflowContext context, CancellationToken cancellationToken = default)
    {
        var variables = JsonSerializer.Deserialize<Dictionary<string, object?>>(input) ?? new();

        var imageUrl = DifyVariableResolver.Resolve(_config.ImageVariable ?? string.Empty, variables);
        var prompt = DifyVariableResolver.Resolve(_config.Prompt ?? string.Empty, variables);
        
        // Execute Agent logic with vision prompt
        var fullPrompt = $"Image URL: {imageUrl}\nPrompt: {prompt}";
        var response = await _agent.RunAsync(fullPrompt, cancellationToken: cancellationToken);
        
        return response.Text;
    }
}
