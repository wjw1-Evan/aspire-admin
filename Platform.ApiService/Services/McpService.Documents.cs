using System.Text.Json;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
namespace Platform.ApiService.Services;
/// <summary>
/// MCP 服务实现
/// </summary>

public partial class McpService
{
    #region 公文管理相关

    private async Task<object> HandleGetDocumentsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 20, maxPageSize: 100);
        var request = new DocumentQueryParams
        {
            Page = page,
            PageSize = pageSize,
            Keyword = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : null,
            DocumentType = arguments.ContainsKey("documentType") ? arguments["documentType"]?.ToString() : null,
            Category = arguments.ContainsKey("category") ? arguments["category"]?.ToString() : null,
            FilterType = arguments.ContainsKey("filterType") ? arguments["filterType"]?.ToString() : null
        };

        if (arguments.ContainsKey("status") && Enum.TryParse<DocumentStatus>(arguments["status"]?.ToString(), out var status))
        {
            request.Status = status;
        }

        var (items, total) = await _documentService.GetDocumentsAsync(request);

        return new
        {
            documents = items.Select(d => new
            {
                id = d.Id,
                title = d.Title,
                documentType = d.DocumentType,
                category = d.Category,
                status = d.Status,
                createdBy = d.CreatedBy,
                createdAt = d.CreatedAt,
                workflowInstanceId = d.WorkflowInstanceId
            }).ToList(),
            total = total,
            page = page,
            pageSize = pageSize
        };
    }

    private async Task<object> HandleGetDocumentDetailAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var documentId = arguments.ContainsKey("documentId") ? arguments["documentId"]?.ToString() : null;
        if (string.IsNullOrEmpty(documentId)) return new { error = "未提供公文ID" };

        var doc = await _documentService.GetDocumentAsync(documentId);
        if (doc == null) return new { error = "公文不存在" };

        return new
        {
            id = doc.Id,
            title = doc.Title,
            content = doc.Content,
            documentType = doc.DocumentType,
            category = doc.Category,
            status = doc.Status,
            formData = doc.FormData,
            attachmentIds = doc.AttachmentIds,
            createdBy = doc.CreatedBy,
            createdAt = doc.CreatedAt,
            workflowInstanceId = doc.WorkflowInstanceId
        };
    }

    private async Task<object> HandleGetDocumentStatisticsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var stats = await _documentService.GetStatisticsAsync();
        return stats;
    }

    #endregion
    #region 云存储相关工具处理方法

    private async Task<object> HandleGetFileItemsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var parentId = arguments.ContainsKey("parentId") ? (arguments["parentId"]?.ToString() ?? "root") : "root";
        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 50, maxPageSize: 200);

        var query = new FileListQuery
        {
            Page = page,
            PageSize = pageSize
        };

        if (arguments.ContainsKey("search"))
        {
            // 如果提供了 search，直接使用搜索逻辑
            return await HandleSearchFilesAsync(arguments, currentUserId);
        }

        if (arguments.ContainsKey("fileType") && Enum.TryParse<FileItemType>(arguments["fileType"]?.ToString(), out var type))
        {
            query.Type = type;
        }

        var response = await _cloudStorageService.GetFileItemsAsync(parentId, query);

        return new
        {
            items = response.Data.Select(i => new
            {
                id = i.Id,
                name = i.Name,
                type = i.Type, // folder or file
                size = i.Size,
                mimeType = i.MimeType,
                parentId = i.ParentId,
                updatedAt = i.UpdatedAt
            }).ToList(),
            total = response.Total,
            page = response.Page,
            pageSize = response.PageSize
        };
    }

    private async Task<object> HandleSearchFilesAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var keyword = arguments.ContainsKey("keyword") ? (arguments["keyword"]?.ToString() ?? "") : (arguments.ContainsKey("search") ? (arguments["search"]?.ToString() ?? "") : "");
        if (string.IsNullOrEmpty(keyword)) return new { error = "关键词必填" };

        var (page, pageSize) = ParsePaginationArgs(arguments, defaultPageSize: 20, maxPageSize: 100);

        var request = new FileSearchQuery
        {
            Keyword = keyword,
            Page = page,
            PageSize = pageSize
        };

        var response = await _cloudStorageService.SearchFilesAsync(request);

        return new
        {
            items = response.Data.Select(i => new
            {
                id = i.Id,
                name = i.Name,
                type = i.Type,
                size = i.Size,
                path = i.Path,
                updatedAt = i.UpdatedAt
            }).ToList(),
            total = response.Total,
            page = response.Page,
            pageSize = response.PageSize
        };
    }

    private async Task<object> HandleCreateFolderAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var name = arguments.ContainsKey("name") ? arguments["name"]?.ToString() : null;
        var parentId = arguments.ContainsKey("parentId") ? (arguments["parentId"]?.ToString() ?? "root") : "root";

        if (string.IsNullOrEmpty(name)) return new { error = "文件夹名称必填" };

        var folder = await _cloudStorageService.CreateFolderAsync(name, parentId);
        return new { success = true, folderId = folder.Id, folderName = folder.Name };
    }

    private async Task<object> HandleGetStorageUsageAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var usage = await _cloudStorageService.GetStorageUsageAsync(currentUserId);
        return usage;
    }

    #endregion
    #region 密码本相关工具处理方法

    private async Task<object> HandleGetPasswordBookEntriesAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var (page, pageSize) = ParsePaginationArgs(arguments);
        var request = new PasswordBookQueryRequest
        {
            Current = page,
            PageSize = pageSize,
            Keyword = arguments.ContainsKey("keyword") ? arguments["keyword"]?.ToString() : null,
            Category = arguments.ContainsKey("category") ? arguments["category"]?.ToString() : null
        };
        var (items, total) = await _passwordBookService.GetEntriesAsync(request);
        return new { items, total, page = page, pageSize = pageSize };
    }

    #endregion
}
