using System.Text.RegularExpressions;
using System.Text.Json;
using Platform.ApiService.Models.Workflow;

namespace Platform.ApiService.Workflows.Utilities;

/// <summary>
/// Dify 风格变量解析器 - 支持 {{#node_id.field#}} 和 {{variable}} 格式
/// </summary>
public static class DifyVariableResolver
{
    private static readonly Regex VariableRegex = new(@"\{\{(.+?)\}\}", RegexOptions.Compiled);

    /// <summary>
    /// 解析字符串中的所有变量占位符
    /// </summary>
    public static string Resolve(string template, Dictionary<string, object?> variables)
    {
        if (string.IsNullOrEmpty(template)) return template;

        return VariableRegex.Replace(template, match =>
        {
            if (match.Groups.Count < 2) return match.Value;
            var rawContent = match.Groups[1].Value.Trim();
            // System.Console.WriteLine($"[DifyVariableResolver] Resolve found match: '{rawContent}'");
            
            // 1. 处理默认值语法: {{var || 'default'}}
            string path;
            string defaultValue = string.Empty;
            
            if (rawContent.Contains("||"))
            {
                var orParts = rawContent.Split("||", 2);
                path = orParts[0].Trim();
                if (orParts.Length > 1) 
                {
                    defaultValue = orParts[1].Trim('\'', '\"', ' ');
                }
            }
            else
            {
                path = rawContent;
            }

            // 2. 处理 Filter 语法: path | filter
            string? filter = null;
            if (path.Contains("|"))
            {
                var filterParts = path.Split('|', 2);
                path = filterParts[0].Trim();
                if (filterParts.Length > 1)
                {
                    filter = filterParts[1].Trim().ToLowerInvariant();
                }
            }

            var value = GetValueByPath(path, variables);

            if (value == null || (value is string s && string.IsNullOrEmpty(s)))
            {
                // System.Console.WriteLine($"[DifyVariableResolver]   Value for '{path}' is null/empty, returning default: '{defaultValue}'");
                return defaultValue;
            }

            // 执行 Filter
            if (filter == "json")
            {
                try 
                {
                    return JsonSerializer.Serialize(value, new JsonSerializerOptions { WriteIndented = false });
                }
                catch (Exception ex)
                {
                    System.Console.WriteLine($"[DifyVariableResolver]   JSON filter failed for '{path}': {ex.Message}");
                    return value?.ToString() ?? defaultValue;
                }
            }

            return value?.ToString() ?? defaultValue;
        });
    }

    /// <summary>
    /// 根据路径从变量字典中提取值
    /// </summary>
    /// <param name="path">支持 #node_id.field 或 simple_var</param>
    /// <param name="variables">当前的变量上下文</param>
    public static object? GetValueByPath(string path, Dictionary<string, object?> variables)
    {
        if (string.IsNullOrEmpty(path)) return null;
        
        // System.Console.WriteLine($"[DifyVariableResolver] Resolving path: '{path}'");

        try 
        {
            // 处理 Dify 格式: #node_id.field (或者 #node_id.output)
            if (path.StartsWith("#"))
            {
                var difyParts = path.TrimStart('#').Split('.');
                if (difyParts.Length >= 2)
                {
                    var nodeId = difyParts[0];
                    var field = difyParts[1];

                    // 1. 尝试直接从变量字典查找完整路径 (引擎现在会同步存储此路径)
                    if (variables.TryGetValue(path, out var val)) return val;
                    
                    // 2. 尝试查找 nodes.{nodeId}.{field} (由引擎标准化存储)
                    if (variables.TryGetValue($"nodes.{nodeId}.{field}", out var standardizedVal)) return standardizedVal;
                    
                    // 3. 回退兼容性查找: 如果 field 是 "output", 尝试查找 node_id.output
                    if (variables.TryGetValue($"{nodeId}.{field}", out var nodeVal)) return nodeVal;
                }
            }

            // 处理普通格式
            if (variables.TryGetValue(path, out var simpleVal)) return simpleVal;

            // 支持深层次解析 (如 user.name)
            if (path.Contains("."))
            {
                return GetDeepValue(path, variables);
            }
        }
        catch (Exception ex)
        {
            System.Console.WriteLine($"[DifyVariableResolver] Fatal error in GetValueByPath for path '{path}': {ex.Message}");
        }

        return null;
    }

    private static object? GetDeepValue(string path, Dictionary<string, object?> variables)
    {
        try 
        {
            var parts = path.Split('.');
            if (parts.Length == 0) return null;

            if (!variables.TryGetValue(parts[0], out var current)) return null;

            for (int i = 1; i < parts.Length; i++)
            {
                if (current == null) return null;
                
                var part = parts[i];
                
                // 尝试作为 JSON 元素处理
                if (current is JsonElement element)
                {
                    if (element.ValueKind == JsonValueKind.Object && element.TryGetProperty(part, out var nextElement))
                    {
                        current = nextElement;
                        continue;
                    }
                    
                    // 支持数组索引，例如 items.0
                    if (element.ValueKind == JsonValueKind.Array && int.TryParse(part, out var arrayIndex))
                    {
                        if (arrayIndex >= 0 && arrayIndex < element.GetArrayLength())
                        {
                            current = element[arrayIndex];
                            continue;
                        }
                    }
                    return null;
                }

                // 尝试通过反射获取属性 (如果是普通对象)
                var property = current.GetType().GetProperty(part);
                if (property != null)
                {
                    current = property.GetValue(current);
                }
                else
                {
                    return null;
                }
            }

            return current;
        }
        catch (Exception ex)
        {
            // 防止崩溃，记录日志或直接返回 null
            System.Console.WriteLine($"[DifyVariableResolver] Error resolving deep path '{path}': {ex.Message}");
            return null;
        }
    }
}
