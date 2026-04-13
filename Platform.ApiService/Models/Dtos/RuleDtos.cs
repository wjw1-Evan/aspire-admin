namespace Platform.ApiService.Models;

public class CreateRuleRequest
{
    public string? Name { get; set; }

    public string? Desc { get; set; }

    public string? Owner { get; set; }

    public string? Href { get; set; }

    public string? Avatar { get; set; }

    public int CallNo { get; set; }

    public int Status { get; set; }

    public int Progress { get; set; }

    public bool Disabled { get; set; }

    public CreateMcpRuleConfigRequest? McpConfig { get; set; }
}

public class UpdateRuleRequest
{
    public int? Key { get; set; }

    public string? Name { get; set; }

    public string? Desc { get; set; }

    public string? Owner { get; set; }

    public string? Href { get; set; }

    public string? Avatar { get; set; }

    public int? CallNo { get; set; }

    public int? Status { get; set; }

    public int? Progress { get; set; }

    public bool? Disabled { get; set; }

    public UpdateMcpRuleConfigRequest? McpConfig { get; set; }
}

public class RuleOperationRequest
{
    public string Method { get; set; } = string.Empty;

    public string? Name { get; set; }

    public string? Desc { get; set; }

    public int? Key { get; set; }
}

public class DeleteRuleRequest
{
    public int? Key { get; set; }
}

public class CreateMcpRuleConfigRequest
{
    public bool Enabled { get; set; } = false;

    public string? ToolName { get; set; }

    public string? ToolDescription { get; set; }

    public Dictionary<string, object>? InputSchema { get; set; }

    public bool IsResource { get; set; } = false;

    public string? ResourceUri { get; set; }

    public string? ResourceMimeType { get; set; }

    public bool IsPrompt { get; set; } = false;

    public Dictionary<string, object>? PromptArguments { get; set; }

    public string? PromptTemplate { get; set; }
}

public class UpdateMcpRuleConfigRequest
{
    public bool? Enabled { get; set; }

    public string? ToolName { get; set; }

    public string? ToolDescription { get; set; }

    public Dictionary<string, object>? InputSchema { get; set; }

    public bool? IsResource { get; set; }

    public string? ResourceUri { get; set; }

    public string? ResourceMimeType { get; set; }

    public bool? IsPrompt { get; set; }

    public Dictionary<string, object>? PromptArguments { get; set; }

    public string? PromptTemplate { get; set; }
}

public class RuleMcpToolResponse
{
    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public Dictionary<string, object>? InputSchema { get; set; }

    public string RuleId { get; set; } = string.Empty;

    public string RuleName { get; set; } = string.Empty;
}

public class RuleMcpResourceResponse
{
    public string Uri { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string? MimeType { get; set; }

    public string RuleId { get; set; } = string.Empty;
}

public class RuleMcpPromptResponse
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public Dictionary<string, object>? Arguments { get; set; }

    public string? Template { get; set; }

    public string RuleId { get; set; } = string.Empty;
}