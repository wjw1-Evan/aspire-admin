namespace Platform.ServiceDefaults.Services;

/// <summary>
/// 标记接口：表示该服务应注册为 Scoped 生命周期（请求级唯一）
/// </summary>
public interface IScopedDependency { }

/// <summary>
/// 标记接口：表示该服务应注册为 Singleton 生命周期（应用级唯一）
/// </summary>
public interface ISingletonDependency { }

/// <summary>
/// 标记接口：表示该服务应注册为 Transient 生命周期（每次获取都是新实例）
/// </summary>
public interface ITransientDependency { }
