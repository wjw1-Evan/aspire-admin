using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

public class ChatMessageListRequest
{
    public string? Cursor { get; set; } = default;

    [Range(1, 200)]
    public int Limit { get; set; } = 50;
}

public class SendChatMessageRequest
{
    [Required]
    public string SessionId { get; set; } = string.Empty;

    [Required]
    public ChatMessageType Type { get; set; } = ChatMessageType.Text;

    public string? Content { get; set; } = default;

    public string? AttachmentId { get; set; } = default;

    public string? RecipientId { get; set; } = default;

    public string? ClientMessageId { get; set; } = default;

    public Dictionary<string, object>? Metadata { get; set; } = new();

    public bool AssistantStreaming { get; set; } = false;
}

public class UploadAttachmentResponse
{
    public ChatAttachmentInfo Attachment { get; set; } = new();
}

public class ChatAttachmentDownloadResult
{
    public Stream Content { get; set; } = Stream.Null;

    public string FileName { get; set; } = string.Empty;

    public string ContentType { get; set; } = "application/octet-stream";

    public long ContentLength { get; set; } = 0;
}

public class MarkSessionReadRequest
{
    [Required]
    public string LastMessageId { get; set; } = string.Empty;
}

public class ChatMessageTimelineResponse
{
    public List<ChatMessage> Items { get; set; } = new();

    public bool HasMore { get; set; } = false;

    public string? NextCursor { get; set; } = default;
}

public class ChatMessageRealtimePayload
{
    public string SessionId { get; set; } = string.Empty;

    public ChatMessage Message { get; set; } = new();

    public DateTime BroadcastAtUtc { get; set; } = DateTime.UtcNow;
}

public class ChatSessionRealtimePayload
{
    public ChatSession Session { get; set; } = new();

    public DateTime BroadcastAtUtc { get; set; } = DateTime.UtcNow;
}

public class ChatMessageDeletedPayload
{
    public string SessionId { get; set; } = string.Empty;

    public string MessageId { get; set; } = string.Empty;

    public DateTime DeletedAtUtc { get; set; } = DateTime.UtcNow;
}

public class ChatSessionReadPayload
{
    public string SessionId { get; set; } = string.Empty;

    public string UserId { get; set; } = string.Empty;

    public string LastMessageId { get; set; } = string.Empty;

    public DateTime ReadAtUtc { get; set; } = DateTime.UtcNow;
}