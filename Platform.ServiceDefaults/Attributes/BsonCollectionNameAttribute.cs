using System;

namespace Platform.ServiceDefaults.Attributes;

/// <summary>
/// 自定义 MongoDB 集合名称特性
/// 用于指定实体类对应的数据库集合名称
/// </summary>
[AttributeUsage(AttributeTargets.Class, AllowMultiple = false, Inherited = true)]
public class BsonCollectionNameAttribute : Attribute
{
    /// <summary>
    /// 集合名称
    /// </summary>
    public string Name { get; }

    /// <summary>
    /// 构造函数
    /// </summary>
    /// <param name="name">集合名称（如 "user_companies"）</param>
    public BsonCollectionNameAttribute(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Collection name cannot be null or empty", nameof(name));
        
        Name = name;
    }
}

