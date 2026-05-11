using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 云存储 MCP 工具处理器
/// </summary>
public class CloudStorageMcpToolHandler : McpToolHandlerBase
{
    private readonly ICloudStorageService _cloudStorageService;
    private readonly DbContext _context;
    private readonly ILogger<CloudStorageMcpToolHandler> _logger;

    public CloudStorageMcpToolHandler(
        ICloudStorageService cloudStorageService,
        DbContext context,
        ILogger<CloudStorageMcpToolHandler> logger)
    {
        _cloudStorageService = cloudStorageService;
        _context = context;
        _logger = logger;

        RegisterTool("get_storage_usage", "获取云存储使用统计，包含总空间、已用空间、文件数。关键词：存储统计,云盘空间,存储使用,存储概况",
            async (args, uid) => await _cloudStorageService.GetStorageUsageAsync());

        RegisterTool("get_file_items", "获取文件或文件夹列表，按父文件夹过滤并支持分页。关键词：文件列表,文件夹列表,文件浏览,浏览文件",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object>
                {
                    ["parentId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "父文件夹ID（空则查根目录）" },
                    ["keyword"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" }
                },
                PaginationSchema()
            )),
            async (args, uid) =>
            {
                var (Current, PageSize) = ParsePaginationArgs(args);
                var parentId = args.GetValueOrDefault("parentId")?.ToString() ?? "";
                var request = new Platform.ServiceDefaults.Models.ProTableRequest { Current = Current, PageSize = PageSize, Search = args.GetValueOrDefault("keyword")?.ToString() };
                var result = await _cloudStorageService.GetFileItemsAsync(parentId, request);
                var items = await result.Queryable.ToListAsync();
                return new { items, rowCount = result.RowCount, currentPage = result.CurrentPage, pageSize = result.PageSize, pageCount = result.PageCount };
            });

        RegisterTool("create_folder", "在云盘中创建新文件夹。关键词：新建文件夹,创建文件夹,新增目录",
            ObjectSchema(new Dictionary<string, object>
            {
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "文件夹名称" },
                ["parentId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "父文件夹ID（空则在根目录创建）" }
            }, ["name"]),
            async (args, uid) =>
            {
                var name = args.GetValueOrDefault("name")?.ToString();
                if (string.IsNullOrEmpty(name)) return new { error = "文件夹名称必填" };
                var parentId = args.GetValueOrDefault("parentId")?.ToString() ?? "";
                var folder = await _cloudStorageService.CreateFolderAsync(name, parentId);
                return new { folder.Id, folder.Name, folder.ParentId, message = "文件夹创建成功" };
            });

        RegisterTool("get_file_item", "获取文件或文件夹的详细信息。关键词：文件详情,文件信息,查看文件",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "文件项ID" } }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "文件项ID必填" };
                var item = await _cloudStorageService.GetFileItemAsync(id);
                if (item == null) return new { error = "文件项不存在" };
                return item;
            });

        RegisterTool("rename_file_item", "重命名文件或文件夹。关键词：重命名,改名,修改名称",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "文件项ID" },
                ["newName"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "新名称" }
            }, ["id", "newName"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                var newName = args.GetValueOrDefault("newName")?.ToString();
                if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(newName)) return new { error = "文件项ID和新名称必填" };
                var item = await _cloudStorageService.RenameFileItemAsync(id, newName);
                return new { item.Id, item.Name, message = "重命名成功" };
            });

        RegisterTool("move_file_item", "移动文件或文件夹到目标文件夹。关键词：移动文件,移动文件夹,整理文件,移动",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "文件项ID" },
                ["newParentId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "目标父文件夹ID" }
            }, ["id", "newParentId"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                var newParentId = args.GetValueOrDefault("newParentId")?.ToString();
                if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(newParentId)) return new { error = "文件项ID和目标父文件夹ID必填" };
                var item = await _cloudStorageService.MoveFileItemAsync(id, newParentId);
                return new { item.Id, item.Name, message = "移动成功" };
            });

        RegisterTool("copy_file_item", "复制文件或文件夹到目标文件夹。关键词：复制文件,复制文件夹,拷贝",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "文件项ID" },
                ["newParentId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "目标父文件夹ID" },
                ["newName"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "新名称（可选）" }
            }, ["id", "newParentId"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                var newParentId = args.GetValueOrDefault("newParentId")?.ToString();
                if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(newParentId)) return new { error = "文件项ID和目标父文件夹ID必填" };
                var newName = args.GetValueOrDefault("newName")?.ToString();
                var item = await _cloudStorageService.CopyFileItemAsync(id, newParentId, newName);
                return new { item.Id, item.Name, message = "复制成功" };
            });

        RegisterTool("delete_file_item", "删除文件或文件夹（移至回收站）。关键词：删除文件,删除文件夹,移至回收站",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "文件项ID" } }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "文件项ID必填" };
                await _cloudStorageService.DeleteFileItemAsync(id);
                return new { message = "已移动到回收站" };
            });

        RegisterTool("search_files", "搜索文件和文件夹，支持关键词和分页。关键词：搜索文件,文件搜索,查找文件",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object> { ["keyword"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" } },
                PaginationSchema()
            )),
            async (args, uid) =>
            {
                var (Current, PageSize) = ParsePaginationArgs(args);
                var keyword = args.GetValueOrDefault("keyword")?.ToString();
                if (string.IsNullOrEmpty(keyword)) return new { error = "搜索关键词必填" };
                var request = new Platform.ServiceDefaults.Models.ProTableRequest { Current = Current, PageSize = PageSize, Search = keyword };
                var result = await _cloudStorageService.SearchFilesAsync(request);
                var items = await result.Queryable.ToListAsync();
                return new { items, rowCount = result.RowCount, currentPage = result.CurrentPage, pageSize = result.PageSize, pageCount = result.PageCount };
            });

        RegisterTool("get_recent_files", "获取最近访问的文件列表。关键词：最近文件,最近使用,近期文件",
            ObjectSchema(new Dictionary<string, object> { ["count"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "返回数量，默认10，最大100" } }),
            async (args, uid) =>
            {
                var count = int.TryParse(args.GetValueOrDefault("count")?.ToString(), out var c) ? Math.Clamp(c, 1, 100) : 10;
                return await _cloudStorageService.GetRecentFilesAsync(count);
            });
    }
}
