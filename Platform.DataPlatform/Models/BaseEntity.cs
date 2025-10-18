using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.DataPlatform.Models;

/// <summary>
/// 数据平台特定的基础实体类
/// </summary>
public abstract class DataPlatformBaseEntity : BaseEntity
{
    // 可以添加数据平台特定的属性
}

/// <summary>
/// 数据平台特定的多租户实体基类
/// </summary>
public abstract class DataPlatformMultiTenantEntity : MultiTenantEntity
{
    // 可以添加数据平台特定的多租户属性
}