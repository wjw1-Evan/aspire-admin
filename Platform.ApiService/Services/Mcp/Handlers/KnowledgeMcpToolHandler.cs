using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Workflow;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 知识库 MCP 工具处理器
/// </summary>
public class KnowledgeMcpToolHandler : McpToolHandlerBase
{
    private readonly IKnowledgeService _knowledgeService;
    private readonly IKnowledgeDocumentService _documentService;
    private readonly ILogger<KnowledgeMcpToolHandler> _logger;

    public KnowledgeMcpToolHandler(
        IKnowledgeService knowledgeService,
        IKnowledgeDocumentService documentService,
        ILogger<KnowledgeMcpToolHandler> logger)
    {
        _knowledgeService = knowledgeService;
        _documentService = documentService;
        _logger = logger;

        RegisterTool("get_knowledge_bases", "获取知识库列表，支持分页和关键词搜索。关键词：知识库列表,知识库管理",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object> { ["keyword"] = new Dictionary<string, object> { ["type"] = "string" } },
                PaginationSchema()
            )),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args);
                var keyword = args.GetValueOrDefault("keyword")?.ToString();
                var result = await _knowledgeService.GetKnowledgeBasesAsync(new Platform.ServiceDefaults.Models.ProTableRequest { Current = page, PageSize = pageSize, Search = keyword });
                var items = await result.Queryable.ToListAsync();
                return new { items, rowCount = result.RowCount, currentPage = result.CurrentPage, pageSize = result.PageSize, pageCount = result.PageCount };
            });

        RegisterTool("get_knowledge_base_detail", "获取知识库详情。关键词：知识库详情,查看知识库",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "id 必填" };
                return await _knowledgeService.GetByIdAsync(id);
            });

        RegisterTool("create_knowledge_base", "创建新知识库。关键词：创建知识库,新建知识库",
            ObjectSchema(new Dictionary<string, object>
            {
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "知识库名称" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "知识库描述" }
            }, ["name"]),
            async (args, uid) =>
            {
                var name = args.GetValueOrDefault("name")?.ToString();
                if (string.IsNullOrEmpty(name)) return new { error = "name 必填" };
                return await _knowledgeService.CreateAsync(new KnowledgeBase
                {
                    Name = name,
                    Description = args.GetValueOrDefault("description")?.ToString()
                });
            });

        RegisterTool("update_knowledge_base", "更新知识库信息。关键词：修改知识库,更新知识库",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string" },
                ["name"] = new Dictionary<string, object> { ["type"] = "string" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "id 必填" };
                return await _knowledgeService.UpdateAsync(id, kb =>
                {
                    if (args.TryGetValue("name", out var n)) kb.Name = n?.ToString() ?? kb.Name;
                    if (args.TryGetValue("description", out var d)) kb.Description = d?.ToString();
                });
            });

        RegisterTool("delete_knowledge_base", "删除知识库。关键词：删除知识库",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "id 必填" };
                var result = await _knowledgeService.DeleteAsync(id);
                return result ? new { message = "知识库删除成功" } : new { error = "知识库删除失败" };
            });

        RegisterTool("get_knowledge_documents", "获取知识库下的文档列表。关键词：文档列表,知识文档",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object>
                {
                    ["knowledgeBaseId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "知识库ID" },
                    ["keyword"] = new Dictionary<string, object> { ["type"] = "string" }
                },
                PaginationSchema()
            )),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args);
                var kbId = args.GetValueOrDefault("knowledgeBaseId")?.ToString();
                var keyword = args.GetValueOrDefault("keyword")?.ToString();
                if (string.IsNullOrEmpty(kbId)) return new { error = "knowledgeBaseId 必填" };
                var result = await _documentService.GetDocumentsAsync(kbId, new Platform.ServiceDefaults.Models.ProTableRequest { Current = page, PageSize = pageSize, Search = keyword });
                var items = await result.Queryable.ToListAsync();
                return new { items, rowCount = result.RowCount, currentPage = result.CurrentPage, pageSize = result.PageSize, pageCount = result.PageCount };
            });

        RegisterTool("get_knowledge_document_detail", "获取知识文档详情。关键词：文档详情,查看文档",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "id 必填" };
                return await _documentService.GetByIdAsync(id);
            });

        RegisterTool("create_knowledge_document", "创建知识文档。关键词：创建文档,新增文档",
            ObjectSchema(new Dictionary<string, object>
            {
                ["knowledgeBaseId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "所属知识库ID" },
                ["title"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "文档标题" },
                ["content"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "文档内容" }
            }, ["knowledgeBaseId", "title"]),
            async (args, uid) =>
            {
                var kbId = args.GetValueOrDefault("knowledgeBaseId")?.ToString();
                var title = args.GetValueOrDefault("title")?.ToString();
                if (string.IsNullOrEmpty(kbId) || string.IsNullOrEmpty(title)) return new { error = "knowledgeBaseId 和 title 必填" };
                return await _documentService.CreateAsync(new KnowledgeDocument
                {
                    KnowledgeBaseId = kbId,
                    Title = title,
                    Content = args.GetValueOrDefault("content")?.ToString() ?? ""
                });
            });

        RegisterTool("update_knowledge_document", "更新知识文档。关键词：修改文档,更新文档",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string" },
                ["title"] = new Dictionary<string, object> { ["type"] = "string" },
                ["content"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "id 必填" };
                return await _documentService.UpdateAsync(id, doc =>
                {
                    if (args.TryGetValue("title", out var t)) doc.Title = t?.ToString() ?? doc.Title;
                    if (args.TryGetValue("content", out var c)) doc.Content = c?.ToString() ?? doc.Content;
                });
            });

        RegisterTool("delete_knowledge_document", "删除知识文档。关键词：删除文档",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "id 必填" };
                var result = await _documentService.DeleteAsync(id);
                return result ? new { message = "文档删除成功" } : new { error = "文档删除失败" };
            });

        RegisterTool("search_knowledge", "检索知识库相关内容。关键词：搜索知识,知识检索",
            ObjectSchema(new Dictionary<string, object>
            {
                ["query"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" },
                ["knowledgeBaseIds"] = new Dictionary<string, object> { ["type"] = "array", ["items"] = new Dictionary<string, object> { ["type"] = "string" }, ["description"] = "知识库ID列表" },
                ["topK"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "返回结果数量，默认3" }
            }, ["query"]),
            async (args, uid) =>
            {
                var query = args.GetValueOrDefault("query")?.ToString();
                var topK = int.TryParse(args.GetValueOrDefault("topK")?.ToString(), out var k) ? k : 3;
                List<string> kbIds = new();
                if (args.TryGetValue("knowledgeBaseIds", out var kbObj) && kbObj is System.Text.Json.JsonElement kbArr)
                {
                    kbIds = System.Text.Json.JsonSerializer.Deserialize<List<string>>(kbArr.GetRawText()) ?? new List<string>();
                }
                return await _knowledgeService.SearchAsync(query ?? "", kbIds, topK);
            });
    }
}