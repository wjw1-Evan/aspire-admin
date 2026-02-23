using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 公文与云存储 MCP 工具处理器
/// </summary>
public class DocumentMcpToolHandler : McpToolHandlerBase
{
    private readonly IDocumentService _documentService;
    private readonly ICloudStorageService _cloudStorageService;
    private readonly ILogger<DocumentMcpToolHandler> _logger;

    /// <summary>
    /// 初始化公文与云存储 MCP 处理器
    /// </summary>
    /// <param name="documentService">公文服务</param>
    /// <param name="cloudStorageService">云存储服务</param>
    /// <param name="logger">日志处理器</param>
    public DocumentMcpToolHandler(
        IDocumentService documentService,
        ICloudStorageService cloudStorageService,
        ILogger<DocumentMcpToolHandler> logger)
    {
        _documentService = documentService;
        _cloudStorageService = cloudStorageService;
        _logger = logger;

        #region 公文管理
        RegisterTool("get_documents", "获取公文列表。支持关键词、类型、分类和状态筛选。关键词：公文,文件,文档,摘要,拟办,传阅",
            ObjectSchema(MergeProperties(new Dictionary<string, object>
            {
                ["keyword"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" },
                ["documentType"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "公文类型" },
                ["category"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "分类" },
                ["status"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "状态" },
                ["filterType"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "过滤类型" }
            }, PaginationSchema())),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args, defaultPageSize: 20, maxPageSize: 100);
                var request = new DocumentQueryParams
                {
                    Page = page,
                    PageSize = pageSize,
                    Keyword = args.GetValueOrDefault("keyword")?.ToString(),
                    DocumentType = args.GetValueOrDefault("documentType")?.ToString(),
                    Category = args.GetValueOrDefault("category")?.ToString(),
                    FilterType = args.GetValueOrDefault("filterType")?.ToString()
                };
                if (args.ContainsKey("status") && Enum.TryParse<DocumentStatus>(args.GetValueOrDefault("status")?.ToString(), out var status)) request.Status = status;
                var (items, total) = await _documentService.GetDocumentsAsync(request);
                return new { documents = items.Select(d => new { d.Id, d.Title, d.DocumentType, d.Category, d.Status, d.CreatedBy, d.CreatedAt, d.WorkflowInstanceId }).ToList(), total, page, pageSize };
            });

        RegisterTool("get_document_detail", "获取公文详情。关键词：公文,详情",
            ObjectSchema(new Dictionary<string, object> { ["documentId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "公文ID" } }, ["documentId"]),
            async (args, uid) =>
            {
                var documentId = args.GetValueOrDefault("documentId")?.ToString();
                if (string.IsNullOrEmpty(documentId)) return new { error = "未提供公文ID" };
                var doc = await _documentService.GetDocumentAsync(documentId);
                if (doc == null) return (object)new { error = "公文不存在" };
                return new { doc.Id, doc.Title, doc.Content, doc.DocumentType, doc.Category, doc.Status, doc.FormData, doc.AttachmentIds, doc.CreatedBy, doc.CreatedAt, doc.WorkflowInstanceId };
            });

        RegisterTool("get_document_statistics", "获取公文统计信息。关键词：公文,统计",
            async (args, uid) => await _documentService.GetStatisticsAsync());
        #endregion

        #region 云存储
        RegisterTool("get_file_items", "获取云存储文件列表。关键词：文件,云硬盘,网盘,上传",
            ObjectSchema(MergeProperties(new Dictionary<string, object>
            {
                ["parentId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "父目录ID", ["default"] = "root" },
                ["search"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" },
                ["fileType"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "文件类型" }
            }, PaginationSchema(50, 200))),
            HandleGetFileItemsAsync);

        RegisterTool("search_cloud_files", "全文搜索云存储中的文件内容或名称。关键词：搜索文件,查找文档",
            ObjectSchema(MergeProperties(new Dictionary<string, object>
            {
                ["keyword"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" }
            }, PaginationSchema())),
            HandleSearchFilesAsync);

        RegisterTool("create_folder", "在指定的云存储路径下创建新文件夹。关键词：新建文件夹,创建目录",
            ObjectSchema(new Dictionary<string, object>
            {
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "文件夹名称" },
                ["parentId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "父目录ID", ["default"] = "root" }
            }, ["name"]),
            async (args, uid) =>
            {
                var name = args.GetValueOrDefault("name")?.ToString();
                var parentId = args.GetValueOrDefault("parentId")?.ToString() ?? "root";
                if (string.IsNullOrEmpty(name)) return new { error = "文件夹名称必填" };
                var folder = await _cloudStorageService.CreateFolderAsync(name, parentId);
                return new { success = true, folderId = folder.Id, folderName = folder.Name };
            });

        RegisterTool("get_storage_usage", "获取云存储使用情况统计。",
            async (args, uid) => await _cloudStorageService.GetStorageUsageAsync(uid));
        #endregion
    }

    private async Task<object?> HandleGetFileItemsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var parentId = arguments.ContainsKey("parentId") ? (arguments["parentId"]?.ToString() ?? "root") : "root";
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 50, maxPageSize: 200);

        if (arguments.ContainsKey("search"))
            return await HandleSearchFilesAsync(arguments, currentUserId);

        var query = new FileListQuery { Page = page, PageSize = pageSize };
        if (arguments.ContainsKey("fileType") && Enum.TryParse<FileItemType>(arguments["fileType"]?.ToString(), out var type))
            query.Type = type;

        var response = await _cloudStorageService.GetFileItemsAsync(parentId, query);
        return new
        {
            items = response.Data.Select(i => new { i.Id, i.Name, i.Type, i.Size, i.MimeType, i.ParentId, i.UpdatedAt }).ToList(),
            total = response.Total,
            page = response.Page,
            pageSize = response.PageSize
        };
    }

    private async Task<object?> HandleSearchFilesAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var keyword = arguments.ContainsKey("keyword") ? (arguments["keyword"]?.ToString() ?? "") : (arguments.ContainsKey("search") ? (arguments["search"]?.ToString() ?? "") : "");
        if (string.IsNullOrEmpty(keyword)) return new { error = "关键词必填" };

        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 20, maxPageSize: 100);
        var request = new FileSearchQuery { Keyword = keyword, Page = page, PageSize = pageSize };
        var response = await _cloudStorageService.SearchFilesAsync(request);
        return new
        {
            items = response.Data.Select(i => new { i.Id, i.Name, i.Type, i.Size, i.Path, i.UpdatedAt }).ToList(),
            total = response.Total,
            page = response.Page,
            pageSize = response.PageSize
        };
    }
}
