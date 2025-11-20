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
    /// <param name="username">待验证的用户名</param>
    /// <returns>验证结果元组，包含是否有效和错误消息</returns>
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
    /// <param name="password">待验证的密码</param>
    /// <returns>验证结果元组，包含是否有效和错误消息</returns>
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
    /// <param name="email">待验证的邮箱地址</param>
    /// <param name="required">是否必填，默认为 true</param>
    /// <returns>验证结果元组，包含是否有效和错误消息</returns>
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
    /// <param name="reason">待验证的删除原因</param>
    /// <param name="required">是否必填，默认为 false</param>
    /// <returns>验证结果元组，包含是否有效和错误消息</returns>
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
    /// <param name="roleName">待验证的角色名称</param>
    /// <returns>验证结果元组，包含是否有效和错误消息</returns>
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
    /// <param name="menuName">待验证的菜单名称</param>
    /// <returns>验证结果元组，包含是否有效和错误消息</returns>
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
    /// <param name="description">待验证的描述文本</param>
    /// <param name="required">是否必填，默认为 false</param>
    /// <returns>验证结果元组，包含是否有效和错误消息</returns>
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
    /// <param name="page">页码</param>
    /// <param name="pageSize">每页大小</param>
    /// <returns>验证结果元组，包含是否有效和错误消息</returns>
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
    /// <param name="id">待验证的ID</param>
    /// <param name="paramName">参数名称，用于错误消息，默认为 "ID"</param>
    /// <exception cref="ArgumentException">当ID为空时抛出</exception>
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
    /// <typeparam name="T">列表元素类型</typeparam>
    /// <param name="list">待验证的列表</param>
    /// <param name="paramName">参数名称，用于错误消息</param>
    /// <exception cref="ArgumentException">当列表为空或null时抛出</exception>
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
    /// <param name="value">待验证的值</param>
    /// <param name="validator">验证函数</param>
    /// <exception cref="ArgumentException">当验证失败时抛出</exception>
    public static void ValidateAndThrow(string? value, Func<string?, (bool isValid, string? errorMessage)> validator)
    {
        var (isValid, errorMessage) = validator(value);
        if (!isValid)
        {
            throw new ArgumentException(errorMessage);
        }
    }
}































































