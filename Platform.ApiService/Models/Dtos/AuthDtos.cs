using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Generic;

using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

public class CurrentUser
{
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
    [Required(ErrorMessage = ErrorCode.ValidationUsernameRequired)]
    [StringLength(50, MinimumLength = 3, ErrorMessage = ErrorCode.ValidationUsernameTooShort)]
    public string? Username { get; set; }

    [Required(ErrorMessage = ErrorCode.ValidationPasswordRequired)]
    [StringLength(2000, MinimumLength = 6, ErrorMessage = ErrorCode.ValidationPasswordTooShort)]
    public string? Password { get; set; }

    public bool AutoLogin { get; set; }

    public string? Type { get; set; }
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
    [Required(ErrorMessage = ErrorCode.ValidationUsernameRequired)]
    [StringLength(20, MinimumLength = 3, ErrorMessage = ErrorCode.ValidationUsernameLengthRange)]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = ErrorCode.ValidationPasswordRequired)]
    [StringLength(2000, MinimumLength = 6, ErrorMessage = ErrorCode.ValidationPasswordInvalidLength)]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = ErrorCode.ValidationEmailRequired)]
    [EmailAddress(ErrorMessage = ErrorCode.ValidationEmailInvalid)]
    public string Email { get; set; } = string.Empty;

    public string? PhoneNumber { get; set; }
}

public class ChangePasswordRequest
{
    [Required(ErrorMessage = ErrorCode.ValidationCurrentPasswordRequired)]
    [StringLength(2000, ErrorMessage = ErrorCode.ValidationCurrentPasswordTooLong)]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = ErrorCode.ValidationNewPasswordRequired)]
    [StringLength(2000, MinimumLength = 6, ErrorMessage = ErrorCode.ValidationPasswordInvalidLength)]
    public string NewPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = ErrorCode.ValidationConfirmPasswordRequired)]
    [Compare("NewPassword", ErrorMessage = ErrorCode.ValidationPasswordsNotMatch)]
    public string ConfirmPassword { get; set; } = string.Empty;
}

public class RefreshTokenRequest
{
    [Required(ErrorMessage = ErrorCode.ValidationRefreshTokenRequired)]
    public string RefreshToken { get; set; } = string.Empty;
    
    /// <summary>
    /// 切换企业时使用，传入新的企业ID
    /// </summary>
    public string? CompanyId { get; set; }
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
    [Required(ErrorMessage = ErrorCode.ValidationEmailRequired)]
    [EmailAddress(ErrorMessage = ErrorCode.ValidationEmailInvalid)]
    public string Email { get; set; } = string.Empty;
}

public class ResetPasswordRequest
{
    [Required(ErrorMessage = ErrorCode.ValidationEmailRequired)]
    [EmailAddress(ErrorMessage = ErrorCode.ValidationEmailInvalid)]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = ErrorCode.ValidationCaptchaRequired)]
    [StringLength(6, MinimumLength = 6, ErrorMessage = ErrorCode.ValidationCaptchaInvalid)]
    public string Code { get; set; } = string.Empty;

    [Required(ErrorMessage = ErrorCode.ValidationNewPasswordRequired)]
    [StringLength(2000, MinimumLength = 6, ErrorMessage = ErrorCode.ValidationPasswordInvalidLength)]
    public string NewPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = ErrorCode.ValidationConfirmPasswordRequired)]
    [Compare("NewPassword", ErrorMessage = ErrorCode.ValidationPasswordsNotMatch)]
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

public class ResendVerificationRequest
{
    [Required(ErrorMessage = ErrorCode.ValidationEmailRequired)]
    [EmailAddress(ErrorMessage = ErrorCode.ValidationEmailInvalid)]
    public string Email { get; set; } = string.Empty;
}