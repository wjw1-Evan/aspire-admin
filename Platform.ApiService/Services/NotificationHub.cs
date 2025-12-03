using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Platform.ApiService.Services;

/// <summary>
/// 兼容文件占位（避免命名冲突），实际 Hub 位于 Hubs/NotificationHub.cs
/// </summary>
[Authorize]
public class _Compat_NotificationHubPlaceholder : Hub { }

