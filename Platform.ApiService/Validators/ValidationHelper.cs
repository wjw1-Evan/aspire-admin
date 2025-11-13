using Platform.ApiService.Constants;

namespace Platform.ApiService.Validators;

/// <summary>
/// 验证辅助类
/// </summary>
public static class ValidationHelper
{
    /// <summary>
    /// 验证用户名
    /// </summary>
    public static (bool isValid, string? errorMessage) ValidateUsername(string? username)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            return (false, string.Format(ErrorMessages.ParameterRequired, "用户名"));
        }

        if (username.Length < ValidationRules.UsernameMinLength)
        {
            return (false, $"用户名长度不能少于{ValidationRules.UsernameMinLength}个字符");
        }

        if (username.Length > ValidationRules.UsernameMaxLength)
        {
            return (false, $"用户名长度不能超过{ValidationRules.UsernameMaxLength}个字符");
        }

        return (true, null);
    }

    /// <summary>
    /// 验证密码
    /// </summary>
    public static (bool isValid, string? errorMessage) ValidatePassword(string? password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            return (false, string.Format(ErrorMessages.ParameterRequired, "密码"));
        }

        if (password.Length < ValidationRules.PasswordMinLength)
        {
            return (false, $"密码长度不能少于{ValidationRules.PasswordMinLength}个字符");
        }

        if (password.Length > ValidationRules.PasswordMaxLength)
        {
            return (false, $"密码长度不能超过{ValidationRules.PasswordMaxLength}个字符");
        }

        return (true, null);
    }

    /// <summary>
    /// 验证邮箱
    /// </summary>
    public static (bool isValid, string? errorMessage) ValidateEmail(string? email, bool required = true)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            if (required)
            {
                return (false, string.Format(ErrorMessages.ParameterRequired, "邮箱"));
            }
            return (true, null);
        }

        if (email.Length > ValidationRules.EmailMaxLength)
        {
            return (false, $"邮箱长度不能超过{ValidationRules.EmailMaxLength}个字符");
        }

        // 简单的邮箱格式验证
        if (!email.Contains('@') || !email.Contains('.'))
        {
            return (false, "邮箱格式不正确");
        }

        return (true, null);
    }

    /// <summary>
    /// 验证删除原因
    /// </summary>
    public static (bool isValid, string? errorMessage) ValidateDeleteReason(string? reason, bool required = false)
    {
        if (string.IsNullOrWhiteSpace(reason))
        {
            if (required)
            {
                return (false, string.Format(ErrorMessages.ParameterRequired, "删除原因"));
            }
            return (true, null);
        }

        if (reason.Length > ValidationRules.DeleteReasonMaxLength)
        {
            return (false, $"删除原因长度不能超过{ValidationRules.DeleteReasonMaxLength}个字符");
        }

        return (true, null);
    }

    /// <summary>
    /// 验证角色名称
    /// </summary>
    public static (bool isValid, string? errorMessage) ValidateRoleName(string? roleName)
    {
        if (string.IsNullOrWhiteSpace(roleName))
        {
            return (false, string.Format(ErrorMessages.ParameterRequired, "角色名称"));
        }

        if (roleName.Length > ValidationRules.RoleNameMaxLength)
        {
            return (false, $"角色名称长度不能超过{ValidationRules.RoleNameMaxLength}个字符");
        }

        return (true, null);
    }

    /// <summary>
    /// 验证菜单名称
    /// </summary>
    public static (bool isValid, string? errorMessage) ValidateMenuName(string? menuName)
    {
        if (string.IsNullOrWhiteSpace(menuName))
        {
            return (false, string.Format(ErrorMessages.ParameterRequired, "菜单名称"));
        }

        if (menuName.Length > ValidationRules.MenuNameMaxLength)
        {
            return (false, $"菜单名称长度不能超过{ValidationRules.MenuNameMaxLength}个字符");
        }

        return (true, null);
    }

    /// <summary>
    /// 验证描述
    /// </summary>
    public static (bool isValid, string? errorMessage) ValidateDescription(string? description, bool required = false)
    {
        if (string.IsNullOrWhiteSpace(description))
        {
            if (required)
            {
                return (false, string.Format(ErrorMessages.ParameterRequired, "描述"));
            }
            return (true, null);
        }

        if (description.Length > ValidationRules.DescriptionMaxLength)
        {
            return (false, $"描述长度不能超过{ValidationRules.DescriptionMaxLength}个字符");
        }

        return (true, null);
    }

    /// <summary>
    /// 验证分页参数
    /// </summary>
    public static (bool isValid, string? errorMessage) ValidatePaginationParams(int page, int pageSize)
    {
        if (page < 1)
        {
            return (false, "页码必须大于0");
        }

        if (pageSize < 1)
        {
            return (false, "每页数量必须大于0");
        }

        if (pageSize > ValidationRules.MaxPageSize)
        {
            return (false, $"每页数量不能超过{ValidationRules.MaxPageSize}");
        }

        return (true, null);
    }

    /// <summary>
    /// 验证ID是否为空
    /// </summary>
    public static void ValidateIdNotEmpty(string? id, string paramName = "ID")
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, paramName));
        }
    }

    /// <summary>
    /// 验证列表不为空
    /// </summary>
    public static void ValidateListNotEmpty<T>(IEnumerable<T>? list, string paramName)
    {
        if (list == null || !list.Any())
        {
            throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, paramName));
        }
    }

    /// <summary>
    /// 验证并抛出异常
    /// </summary>
    public static void ValidateAndThrow(string? value, Func<string?, (bool isValid, string? errorMessage)> validator)
    {
        var (isValid, errorMessage) = validator(value);
        if (!isValid)
        {
            throw new ArgumentException(errorMessage);
        }
    }
}






















































