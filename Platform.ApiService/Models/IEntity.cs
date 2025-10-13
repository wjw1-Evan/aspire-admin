namespace Platform.ApiService.Models;

/// <summary>
/// 实体基础接口，所有实体都应实现此接口
/// </summary>
public interface IEntity
{
    /// <summary>
    /// 实体ID
    /// </summary>
    string? Id { get; set; }
}

/// <summary>
/// 命名实体接口，用于有名称属性的实体
/// </summary>
public interface INamedEntity : IEntity
{
    /// <summary>
    /// 实体名称
    /// </summary>
    string Name { get; set; }
}
