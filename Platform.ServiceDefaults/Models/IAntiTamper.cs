namespace Platform.ServiceDefaults.Models;

/// <summary>
/// 支持防篡改保护的实体接口
/// </summary>
public interface IAntiTamper
{
    /// <summary>
    /// SM3 消息认证码（MAC）
    /// </summary>
    string? Sm3Mac { get; set; }
}
