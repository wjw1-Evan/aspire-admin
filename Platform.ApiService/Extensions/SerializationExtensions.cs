using System.Text.Json;
using System.Collections;
using System.Collections.Generic;

namespace Platform.ApiService.Extensions
{
    /// <summary>
    /// 序列化扩展方法
    /// </summary>
    public static class SerializationExtensions
    {
        /// <summary>
        /// 将 System.Text.Json.JsonElement 等不可直接序列化的类型转换为可被 MongoDB 驱动序列化的基础 CLR 类型。
        /// 同时递归处理字典与数组中的嵌套值。
        /// </summary>
        public static object? SanitizeForMongo(object? value)
        {
            if (value == null)
            {
                return null;
            }

            try
            {
                if (value is JsonElement je)
                {
                    return ConvertJsonElement(je);
                }

                // 递归处理字典
                if (value is Dictionary<string, object> dict)
                {
                    return SanitizeDictionary(dict);
                }

                // 递归处理数组/列表（排除字符串）
                if (value is IEnumerable enumerable && value is not string)
                {
                    var list = new List<object?>();
                    foreach (var item in enumerable)
                    {
                        list.Add(SanitizeForMongo(item));
                    }
                    return list;
                }

                // 检查是否是基本类型
                if (IsBasicType(value))
                {
                    return value;
                }

                // 对于复杂对象，尝试转换为字符串
                return value.ToString() ?? string.Empty;
            }
            catch (Exception ex)
            {
                // 记录错误但返回安全的默认值
                System.Diagnostics.Debug.WriteLine($"Error sanitizing value of type {value?.GetType()}: {ex.Message}");
                return value?.ToString() ?? string.Empty;
            }
        }

        /// <summary>
        /// 检查是否是MongoDB支持的基本类型
        /// </summary>
        private static bool IsBasicType(object value)
        {
            var type = value.GetType();
            return type.IsPrimitive || 
                   type == typeof(string) || 
                   type == typeof(DateTime) || 
                   type == typeof(DateTimeOffset) ||
                   type == typeof(decimal) ||
                   type == typeof(Guid) ||
                   type.IsEnum;
        }

        /// <summary>
        /// 递归清洗字典中的值，移除 JsonElement 等不可序列化的类型。
        /// </summary>
        public static Dictionary<string, object> SanitizeDictionary(Dictionary<string, object> source)
        {
            if (source == null)
            {
                return new Dictionary<string, object>();
            }

            var result = new Dictionary<string, object>(source.Count);
            foreach (var kv in source)
            {
                try
                {
                    // 确保键名是有效的字符串
                    if (string.IsNullOrWhiteSpace(kv.Key))
                    {
                        continue; // 跳过无效的键
                    }

                    var sanitized = SanitizeForMongo(kv.Value);
                    result[kv.Key] = sanitized ?? (object)string.Empty;
                }
                catch (Exception ex)
                {
                    // 记录错误但继续处理其他键值对
                    System.Diagnostics.Debug.WriteLine($"Error sanitizing key '{kv.Key}': {ex.Message}");
                    result[kv.Key] = string.Empty; // 使用空字符串作为默认值
                }
            }
            return result;
        }

        private static object? ConvertJsonElement(JsonElement element)
        {
            try
            {
                switch (element.ValueKind)
                {
                    case JsonValueKind.Object:
                        var objDict = new Dictionary<string, object>();
                        foreach (var prop in element.EnumerateObject())
                        {
                            try
                            {
                                var sanitized = SanitizeForMongo(prop.Value);
                                objDict[prop.Name] = sanitized ?? (object)string.Empty;
                            }
                            catch (Exception ex)
                            {
                                System.Diagnostics.Debug.WriteLine($"Error processing property '{prop.Name}': {ex.Message}");
                                objDict[prop.Name] = string.Empty;
                            }
                        }
                        return objDict;
                    case JsonValueKind.Array:
                        var list = new List<object?>();
                        foreach (var item in element.EnumerateArray())
                        {
                            try
                            {
                                list.Add(SanitizeForMongo(item));
                            }
                            catch (Exception ex)
                            {
                                System.Diagnostics.Debug.WriteLine($"Error processing array item: {ex.Message}");
                                list.Add(string.Empty);
                            }
                        }
                        return list;
                    case JsonValueKind.String:
                        return element.GetString() ?? string.Empty;
                    case JsonValueKind.Number:
                        if (element.TryGetInt64(out var l)) return l;
                        if (element.TryGetDouble(out var d)) return d;
                        // 回退到原始文本
                        return element.GetRawText();
                    case JsonValueKind.True:
                        return true;
                    case JsonValueKind.False:
                        return false;
                    case JsonValueKind.Null:
                    case JsonValueKind.Undefined:
                    default:
                        return null;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error converting JsonElement: {ex.Message}");
                return element.GetRawText();
            }
        }
    }
}
