using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

public class XiaokeConfigDto
{
    public string Id { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Model { get; set; } = string.Empty;

    public string SystemPrompt { get; set; } = string.Empty;

    public double Temperature { get; set; }

    public int MaxTokens { get; set; }

    public double TopP { get; set; }

    public double FrequencyPenalty { get; set; }

    public double PresencePenalty { get; set; }

    public bool IsEnabled { get; set; }

    public bool IsDefault { get; set; }
}

public class CreateXiaokeConfigRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Model { get; set; } = string.Empty;

    public string SystemPrompt { get; set; } = string.Empty;

    [Range(0.0, 2.0)]
    public double Temperature { get; set; } = 0.7;

    [Range(1, int.MaxValue)]
    public int MaxTokens { get; set; } = 2000;

    [Range(0.0, 1.0)]
    public double TopP { get; set; } = 1.0;

    [Range(-2.0, 2.0)]
    public double FrequencyPenalty { get; set; } = 0.0;

    [Range(-2.0, 2.0)]
    public double PresencePenalty { get; set; } = 0.0;

    public bool IsEnabled { get; set; } = true;

    public bool IsDefault { get; set; } = false;
}

public class UpdateXiaokeConfigRequest
{
    public string? Name { get; set; }

    public string? Model { get; set; }

    public string? SystemPrompt { get; set; }

    [Range(0.0, 2.0)]
    public double? Temperature { get; set; }

    [Range(1, int.MaxValue)]
    public int? MaxTokens { get; set; }

    [Range(0.0, 1.0)]
    public double? TopP { get; set; }

    [Range(-2.0, 2.0)]
    public double? FrequencyPenalty { get; set; }

    [Range(-2.0, 2.0)]
    public double? PresencePenalty { get; set; }

    public bool? IsEnabled { get; set; }

    public bool? IsDefault { get; set; }
}

public class ChatHistoryListItemDto
{
    public string SessionId { get; set; } = string.Empty;

    public List<string> Participants { get; set; } = new();

    public Dictionary<string, string> ParticipantNames { get; set; } = new();

    public string? LastMessageExcerpt { get; set; }

    public DateTime? LastMessageAt { get; set; }

    public int MessageCount { get; set; }
}

public class ChatHistoryDetailResponse
{
    public ChatSession Session { get; set; } = new();

    public List<ChatMessage> Messages { get; set; } = new();
}