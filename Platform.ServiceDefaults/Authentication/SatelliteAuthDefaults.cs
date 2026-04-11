namespace Platform.ServiceDefaults.Authentication;

/// <summary>
/// 卫星服务（Storage、SystemMonitor）统一认证：用户 JWT 或服务间 X-Internal-Service-Key。
/// </summary>
public static class SatelliteAuthDefaults
{
    public const string ForwardingScheme = "SatelliteAuth";
    public const string InternalApiKeyScheme = "InternalApiKey";
}
