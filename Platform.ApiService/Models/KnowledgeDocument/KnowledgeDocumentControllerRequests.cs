namespace Platform.ApiService.Models;

/// <summary>
/// 创建文档请求
/// </summary>
public class KnowledgeDocumentCreateRequest
{
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? Summary { get; set; }
    public int? SortOrder { get; set; }
}

/// <summary>
/// 更新文档请求
/// </summary>
public class KnowledgeDocumentUpdateRequest
{
    public string? Title { get; set; }
    public string? Content { get; set; }
    public string? Summary { get; set; }
    public int? SortOrder { get; set; }
}
