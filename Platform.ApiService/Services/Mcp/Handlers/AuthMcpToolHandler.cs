using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services.Mcp.Handlers;

public class AuthMcpToolHandler : McpToolHandlerBase
{
    private readonly IAuthService _authService;
    private readonly IUserService _userService;
    private readonly IPasswordEncryptionService _encryptionService;

    public AuthMcpToolHandler(
        IAuthService authService,
        IUserService userService,
        IPasswordEncryptionService encryptionService)
    {
        _authService = authService;
        _userService = userService;
        _encryptionService = encryptionService;

        RegisterTool("get_current_user", "获取当前登录用户的详细信息，包含个人信息、角色权限、菜单导航和企业信息。关键词：当前用户,我的信息,个人资料,用户信息,CurrentUser,个人信息",
            HandleGetCurrentUserAsync);

        RegisterTool("check_username_exists", "检查用户名是否已被注册，用于注册时验证。关键词：检查用户名,用户名是否存在,用户查重,用户名可用性",
            ObjectSchema(new Dictionary<string, object>
            {
                ["username"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "待检查的用户名" },
                ["excludeUserId"] = new Dictionary<string, object> { ["type"] = "string", ["description"] = "排除的用户ID，修改用户名时使用" }
            }, ["username"]),
            HandleCheckUsernameExistsAsync);

        RegisterTool("get_public_key", "获取用于密码加密的 RSA 公钥，前端在提交登录/注册密码前需要先加密。关键词：公钥,加密密钥,RSA公钥,public key",
            HandleGetPublicKeyAsync);
    }

    private async Task<object?> HandleGetCurrentUserAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var user = await _authService.GetCurrentUserAsync(currentUserId);
        if (user == null) return new { error = "用户未登录或不存在" };

        return user;
    }

    private async Task<object?> HandleCheckUsernameExistsAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var username = arguments.GetValueOrDefault("username")?.ToString();
        if (string.IsNullOrEmpty(username)) return new { error = "用户名不能为空" };

        var excludeUserId = arguments.GetValueOrDefault("excludeUserId")?.ToString();
        var exists = await _userService.CheckUsernameExistsAsync(username, excludeUserId);
        return new { username, exists, available = !exists };
    }

    private async Task<object?> HandleGetPublicKeyAsync(Dictionary<string, object> arguments, string currentUserId)
    {
        var publicKey = _encryptionService.GetPublicKey();
        return new { publicKey, format = "RSA PEM" };
    }
}
