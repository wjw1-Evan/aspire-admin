using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;

namespace Platform.ApiService.Models;

public class CurrentUser
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    public string Username { get; set; } = string.Empty;

    public string? DisplayName { get; set; }

    public string? Avatar { get; set; }

    public string? Email { get; set; }

    public List<UserTag>? Tags { get; set; }

    public List<string> Roles { get; set; } = new();

    public List<string> Permissions { get; set; } = new();

    public List<MenuTreeNode>? Menus { get; set; }

    public string? Phone { get; set; }

    public string? City { get; set; }

    public bool IsLogin { get; set; } = true;

    public string? CurrentCompanyId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public string? CurrentCompanyDisplayName { get; set; }

    public string? CurrentCompanyName { get; set; }

    public string? CurrentCompanyLogo { get; set; }
}

public class UserTag
{
    public string? Key { get; set; }

    public string? Label { get; set; }
}

public class LoginRequest
{
    [Required(ErrorMessage = "用户名不能为空")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "用户名长度必须在3-50个字符之间")]
    public string? Username { get; set; }

    [Required(ErrorMessage = "密码不能为空")]
    [StringLength(2000, MinimumLength = 6, ErrorMessage = "密码长度不符合要求")]
    public string? Password { get; set; }

    public bool AutoLogin { get; set; }

    public string? Type { get; set; }

    public string? CaptchaId { get; set; }

    public string? CaptchaAnswer { get; set; }
}

public class LoginResult
{
    public string? Status { get; set; }

    public string? Type { get; set; }

    public string? CurrentAuthority { get; set; }

    public string? Token { get; set; }

    public string? RefreshToken { get; set; }

    public DateTime? ExpiresAt { get; set; }
}

public class RegisterRequest
{
    [Required(ErrorMessage = "用户名不能为空")]
    [StringLength(20, MinimumLength = 3, ErrorMessage = "用户名长度必须在3-20个字符之间")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "密码不能为空")]
    [StringLength(2000, MinimumLength = 6, ErrorMessage = "密码长度不符合要求")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "邮箱不能为空")]
    [EmailAddress(ErrorMessage = "邮箱格式不正确")]
    public string Email { get; set; } = string.Empty;

    public string? PhoneNumber { get; set; }

    public string? CaptchaId { get; set; }

    public string? CaptchaAnswer { get; set; }
}

public class ChangePasswordRequest
{
    [Required(ErrorMessage = "当前密码不能为空")]
    [StringLength(2000, ErrorMessage = "当前密码长度超限")]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "新密码不能为空")]
    [StringLength(2000, MinimumLength = 6, ErrorMessage = "新密码长度不符合要求")]
    public string NewPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "确认密码不能为空")]
    [Compare("NewPassword", ErrorMessage = "新密码和确认密码不一致")]
    public string ConfirmPassword { get; set; } = string.Empty;
}

public class RefreshTokenRequest
{
    [Required(ErrorMessage = "刷新token不能为空")]
    public string RefreshToken { get; set; } = string.Empty;
}

public class RefreshTokenResult
{
    public string? Status { get; set; }

    public string? Token { get; set; }

    public string? RefreshToken { get; set; }

    public DateTime? ExpiresAt { get; set; }

    public string? ErrorMessage { get; set; }
}

public class SendResetCodeRequest
{
    [Required(ErrorMessage = "邮箱不能为空")]
    [EmailAddress(ErrorMessage = "邮箱格式不正确")]
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    [Required(ErrorMessage = "邮箱不能为空")]
    [EmailAddress(ErrorMessage = "邮箱格式不正确")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "验证码不能为空")]
    [StringLength(6, MinimumLength = 6, ErrorMessage = "验证码必须为6位")]
    public string Code { get; set; } = string.Empty;

    [Required(ErrorMessage = "新密码不能为空")]
    [StringLength(2000, MinimumLength = 6, ErrorMessage = "新密码长度不符合要求")]
    public string NewPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "确认密码不能为空")]
    [Compare("NewPassword", ErrorMessage = "新密码和确认密码不一致")]
    public string ConfirmPassword { get; set; } = string.Empty;
}

public class SwitchCompanyRequest
{
    public string TargetCompanyId { get; set; } = string.Empty;
}

public class UpdateMemberRolesRequest
{
    public List<string> RoleIds { get; set; } = new();
}

public class SetAdminRequest
{
    public bool IsAdmin { get; set; }
}