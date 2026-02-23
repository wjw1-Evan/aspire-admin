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
    /// <inheritdoc />
    public async Task<McpListToolsResponse> ListToolsAsync()
    {
        // 检查缓存
        if (_cachedTools != null && DateTime.UtcNow.Subtract(_toolsCacheTime).TotalSeconds < CacheDurationSeconds)
        {
            _logger.LogInformation("使用缓存的 MCP 工具列表");
            return new McpListToolsResponse { Tools = _cachedTools };
        }

        var tools = new List<McpTool>
        {
            new()
            {
                Name = "get_user_info",
                Description = "获取用户信息。可以通过用户ID、用户名或邮箱查询用户详细信息。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["userId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "用户ID（可选，如果提供则直接查询）"
                        },
                        ["username"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "用户名（可选）"
                        },
                        ["email"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "邮箱地址（可选）"
                        }
                    }
                }
            },
            new()
            {
                Name = "search_users",
                Description = "搜索用户列表。支持按关键词、状态等条件搜索用户。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "搜索关键词（用户名、邮箱等）"
                        },
                        ["status"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "用户状态（active/inactive）",
                            ["enum"] = new[] { "active", "inactive" }
                        },
                        ["page"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "页码（从1开始）",
                            ["default"] = 1,
                            ["minimum"] = 1
                        },
                        ["pageSize"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "每页数量",
                            ["default"] = 20,
                            ["minimum"] = 1,
                            ["maximum"] = 100
                        }
                    }
                }
            },
            new()
            {
                Name = "get_chat_sessions",
                Description = "获取聊天会话列表。可以查询当前用户的所有聊天会话。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "搜索关键词（会话标题）"
                        },
                        ["page"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "页码（从1开始）",
                            ["default"] = 1,
                            ["minimum"] = 1
                        },
                        ["pageSize"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "每页数量",
                            ["default"] = 20,
                            ["minimum"] = 1,
                            ["maximum"] = 100
                        }
                    }
                }
            },
            new()
            {
                Name = "get_chat_messages",
                Description = "获取聊天消息列表。可以查询指定会话的所有消息。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "sessionId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["sessionId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "会话ID（必填）"
                        },
                        ["page"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "页码（从1开始）",
                            ["default"] = 1,
                            ["minimum"] = 1
                        },
                        ["pageSize"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "每页数量",
                            ["default"] = 20,
                            ["minimum"] = 1,
                            ["maximum"] = 200
                        }
                    }
                }
            },
            new()
            {
                Name = "get_nearby_users",
                Description = "获取附近的用户列表。基于地理位置查找附近的用户。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "center" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["center"] = new Dictionary<string, object>
                        {
                            ["type"] = "object",
                            ["required"] = new[] { "latitude", "longitude" },
                            ["properties"] = new Dictionary<string, object>
                            {
                                ["latitude"] = new Dictionary<string, object>
                                {
                                    ["type"] = "number",
                                    ["description"] = "纬度（-90 到 90）"
                                },
                                ["longitude"] = new Dictionary<string, object>
                                {
                                    ["type"] = "number",
                                    ["description"] = "经度（-180 到 180）"
                                }
                            }
                        },
                        ["radiusMeters"] = new Dictionary<string, object>
                        {
                            ["type"] = "number",
                            ["description"] = "搜索半径（米）",
                            ["default"] = 2000,
                            ["minimum"] = 100,
                            ["maximum"] = 20000
                        },
                        ["limit"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "返回数量限制",
                            ["default"] = 20,
                            ["minimum"] = 1,
                            ["maximum"] = 50
                        }
                    }
                }
            },
            new()
            {
                Name = "get_company_info",
                Description = "获取企业信息。可以查询当前企业或指定企业的详细信息。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["companyId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "企业ID（可选，不提供则查询当前企业）"
                        }
                    }
                }
            },
            new()
            {
                Name = "search_companies",
                Description = "搜索企业列表。支持按关键词搜索企业。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "搜索关键词（企业名称、代码等）"
                        }
                    }
                }
            },
            new()
            {
                Name = "get_all_roles",
                Description = "获取所有角色列表。可以查询系统中的所有角色信息，包括角色名称、描述、权限等。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["includeStats"] = new Dictionary<string, object>
                        {
                            ["type"] = "boolean",
                            ["description"] = "是否包含统计信息（用户数量等）",
                            ["default"] = false
                        }
                    }
                }
            },
            new()
            {
                Name = "get_role_info",
                Description = "获取角色详细信息。可以通过角色ID查询角色的详细信息，包括权限、菜单等。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "roleId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["roleId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "角色ID（必填）"
                        }
                    }
                }
            },
            new()
            {
                Name = "get_my_activity_logs",
                Description = "获取我的活动日志。可以查询当前用户的活动记录，包括操作类型、时间、IP地址等。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["action"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "操作类型（可选，如：login、logout、create、update、delete等）"
                        },
                        ["startDate"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "开始日期（可选，ISO 8601格式，如：2024-01-01T00:00:00Z）"
                        },
                        ["endDate"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "结束日期（可选，ISO 8601格式）"
                        },
                        ["page"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "页码（从1开始）",
                            ["default"] = 1,
                            ["minimum"] = 1
                        },
                        ["pageSize"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "每页数量",
                            ["default"] = 20,
                            ["minimum"] = 1,
                            ["maximum"] = 100
                        }
                    }
                }
            },
            new()
            {
                Name = "get_tasks",
                Description = "获取任务列表。支持按状态、优先级、分配人等条件查询任务。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["status"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "任务状态（0=待分配, 1=已分配, 2=执行中, 3=已完成, 4=已取消, 5=失败, 6=暂停）"
                        },
                        ["priority"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "优先级（0=低, 1=中, 2=高, 3=紧急）"
                        },
                        ["assignedTo"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "分配给的用户ID"
                        },
                        ["projectId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "项目ID（可选）"
                        },
                        ["search"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "搜索关键词（任务名称、描述等）"
                        },
                        ["page"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "页码（从1开始）",
                            ["default"] = 1,
                            ["minimum"] = 1
                        },
                        ["pageSize"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "每页数量",
                            ["default"] = 20,
                            ["minimum"] = 1,
                            ["maximum"] = 100
                        }
                    }
                }
            },
            new()
            {
                Name = "get_task_detail",
                Description = "获取任务详细信息。包括任务的完整信息、执行日志等。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "taskId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["taskId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "任务ID（必填）"
                        }
                    }
                }
            },
            new()
            {
                Name = "create_task",
                Description = "创建新任务。用于创建待分配的任务。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "taskName", "taskType" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["taskName"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "任务名称（必填）"
                        },
                        ["description"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "任务描述（可选）"
                        },
                        ["taskType"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "任务类型（必填，如：bug、feature、maintenance等）"
                        },
                        ["priority"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "优先级（0=低, 1=中, 2=高, 3=紧急）",
                            ["default"] = 1
                        },
                        ["assignedTo"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "分配给的用户ID（可选）"
                        },
                        ["projectId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "项目ID（可选）"
                        },
                        ["estimatedDuration"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "预计耗时（分钟，可选）"
                        },
                        ["tags"] = new Dictionary<string, object>
                        {
                            ["type"] = "array",
                            ["items"] = new Dictionary<string, object> { ["type"] = "string" },
                            ["description"] = "标签列表（可选）"
                        },
                        ["plannedStartTime"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "计划开始时间（ISO 8601，可选，如：2025-12-03T10:00:00Z）"
                        },
                        ["plannedEndTime"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "计划完成时间（ISO 8601，可选）"
                        },
                        ["participantIds"] = new Dictionary<string, object>
                        {
                            ["type"] = "array",
                            ["items"] = new Dictionary<string, object> { ["type"] = "string" },
                            ["description"] = "参与者用户ID列表（可选）"
                        },
                        ["remarks"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "备注（可选）"
                        }
                    }
                }
            },
            new()
            {
                Name = "update_task",
                Description = "更新任务信息。可以更新任务的名称、描述、状态、优先级等。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "taskId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["taskId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "任务ID（必填）"
                        },
                        ["taskName"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "任务名称（可选）"
                        },
                        ["description"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "任务描述（可选）"
                        },
                        ["status"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "任务状态（可选）"
                        },
                        ["priority"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "优先级（可选）"
                        },
                        ["completionPercentage"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "完成百分比（0-100，可选）"
                        }
                    }
                }
            },
            new()
            {
                Name = "assign_task",
                Description = "分配任务给指定用户。将待分配的任务分配给具体的执行人。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "taskId", "assignedTo" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["taskId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "任务ID（必填）"
                        },
                        ["assignedTo"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "分配给的用户ID（必填）"
                        },
                        ["remarks"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "分配备注（可选）"
                        }
                    }
                }
            },
            new()
            {
                Name = "complete_task",
                Description = "完成任务。标记任务为已完成，并记录执行结果。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "taskId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["taskId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "任务ID（必填）"
                        },
                        ["executionResult"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "执行结果（0=未执行, 1=成功, 2=失败, 3=超时, 4=被中断）",
                            ["default"] = 1
                        },
                        ["remarks"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "完成备注（可选）"
                        }
                    }
                }
            },
            new()
            {
                Name = "get_task_statistics",
                Description = "获取任务统计信息。包括各状态任务数、完成率等统计数据。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["userId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "用户ID（可选，用于获取用户相关的统计）"
                        }
                    }
                }
            },
            new()
            {
                Name = "get_my_task_count",
                Description = "获取我的任务数量。快速查询当前用户的任务总数和各状态任务数。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["includeCompleted"] = new Dictionary<string, object>
                        {
                            ["type"] = "boolean",
                            ["description"] = "是否包含已完成的任务",
                            ["default"] = false
                        }
                    }
                }
            },
            new()
            {
                Name = "get_my_tasks",
                Description = "获取我的任务。获取当前用户分配给我的所有任务。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["status"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "任务状态（可选）"
                        },
                        ["projectId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "项目ID（可选）"
                        },
                        ["search"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "搜索关键词（可选）"
                        },
                        ["page"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "页码",
                            ["default"] = 1,
                            ["minimum"] = 1
                        },
                        ["pageSize"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "每页数量",
                            ["default"] = 20,
                            ["minimum"] = 1,
                            ["maximum"] = 100
                        }
                    }
                }
            },
            // 项目管理相关工具
            new()
            {
                Name = "get_projects",
                Description = "获取项目列表。支持按关键词、状态等条件查询项目。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["search"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" },
                        ["isArchived"] = new Dictionary<string, object> { ["type"] = "boolean", ["description"] = "是否已归档" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "get_project_detail",
                Description = "获取项目详细信息。包括项目基本信息、成员列表。项目ID必填。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "projectId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["projectId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "项目ID" }
                    }
                }
            },
            new()
            {
                Name = "create_project",
                Description = "创建新项目。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "name" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "项目名称" },
                        ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "项目描述" },
                        ["startDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "开始时间 (ISO 8601)" },
                        ["endDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "结束时间 (ISO 8601)" }
                    }
                }
            },
            new()
            {
                Name = "get_project_statistics",
                Description = "获取项目统计信息。",
                InputSchema = new Dictionary<string, object> { ["type"] = "object", ["properties"] = new Dictionary<string, object>() }
            },
            // 公文管理相关工具
            new()
            {
                Name = "get_documents",
                Description = "获取公文列表。支持按关键词、状态、分类等条件查询公文。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" },
                        ["status"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "公文状态 (0=草稿, 1=审批中, 2=已通过, 3=已驳回)" },
                        ["documentType"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "公文类型" },
                        ["category"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "分类" },
                        ["filterType"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "筛选类型 (all, my, pending, approved, rejected)" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "get_document_detail",
                Description = "获取公文详细信息。公文ID必填。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "documentId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["documentId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "公文ID" }
                    }
                }
            },
            new()
            {
                Name = "get_document_statistics",
                Description = "获取公文统计信息。",
                InputSchema = new Dictionary<string, object> { ["type"] = "object", ["properties"] = new Dictionary<string, object>() }
            },
            // 云存储相关工具
            new()
            {
                Name = "get_file_items",
                Description = "列出文件夹内容。parentId 必填（根目录为 'root'）。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "parentId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["parentId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "父文件夹ID ('root' 表示根目录)" },
                        ["search"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" },
                        ["fileType"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "文件类型 (all, document, image, video, audio, archive, other)" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 50 }
                    }
                }
            },
            new()
            {
                Name = "search_files",
                Description = "快速搜索全量文件。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "keyword" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "create_folder",
                Description = "在指定父目录下创建新文件夹。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "name", "parentId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "文件夹名称" },
                        ["parentId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "父文件夹ID" }
                    }
                }
            },
            new()
            {
                Name = "get_storage_usage",
                Description = "获取当前用户的存储空间使用详情。",
                InputSchema = new Dictionary<string, object> { ["type"] = "object", ["properties"] = new Dictionary<string, object>() }
            },
            // 通知中心相关工具
            new()
            {
                Name = "get_unified_notifications",
                Description = "获取统一通知中心列表。支持 filterType: all, notification, message, task, system; sortBy: datetime, priority, dueDate",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1, ["minimum"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 10, ["minimum"] = 1, ["maximum"] = 100 },
                        ["filterType"] = new Dictionary<string, object> { ["type"] = "string", ["default"] = "all" },
                        ["sortBy"] = new Dictionary<string, object> { ["type"] = "string", ["default"] = "datetime" }
                    }
                }
            },
            new()
            {
                Name = "get_unread_notification_stats",
                Description = "获取未读通知统计信息（总数、系统、通知、消息、任务）",
                InputSchema = new Dictionary<string, object> { ["type"] = "object", ["properties"] = new Dictionary<string, object>() }
            },
            new()
            {
                Name = "mark_notification_read",
                Description = "按通知ID标记为已读",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "id" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "通知ID" }
                    }
                }
            },
            new()
            {
                Name = "get_task_notifications",
                Description = "获取与当前用户相关的任务通知列表",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1, ["minimum"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 10, ["minimum"] = 1, ["maximum"] = 100 }
                    }
                }
            },
            new()
            {
                Name = "get_todos",
                Description = "获取待办事项列表。支持 sortBy: dueDate, priority, datetime",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1, ["minimum"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 10, ["minimum"] = 1, ["maximum"] = 100 },
                        ["sortBy"] = new Dictionary<string, object> { ["type"] = "string", ["default"] = "dueDate" }
                    }
                }
            },
            new()
            {
                Name = "create_todo",
                Description = "创建一个新的待办事项",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "title" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["title"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "待办标题" },
                        ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "待办描述（可选）" },
                        ["priority"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "优先级（0=低, 1=中, 2=高, 3=紧急）", ["default"] = 1 },
                        ["dueDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "截止日期（ISO格式，可选）" }
                    }
                }
            },
            new()
            {
                Name = "update_todo",
                Description = "更新待办事项信息",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "id" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "待办ID" },
                        ["title"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "新标题（可选）" },
                        ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "新描述（可选）" },
                        ["priority"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "新优先级（可选）" },
                        ["dueDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "新截止日期（可选）" },
                        ["isCompleted"] = new Dictionary<string, object> { ["type"] = "boolean", ["description"] = "是否已完成（可选）" }
                    }
                }
            },
            new()
            {
                Name = "complete_todo",
                Description = "将待办事项标记为已完成",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "id" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "待办ID" }
                    }
                }
            },
            new()
            {
                Name = "delete_todo",
                Description = "删除指定的待办事项",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "id" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "待办ID" }
                    }
                }
            },
            new()
            {
                Name = "get_system_messages",
                Description = "获取系统的所有消息通知列表",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1, ["minimum"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 10, ["minimum"] = 1, ["maximum"] = 100 }
                    }
                }
            },
            new()
            {
                Name = "mark_multiple_notifications_read",
                Description = "批量将通知标记为已读",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "ids" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["ids"] = new Dictionary<string, object>
                        {
                            ["type"] = "array",
                            ["items"] = new Dictionary<string, object> { ["type"] = "string" },
                            ["description"] = "通知ID列表"
                        }
                    }
                }
            },
            // 小科配置管理相关工具
            new()
            {
                Name = "get_xiaoke_configs",
                Description = "获取小科配置列表。支持按名称、启用状态等条件查询配置。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["name"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "配置名称（搜索关键词，可选）"
                        },
                        ["isEnabled"] = new Dictionary<string, object>
                        {
                            ["type"] = "boolean",
                            ["description"] = "是否启用（筛选条件，可选）"
                        },
                        ["page"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "页码（从1开始）",
                            ["default"] = 1,
                            ["minimum"] = 1
                        },
                        ["pageSize"] = new Dictionary<string, object>
                        {
                            ["type"] = "integer",
                            ["description"] = "每页数量",
                            ["default"] = 10,
                            ["minimum"] = 1,
                            ["maximum"] = 100
                        }
                    }
                }
            },
            new()
            {
                Name = "get_xiaoke_config",
                Description = "获取小科配置详情。通过配置ID查询配置的详细信息。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "configId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["configId"] = new Dictionary<string, object>
                        {
                            ["type"] = "string",
                            ["description"] = "配置ID（必填）"
                        }
                    }
                }
            },
            new()
            {
                Name = "get_default_xiaoke_config",
                Description = "获取当前企业的默认小科配置。返回当前企业设置的默认配置信息。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>()
                }
            },
            // 工作流管理相关工具
            new()
            {
                Name = "get_workflow_definitions",
                Description = "获取工作流定义列表。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "搜索关键词" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "get_workflow_instances",
                Description = "获取工作流实例列表。支持按状态过滤。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["status"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "状态 (0=运行中, 1=已完成, 2=已取消, 3=已拒绝)" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "get_workflow_instance_detail",
                Description = "获取工作流实例详情，包括审批历史。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "instanceId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["instanceId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "实例ID" }
                    }
                }
            },
            new()
            {
                Name = "process_workflow_approval",
                Description = "执行流程审批操作。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "instanceId", "nodeId", "action" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["instanceId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "实例ID" },
                        ["nodeId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "当前节点ID" },
                        ["action"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "动作 (0=同意, 1=拒绝, 2=退回, 3=转办)" },
                        ["comment"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "审批意见" },
                        ["delegateToUserId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "转办用户ID (动作时转办时必填)" }
                    }
                }
            },
            // 物联网相关工具
            new()
            {
                Name = "get_iot_gateways",
                Description = "获取物联网网关列表。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "get_iot_devices",
                Description = "获取物联网设备列表。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["gatewayId"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "get_iot_platform_statistics",
                Description = "获取物联网平台整体统计数据。",
                InputSchema = new Dictionary<string, object> { ["type"] = "object", ["properties"] = new Dictionary<string, object>() }
            },
            new()
            {
                Name = "get_iot_datapoints",
                Description = "获取指定设备的数据点列表。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "deviceId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["deviceId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "设备ID" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 50 }
                    }
                }
            },
            new()
            {
                Name = "get_latest_iot_data",
                Description = "获取指定数据点的最新实时值。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["required"] = new[] { "dataPointId" },
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["dataPointId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "数据点ID" }
                    }
                }
            },
            // 园区管理相关工具
            new()
            {
                Name = "get_park_buildings",
                Description = "获取园区楼宇列表。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "get_park_leads",
                Description = "获取园区招商线索列表。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "get_park_tenants",
                Description = "获取园区租户列表。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "get_park_contracts",
                Description = "获取园区租赁合同列表。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["status"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            // 园区走访相关工具
            new()
            {
                Name = "get_park_visit_tasks",
                Description = "获取园区走访任务列表。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["status"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "get_park_visit_statistics",
                Description = "获取园区走访统计数据。",
                InputSchema = new Dictionary<string, object> { ["type"] = "object", ["properties"] = new Dictionary<string, object>() }
            },
            new()
            {
                Name = "create_park_lead",
                Description = "创建新的园区招商线索。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["companyName"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "客户公司名称" },
                        ["contactPerson"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "联系人姓名" },
                        ["phone"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "联系电话" },
                        ["source"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "线索来源" },
                        ["requirements"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "租赁需求描述" }
                    },
                    ["required"] = new[] { "companyName" }
                }
            },
            new()
            {
                Name = "update_park_lead",
                Description = "更新现有的园区招商线索。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["leadId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "线索ID" },
                        ["companyName"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "新的客户公司名称" }
                    },
                    ["required"] = new[] { "leadId" }
                }
            },
            new()
            {
                Name = "delete_park_lead",
                Description = "删除指定的园区招商线索。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["leadId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "要删除的线索ID" }
                    },
                    ["required"] = new[] { "leadId" }
                }
            },
            new()
            {
                Name = "convert_park_lead_to_project",
                Description = "将高意向的招商线索转化为招商项目。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["leadId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "要转化的线索ID" }
                    },
                    ["required"] = new[] { "leadId" }
                }
            },
            new()
            {
                Name = "create_park_contract",
                Description = "创建新的园区租赁合同。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["tenantId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "绑定的租户ID" },
                        ["contractNumber"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "合同编号" },
                        ["startDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "起始日期 (YYYY-MM-DD)" },
                        ["endDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "结束日期 (YYYY-MM-DD)" },
                        ["monthlyRent"] = new Dictionary<string, object> { ["type"] = "number", ["description"] = "月租金" }
                    },
                    ["required"] = new[] { "tenantId" }
                }
            },
            new()
            {
                Name = "update_park_contract",
                Description = "更新园区租赁合同的基本信息。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["contractId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "合同ID" },
                        ["tenantId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "关联租户ID" }
                    },
                    ["required"] = new[] { "contractId" }
                }
            },
            new()
            {
                Name = "delete_park_contract",
                Description = "删除指定的园区租赁合同。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["contractId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "要删除的合同ID" }
                    },
                    ["required"] = new[] { "contractId" }
                }
            },
            new()
            {
                Name = "create_park_visit_task",
                Description = "创建新的园区企业走访任务。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["title"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "走访标题" },
                        ["managerName"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "负责人姓名" },
                        ["visitDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "计划日期 (YYYY-MM-DD)" },
                        ["tenantId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "拜访企业ID" },
                        ["details"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "走访详细目的" }
                    },
                    ["required"] = new[] { "title", "managerName", "visitDate" }
                }
            },
            new()
            {
                Name = "update_park_visit_task",
                Description = "更新园区走访任务信息。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["taskId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "任务ID" },
                        ["title"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "标题" },
                        ["managerName"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "负责人" },
                        ["visitDate"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "计划日期 (YYYY-MM-DD)" }
                    },
                    ["required"] = new[] { "taskId" }
                }
            },
            new()
            {
                Name = "delete_park_visit_task",
                Description = "删除园区走访任务。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["taskId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "要删除的任务ID" }
                    },
                    ["required"] = new[] { "taskId" }
                }
            },
            new()
            {
                Name = "get_park_service_categories",
                Description = "获取园区企业服务申请的分类列表。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "get_park_service_requests",
                Description = "获取园区企业服务申请列表，可按状态和分类筛选。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["categoryId"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["status"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "状态: 待处理, 处理中, 已完成, 已取消" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            },
            new()
            {
                Name = "get_park_service_request_detail",
                Description = "获取服务申请的详细信息和处理流转记录。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["requestId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "服务申请ID" }
                    },
                    ["required"] = new[] { "requestId" }
                }
            },
            new()
            {
                Name = "create_park_service_request",
                Description = "提交新的企业服务申请。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["categoryId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "服务分类ID" },
                        ["tenantId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "申办企业租户ID" },
                        ["title"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "申请标题" },
                        ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "具体需求描述" }
                    },
                    ["required"] = new[] { "categoryId", "tenantId", "title" }
                }
            },
            new()
            {
                Name = "update_park_service_request_status",
                Description = "更新企业服务申请的处理状态。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["requestId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "服务申请ID" },
                        ["status"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "新状态" },
                        ["resolution"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "解决方案描述" }
                    },
                    ["required"] = new[] { "requestId", "status" }
                }
            },
            new()
            {
                Name = "delete_park_service_request",
                Description = "删除企业服务申请。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["requestId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "要删除的申请ID" }
                    },
                    ["required"] = new[] { "requestId" }
                }
            },
            new()
            {
                Name = "rate_park_service_request",
                Description = "对已完成的企业服务申请进行满意度评价。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["requestId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "申请ID" },
                        ["rating"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "评分 (1-5)" },
                        ["feedback"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "评价内容" }
                    },
                    ["required"] = new[] { "requestId", "rating" }
                }
            },
            new()
            {
                Name = "get_park_service_statistics",
                Description = "获取园区企业服务的多维度统计和趋势数据。",
                InputSchema = new Dictionary<string, object> { ["type"] = "object", ["properties"] = new Dictionary<string, object>() }
            },
            // 密码本相关工具
            new()
            {
                Name = "get_password_book_entries",
                Description = "获取当前用户的密码本条目列表（不含密码）。",
                InputSchema = new Dictionary<string, object>
                {
                    ["type"] = "object",
                    ["properties"] = new Dictionary<string, object>
                    {
                        ["keyword"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["category"] = new Dictionary<string, object> { ["type"] = "string" },
                        ["page"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 1 },
                        ["pageSize"] = new Dictionary<string, object> { ["type"] = "integer", ["default"] = 20 }
                    }
                }
            }
        };

        // 添加规则配置的 MCP 工具
        try
        {
            var ruleMcpTools = await GetRuleMcpToolsAsync();
            if (ruleMcpTools.Any())
            {
                _logger.LogInformation("添加 {Count} 个规则配置的 MCP 工具", ruleMcpTools.Count);
                tools.AddRange(ruleMcpTools);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "获取规则配置的 MCP 工具时发生错误，继续使用内置工具");
        }

        // 缓存工具列表
        _cachedTools = tools;
        _toolsCacheTime = DateTime.UtcNow;

        return new McpListToolsResponse { Tools = tools };
    }
    #region 规则 MCP 集成方法

    /// <summary>
    /// 获取规则配置的 MCP 工具列表
    /// </summary>
    private async Task<List<McpTool>> GetRuleMcpToolsAsync()
    {
        try
        {
            var rules = await _ruleFactory.FindAsync(r => true, limit: 1000);

            var mcpTools = new List<McpTool>();

            foreach (var rule in rules.Where(r => r.McpConfig?.Enabled == true && !string.IsNullOrEmpty(r.McpConfig?.ToolName)))
            {
                var mcpConfig = rule.McpConfig;
                if (mcpConfig != null && !mcpConfig.IsResource && !mcpConfig.IsPrompt)
                {
                    mcpTools.Add(new McpTool
                    {
                        Name = mcpConfig.ToolName ?? string.Empty,
                        Description = mcpConfig.ToolDescription ?? rule.Desc ?? "规则配置的 MCP 工具",
                        InputSchema = mcpConfig.InputSchema ?? new Dictionary<string, object>
                        {
                            ["type"] = "object",
                            ["properties"] = new Dictionary<string, object>()
                        }
                    });
                }
            }

            _logger.LogInformation("获取到 {Count} 个规则配置的 MCP 工具", mcpTools.Count);
            return mcpTools;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取规则配置的 MCP 工具时发生错误");
            return new List<McpTool>();
        }
    }

    /// <summary>
    /// 获取规则配置的 MCP 资源列表
    /// </summary>
    private async Task<List<McpResource>> GetRuleMcpResourcesAsync()
    {
        try
        {
            var rules = await _ruleFactory.FindAsync(r => true, limit: 1000);

            var mcpResources = new List<McpResource>();

            foreach (var rule in rules.Where(r => r.McpConfig?.Enabled == true && r.McpConfig?.IsResource == true))
            {
                var mcpConfig = rule.McpConfig;
                if (mcpConfig != null && !string.IsNullOrEmpty(mcpConfig.ResourceUri))
                {
                    mcpResources.Add(new McpResource
                    {
                        Uri = mcpConfig.ResourceUri,
                        Name = rule.Name ?? "规则资源",
                        Description = rule.Desc,
                        MimeType = mcpConfig.ResourceMimeType ?? "application/json"
                    });
                }
            }

            _logger.LogInformation("获取到 {Count} 个规则配置的 MCP 资源", mcpResources.Count);
            return mcpResources;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取规则配置的 MCP 资源时发生错误");
            return new List<McpResource>();
        }
    }

    /// <summary>
    /// 获取规则配置的 MCP 提示词列表
    /// </summary>
    private async Task<List<McpPrompt>> GetRuleMcpPromptsAsync()
    {
        try
        {
            var rules = await _ruleFactory.FindAsync(r => true, limit: 1000);

            var mcpPrompts = new List<McpPrompt>();

            foreach (var rule in rules.Where(r => r.McpConfig?.Enabled == true && r.McpConfig?.IsPrompt == true))
            {
                var mcpConfig = rule.McpConfig;
                if (mcpConfig != null && !string.IsNullOrEmpty(mcpConfig.PromptTemplate))
                {
                    mcpPrompts.Add(new McpPrompt
                    {
                        Name = rule.Name ?? "规则提示词",
                        Description = rule.Desc,
                        Arguments = mcpConfig.PromptArguments
                    });
                }
            }

            _logger.LogInformation("获取到 {Count} 个规则配置的 MCP 提示词", mcpPrompts.Count);
            return mcpPrompts;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取规则配置的 MCP 提示词时发生错误");
            return new List<McpPrompt>();
        }
    }

    #endregion
}
