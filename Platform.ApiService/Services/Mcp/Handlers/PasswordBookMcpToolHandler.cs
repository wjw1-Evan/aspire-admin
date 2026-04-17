using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 密码本 MCP 工具处理器
/// </summary>
public class PasswordBookMcpToolHandler : McpToolHandlerBase
{
    private readonly IPasswordBookService _passwordBookService;
    private readonly IPasswordGeneratorService _passwordGeneratorService;
    private readonly ILogger<PasswordBookMcpToolHandler> _logger;

    public PasswordBookMcpToolHandler(
        IPasswordBookService passwordBookService,
        IPasswordGeneratorService passwordGeneratorService,
        ILogger<PasswordBookMcpToolHandler> logger)
    {
        _passwordBookService = passwordBookService;
        _passwordGeneratorService = passwordGeneratorService;
        _logger = logger;

        RegisterTool("get_password_entries", "获取密码本条目列表，支持分页和关键词搜索。关键词：密码列表,密码本,账号列表",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object> { ["keyword"] = new Dictionary<string, object> { ["type"] = "string" } },
                PaginationSchema()
            )),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args);
                var keyword = args.GetValueOrDefault("keyword")?.ToString();
                var result = await _passwordBookService.GetEntriesAsync(new ProTableRequest { Page = page, PageSize = pageSize, Search = keyword }, uid);
                var items = await result.Queryable.ToListAsync();
                return new { items, rowCount = result.RowCount, currentPage = result.CurrentPage, pageSize = result.PageSize, pageCount = result.PageCount };
            });

        RegisterTool("get_password_entry_detail", "获取密码本条目详情（包含明文密码）。关键词：密码详情,查看密码",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "id 必填" };
                return await _passwordBookService.GetEntryByIdAsync(id, uid);
            });

        RegisterTool("create_password_entry", "创建密码本条目。关键词：创建密码,新增账号",
            ObjectSchema(new Dictionary<string, object>
            {
                ["title"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "标题/名称" },
                ["username"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "用户名/账号" },
                ["password"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "密码" },
                ["url"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "网址" },
                ["category"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "分类" },
                ["notes"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "备注" }
            }, ["title"]),
            async (args, uid) =>
            {
                var title = args.GetValueOrDefault("title")?.ToString();
                if (string.IsNullOrEmpty(title)) return new { error = "title 必填" };
                return await _passwordBookService.CreateEntryAsync(new CreatePasswordBookEntryRequest
                {
                    Platform = title,
                    Account = args.GetValueOrDefault("username")?.ToString() ?? string.Empty,
                    Password = args.GetValueOrDefault("password")?.ToString() ?? string.Empty,
                    Url = args.GetValueOrDefault("url")?.ToString(),
                    Category = args.GetValueOrDefault("category")?.ToString(),
                    Notes = args.GetValueOrDefault("notes")?.ToString()
                }, uid);
            });

        RegisterTool("update_password_entry", "更新密码本条目。关键词：修改密码,更新账号",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string" },
                ["title"] = new Dictionary<string, object> { ["type"] = "string" },
                ["username"] = new Dictionary<string, object> { ["type"] = "string" },
                ["password"] = new Dictionary<string, object> { ["type"] = "string" },
                ["url"] = new Dictionary<string, object> { ["type"] = "string" },
                ["category"] = new Dictionary<string, object> { ["type"] = "string" },
                ["notes"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "id 必填" };
                return await _passwordBookService.UpdateEntryAsync(id, new UpdatePasswordBookEntryRequest
                {
                    Platform = args.GetValueOrDefault("title")?.ToString(),
                    Account = args.GetValueOrDefault("username")?.ToString(),
                    Password = args.GetValueOrDefault("password")?.ToString(),
                    Url = args.GetValueOrDefault("url")?.ToString(),
                    Category = args.GetValueOrDefault("category")?.ToString(),
                    Notes = args.GetValueOrDefault("notes")?.ToString()
                }, uid);
            });

        RegisterTool("delete_password_entry", "删除密码本条目。关键词：删除密码,删除账号",
            ObjectSchema(new Dictionary<string, object> { ["id"] = new Dictionary<string, object> { ["type"] = "string" } }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "id 必填" };
                var result = await _passwordBookService.DeleteEntryAsync(id, uid);
                return result ? new { message = "密码条目删除成功" } : new { error = "密码条目删除失败" };
            });

        RegisterTool("generate_password", "生成随机密码。关键词：生成密码,随机密码",
            ObjectSchema(new Dictionary<string, object>
            {
                ["length"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "密码长度，默认16" },
                ["includeUppercase"] = new Dictionary<string, object> { ["type"] = "boolean", ["description"] = "包含大写字母，默认true" },
                ["includeLowercase"] = new Dictionary<string, object> { ["type"] = "boolean", ["description"] = "包含小写字母，默认true" },
                ["includeNumbers"] = new Dictionary<string, object> { ["type"] = "boolean", ["description"] = "包含数字，默认true" },
                ["includeSpecialChars"] = new Dictionary<string, object> { ["type"] = "boolean", ["description"] = "包含特殊字符，默认true" }
            }),
            (args, uid) =>
            {
                var length = int.TryParse(args.GetValueOrDefault("length")?.ToString(), out var l) ? l : 16;
                var includeUpper = args.GetValueOrDefault("includeUppercase")?.ToString() != "false";
                var includeLower = args.GetValueOrDefault("includeLowercase")?.ToString() != "false";
                var includeNumbers = args.GetValueOrDefault("includeNumbers")?.ToString() != "false";
                var includeSpecial = args.GetValueOrDefault("includeSpecialChars")?.ToString() != "false";
                var password = _passwordGeneratorService.GeneratePassword(new GeneratePasswordRequest
                {
                    Length = length,
                    IncludeUppercase = includeUpper,
                    IncludeLowercase = includeLower,
                    IncludeNumbers = includeNumbers,
                    IncludeSpecialChars = includeSpecial
                });
                return Task.FromResult<object?>(new { password });
            });

        RegisterTool("get_password_categories", "获取所有密码分类。关键词：密码分类",
            async (args, uid) => await _passwordBookService.GetCategoriesAsync());

        RegisterTool("get_password_statistics", "获取密码本统计信息。关键词：密码统计",
            async (args, uid) => await _passwordBookService.GetStatisticsAsync());
    }
}