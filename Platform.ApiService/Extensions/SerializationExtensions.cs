using System.Text.Json;
using System.Collections;
using System.Collections.Generic;

namespace Platform.ApiService.Extensions
{
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

            return value;
        }

        /// <summary>
        /// 递归清洗字典中的值，移除 JsonElement 等不可序列化的类型。
        /// </summary>
        public static Dictionary<string, object> SanitizeDictionary(Dictionary<string, object> source)
        {
            var result = new Dictionary<string, object>(source.Count);
            foreach (var kv in source)
            {
                var sanitized = SanitizeForMongo(kv.Value);
                if (sanitized is null)
                {
                    result[kv.Key] = null!;
                }
                else
                {
                    result[kv.Key] = sanitized;
                }
            }
            return result;
        }

        private static object? ConvertJsonElement(JsonElement element)
        {
            switch (element.ValueKind)
            {
                case JsonValueKind.Object:
                    var objDict = new Dictionary<string, object>();
                    foreach (var prop in element.EnumerateObject())
                    {
                        objDict[prop.Name] = SanitizeForMongo(prop.Value);
                    }
                    return objDict;
                case JsonValueKind.Array:
                    var list = new List<object?>();
                    foreach (var item in element.EnumerateArray())
                    {
                        list.Add(SanitizeForMongo(item));
                    }
                    return list;
                case JsonValueKind.String:
                    return element.GetString();
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
    }
}
