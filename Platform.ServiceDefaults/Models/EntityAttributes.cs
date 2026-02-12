using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 标准实体特性扩展方法
/// </summary>
public static class EntityAttributeExtensions
{
    /// <summary>
    /// 获取实体的标准集合名称
    /// </summary>
    public static string GetCollectionName<T>() where T : class, IEntity
    {
        var typeName = typeof(T).Name;
        return typeName.EndsWith("y") ? typeName.Substring(0, typeName.Length - 1) + "ies" : 
               typeName.EndsWith("s") ? typeName : typeName + "s";
    }
    
    /// <summary>
    /// 获取字段的标准 BSON 元素名称
    /// </summary>
    public static string GetBsonElementName(string propertyName)
    {
        // 转换为 camelCase
        return char.ToLowerInvariant(propertyName[0]) + propertyName.Substring(1);
    }
}