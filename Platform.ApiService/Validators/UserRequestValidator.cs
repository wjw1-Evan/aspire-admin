using Platform.ApiService.Constants;
using Platform.ApiService.Models;

namespace Platform.ApiService.Validators;

/// <summary>
/// 用户请求验证器
/// </summary>
public static class UserRequestValidator
{
    /// <summary>
    /// 验证创建用户管理请求
    /// </summary>
    public static List<string> ValidateCreateUserManagementRequest(CreateUserManagementRequest request)
    {
        var errors = new List<string>();

        // 验证用户名
        var (isUsernameValid, usernameError) = ValidationHelper.ValidateUsername(request.Username);
        if (!isUsernameValid)
        {
            errors.Add(usernameError!);
        }

        // 验证密码
        var (isPasswordValid, passwordError) = ValidationHelper.ValidatePassword(request.Password);
        if (!isPasswordValid)
        {
            errors.Add(passwordError!);
        }

        // 验证邮箱（可选）
        if (!string.IsNullOrEmpty(request.Email))
        {
            var (isEmailValid, emailError) = ValidationHelper.ValidateEmail(request.Email, required: false);
            if (!isEmailValid)
            {
                errors.Add(emailError!);
            }
        }

        return errors;
    }

    /// <summary>
    /// 验证更新用户管理请求
    /// </summary>
    public static List<string> ValidateUpdateUserManagementRequest(UpdateUserManagementRequest request)
    {
        var errors = new List<string>();

        // 验证用户名（如果提供）
        if (!string.IsNullOrEmpty(request.Username))
        {
            var (isUsernameValid, usernameError) = ValidationHelper.ValidateUsername(request.Username);
            if (!isUsernameValid)
            {
                errors.Add(usernameError!);
            }
        }

        // 验证邮箱（如果提供）
        if (!string.IsNullOrEmpty(request.Email))
        {
            var (isEmailValid, emailError) = ValidationHelper.ValidateEmail(request.Email, required: false);
            if (!isEmailValid)
            {
                errors.Add(emailError!);
            }
        }

        return errors;
    }

    /// <summary>
    /// 验证批量操作请求
    /// </summary>
    public static List<string> ValidateBulkUserActionRequest(BulkUserActionRequest request)
    {
        var errors = new List<string>();

        // 验证用户ID列表
        if (request.UserIds == null || !request.UserIds.Any())
        {
            errors.Add(string.Format(ErrorMessages.ParameterRequired, "用户ID列表"));
        }

        // 验证操作类型
        var validActions = new[] { BulkActionTypes.Activate, BulkActionTypes.Deactivate, BulkActionTypes.Delete };
        if (!validActions.Contains(request.Action?.ToLower()))
        {
            errors.Add($"操作类型必须是以下之一: {string.Join(", ", validActions)}");
        }

        // 验证删除原因（如果是删除操作且提供了原因）
        if (request.Action?.ToLower() == BulkActionTypes.Delete && !string.IsNullOrEmpty(request.Reason))
        {
            var (isReasonValid, reasonError) = ValidationHelper.ValidateDeleteReason(request.Reason, required: false);
            if (!isReasonValid)
            {
                errors.Add(reasonError!);
            }
        }

        return errors;
    }

    /// <summary>
    /// 验证用户列表请求
    /// </summary>
    public static List<string> ValidateUserListRequest(UserListRequest request)
    {
        var errors = new List<string>();

        // 验证分页参数
        var (isPaginationValid, paginationError) = ValidationHelper.ValidatePaginationParams(request.Page, request.PageSize);
        if (!isPaginationValid)
        {
            errors.Add(paginationError!);
        }

        // 验证排序字段
        var validSortFields = new[] { "Username", "CreatedAt", "Email", "IsActive" };
        if (!string.IsNullOrEmpty(request.SortBy) && !validSortFields.Contains(request.SortBy, StringComparer.OrdinalIgnoreCase))
        {
            errors.Add($"排序字段必须是以下之一: {string.Join(", ", validSortFields)}");
        }

        // 验证排序顺序
        var validSortOrders = new[] { "asc", "desc", "ascending", "descending" };
        if (!string.IsNullOrEmpty(request.SortOrder) && !validSortOrders.Contains(request.SortOrder, StringComparer.OrdinalIgnoreCase))
        {
            errors.Add("排序顺序必须是 asc 或 desc");
        }

        // 验证日期范围
        if (request.StartDate.HasValue && request.EndDate.HasValue && request.StartDate > request.EndDate)
        {
            errors.Add("开始日期不能晚于结束日期");
        }

        return errors;
    }

    /// <summary>
    /// 抛出验证错误
    /// </summary>
    public static void ThrowIfInvalid(List<string> errors)
    {
        if (errors.Any())
        {
            throw new ArgumentException(string.Join("; ", errors));
        }
    }
}





