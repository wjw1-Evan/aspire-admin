using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services.Mcp.Handlers;

/// <summary>
/// 项目管理 MCP 工具处理器
/// </summary>
public class ProjectMcpToolHandler : McpToolHandlerBase
{
    private readonly IProjectService _projectService;
    private readonly IUserService _userService;
    private readonly ILogger<ProjectMcpToolHandler> _logger;

    public ProjectMcpToolHandler(
        IProjectService projectService,
        IUserService userService,
        ILogger<ProjectMcpToolHandler> logger)
    {
        _projectService = projectService;
        _userService = userService;
        _logger = logger;

        RegisterTool("get_projects", "获取项目列表，支持分页和关键词搜索。关键词：项目列表,项目管理,项目查询",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object>
                {
                    ["keyword"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" },
                    ["status"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "项目状态: NotStarted, InProgress, OnHold, Completed, Cancelled" }
                },
                PaginationSchema()
            )),
            async (args, uid) =>
            {
                var (page, pageSize) = ParsePaginationArgs(args);
                var keyword = args.GetValueOrDefault("keyword")?.ToString();
                var status = args.GetValueOrDefault("status")?.ToString();
                var request = new Platform.ServiceDefaults.Models.PageParams { Page = page, PageSize = pageSize, Search = keyword };
                var result = await _projectService.GetProjectsListAsync(request);
                var items = await result.Queryable.ToListAsync();
                return new { items, rowCount = result.RowCount, currentPage = result.CurrentPage, pageSize = result.PageSize, pageCount = result.PageCount };
            });

        RegisterTool("get_project_detail", "获取项目详情，支持 ID 或项目名称查询。关键词：项目详情,查看项目",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "项目 ID" },
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "项目名称" }
            }),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                var name = args.GetValueOrDefault("name")?.ToString();
                if (!string.IsNullOrEmpty(id)) return await _projectService.GetProjectByIdAsync(id);
                if (!string.IsNullOrEmpty(name))
                {
                    var result = await _projectService.GetProjectsListAsync(new Platform.ServiceDefaults.Models.PageParams { Search = name, Page = 1, PageSize = 1 });
                    var items = await result.Queryable.ToListAsync();
                    var first = items.FirstOrDefault();
                    if (first != null && !string.IsNullOrEmpty(first.Id)) return await _projectService.GetProjectByIdAsync(first.Id);
                }
                return new { error = "未找到指定项目" };
            });

        RegisterTool("create_project", "创建新项目。关键词：创建项目,新建项目",
            ObjectSchema(new Dictionary<string, object>
            {
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "项目名称" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "项目描述" },
                ["status"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "项目状态，默认 NotStarted" },
                ["priority"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "优先级: Low, Medium, High, Critical" },
                ["startDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "开始日期 ISO 格式" },
                ["endDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "结束日期 ISO 格式" },
                ["managerId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "项目经理用户ID" },
                ["budget"] = new Dictionary<string, object> { ["type"] = "number", ["description"] = "预算金额" }
            }, ["name"]),
            async (args, uid) => await _projectService.CreateProjectAsync(new CreateProjectRequest
            {
                Name = args.GetValueOrDefault("name")?.ToString() ?? "",
                Description = args.GetValueOrDefault("description")?.ToString(),
                Status = int.TryParse(args.GetValueOrDefault("status")?.ToString(), out var s) ? s : (int)ProjectStatus.Planning,
                Priority = int.TryParse(args.GetValueOrDefault("priority")?.ToString(), out var p) ? p : (int)ProjectPriority.Medium,
                StartDate = DateTime.TryParse(args.GetValueOrDefault("startDate")?.ToString(), out var sd) ? sd : null,
                EndDate = DateTime.TryParse(args.GetValueOrDefault("endDate")?.ToString(), out var ed) ? ed : null,
                MemberIds = args.GetValueOrDefault("memberIds") is IEnumerable<object> mids ? mids.Select(m => m.ToString()!).ToList() : null,
                Budget = decimal.TryParse(args.GetValueOrDefault("budget")?.ToString(), out var budget) ? budget : null
            }));

        RegisterTool("update_project", "更新项目信息。关键词：修改项目,更新项目",
            ObjectSchema(new Dictionary<string, object>
            {
                ["projectId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "项目ID" },
                ["name"] = new Dictionary<string, object> { ["type"] = "string" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string" },
                ["status"] = new Dictionary<string, object> { ["type"] = "string" },
                ["priority"] = new Dictionary<string, object> { ["type"] = "string" },
                ["progress"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "进度 0-100" }
            }, ["projectId"]),
            async (args, uid) =>
            {
                var projectId = args.GetValueOrDefault("projectId")?.ToString();
                if (string.IsNullOrEmpty(projectId)) return new { error = "projectId 必填" };
                return await _projectService.UpdateProjectAsync(new UpdateProjectRequest
                {
                    ProjectId = projectId,
                    Name = args.GetValueOrDefault("name")?.ToString(),
                    Description = args.GetValueOrDefault("description")?.ToString(),
                    Status = int.TryParse(args.GetValueOrDefault("status")?.ToString(), out var s) ? s : null,
                    Priority = int.TryParse(args.GetValueOrDefault("priority")?.ToString(), out var p) ? p : null
                }, uid);
            });

        RegisterTool("delete_project", "删除项目（软删除）。关键词：删除项目",
            ObjectSchema(new Dictionary<string, object>
            {
                ["projectId"] = new Dictionary<string, object> { ["type"] = "string" },
                ["reason"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "删除原因" }
            }, ["projectId"]),
            async (args, uid) =>
            {
                var projectId = args.GetValueOrDefault("projectId")?.ToString();
                if (string.IsNullOrEmpty(projectId)) return new { error = "projectId 必填" };
                var result = await _projectService.DeleteProjectAsync(projectId, uid, args.GetValueOrDefault("reason")?.ToString());
                return result ? new { message = "项目删除成功" } : new { error = "项目删除失败" };
            });

        RegisterTool("get_project_members", "获取项目成员列表。关键词：项目成员,团队成员",
            ObjectSchema(new Dictionary<string, object> { ["projectId"] = new Dictionary<string, object> { ["type"] = "string" } }, ["projectId"]),
            async (args, uid) =>
            {
                var projectId = args.GetValueOrDefault("projectId")?.ToString();
                if (string.IsNullOrEmpty(projectId)) return new { error = "projectId 必填" };
                return await _projectService.GetProjectMembersAsync(projectId);
            });

        RegisterTool("add_project_member", "添加项目成员。关键词：添加成员,新增成员",
            ObjectSchema(new Dictionary<string, object>
            {
                ["projectId"] = new Dictionary<string, object> { ["type"] = "string" },
                ["userId"] = new Dictionary<string, object> { ["type"] = "string" },
                ["role"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "成员角色: Manager, Member, Viewer" },
                ["allocation"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "工作分配百分比" }
            }, ["projectId", "userId"]),
            async (args, uid) => await _projectService.AddProjectMemberAsync(new AddProjectMemberRequest
            {
                ProjectId = args.GetValueOrDefault("projectId")?.ToString() ?? "",
                UserId = args.GetValueOrDefault("userId")?.ToString() ?? "",
                Role = int.TryParse(args.GetValueOrDefault("role")?.ToString(), out var r) ? r : (int)ProjectMemberRole.Member,
                Allocation = int.TryParse(args.GetValueOrDefault("allocation")?.ToString(), out var a) ? a : 100
            }));

        RegisterTool("remove_project_member", "移除项目成员。关键词：移除成员,删除成员",
            ObjectSchema(new Dictionary<string, object>
            {
                ["projectId"] = new Dictionary<string, object> { ["type"] = "string" },
                ["memberUserId"] = new Dictionary<string, object> { ["type"] = "string" }
            }, ["projectId", "memberUserId"]),
            async (args, uid) =>
            {
                var projectId = args.GetValueOrDefault("projectId")?.ToString();
                var memberUserId = args.GetValueOrDefault("memberUserId")?.ToString();
                if (string.IsNullOrEmpty(projectId) || string.IsNullOrEmpty(memberUserId)) return new { error = "projectId 和 memberUserId 必填" };
                var result = await _projectService.RemoveProjectMemberAsync(projectId, memberUserId);
                return result ? new { message = "成员移除成功" } : new { error = "成员移除失败" };
            });

        RegisterTool("get_project_statistics", "获取项目统计信息。关键词：项目统计,项目概览",
            async (args, uid) => await _projectService.GetProjectStatisticsAsync());
    }
}