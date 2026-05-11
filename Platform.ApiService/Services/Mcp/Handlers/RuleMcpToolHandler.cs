using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Services.Mcp.Handlers;

public class RuleMcpToolHandler : McpToolHandlerBase
{
    private readonly IRuleService _ruleService;

    public RuleMcpToolHandler(IRuleService ruleService)
    {
        _ruleService = ruleService;

        RegisterTool("get_rules", "获取规则列表，支持分页。关键词：规则,规则列表,规则引擎,规则管理",
            ObjectSchema(MergeProperties(
                new Dictionary<string, object>(),
                PaginationSchema()
            )),
            async (args, uid) =>
            {
                var (Current, PageSize) = ParsePaginationArgs(args);
                var result = await _ruleService.GetRulesAsync(new ProTableRequest { Current = Current, PageSize = PageSize });
                return result;
            });

        RegisterTool("get_rule_detail", "获取规则详细信息。关键词：规则详情,查看规则",
            ObjectSchema(new Dictionary<string, object>
            {
                ["id"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "规则ID" }
            }, ["id"]),
            async (args, uid) =>
            {
                var id = args.GetValueOrDefault("id")?.ToString();
                if (string.IsNullOrEmpty(id)) return new { error = "id 必填" };
                var rule = await _ruleService.GetRuleByIdAsync(id);
                if (rule == null) return new { error = "规则不存在" };
                return rule;
            });

        RegisterTool("create_rule", "创建新规则。关键词：创建规则,新建规则,添加规则",
            ObjectSchema(new Dictionary<string, object>
            {
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "规则名称" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "规则描述" },
                ["condition"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "触发条件" },
                ["action"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "执行动作" }
            }, ["name"]),
            async (args, uid) =>
            {
                var name = args.GetValueOrDefault("name")?.ToString();
                if (string.IsNullOrEmpty(name)) return new { error = "规则名称必填" };
                var rule = await _ruleService.CreateRuleAsync(new CreateRuleRequest
                {
                    Name = name,
                    Desc = args.GetValueOrDefault("desc")?.ToString()
                });
                return new { rule.Key, rule.Name, message = "规则创建成功" };
            });

        RegisterTool("update_rule", "更新规则信息。关键词：修改规则,编辑规则,更新规则",
            ObjectSchema(new Dictionary<string, object>
            {
                ["key"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "规则Key" },
                ["name"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "规则名称" },
                ["description"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "规则描述" },
                ["condition"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "触发条件" },
                ["action"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "执行动作" }
            }, ["key"]),
            async (args, uid) =>
            {
                if (!int.TryParse(args.GetValueOrDefault("key")?.ToString(), out var key))
                    return new { error = "key 必填且为数字" };
                var updated = await _ruleService.UpdateRuleAsync(key.ToString(), new UpdateRuleRequest
                {
                    Key = key,
                    Name = args.GetValueOrDefault("name")?.ToString(),
                    Desc = args.GetValueOrDefault("desc")?.ToString()
                });
                if (updated == null) return new { error = "规则不存在" };
                return updated;
            });

        RegisterTool("delete_rule", "删除规则。关键词：删除规则,移除规则",
            ObjectSchema(new Dictionary<string, object>
            {
                ["key"] = new Dictionary<string, object> { ["type"] = "integer", ["description"] = "规则Key" }
            }, ["key"]),
            async (args, uid) =>
            {
                if (!int.TryParse(args.GetValueOrDefault("key")?.ToString(), out var key))
                    return new { error = "key 必填且为数字" };
                var success = await _ruleService.DeleteRulesAsync(new List<int> { key });
                return new { success, message = success ? "规则删除成功" : "删除失败" };
            });
    }
}
