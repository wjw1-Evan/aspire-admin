using Platform.ApiService.Constants;
using Platform.ApiService.Models;
using System.Text.Json;

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
    public static List<string> ValidateUserListRequest(Platform.ServiceDefaults.Models.ProTableRequest request)
    {
        var errors = new List<string>();

        // 验证分页参数
        var (isPaginationValid, paginationError) = ValidationHelper.ValidatePaginationParams(request.Page, request.PageSize);
        if (!isPaginationValid)
        {
            errors.Add(paginationError!);
        }

        // 验证排序参数（JSON 格式如 {"fieldName":"ascend"}）
        if (!string.IsNullOrEmpty(request.Sort))
        {
            try
            {
                var sortDict = JsonSerializer.Deserialize<Dictionary<string, string>>(request.Sort);
                if (sortDict != null && sortDict.Count > 0)
                {
                    var validSortFields = new[] { "Username", "CreatedAt", "Email", "IsActive" };
                    var field = sortDict.Keys.First();
                    if (!validSortFields.Contains(field, StringComparer.OrdinalIgnoreCase))
                    {
                        errors.Add($"排序字段必须是以下之一: {string.Join(", ", validSortFields)}");
                    }
                    var order = sortDict.Values.First();
                    var validSortOrders = new[] { "ascend", "descend" };
                    if (!validSortOrders.Contains(order, StringComparer.OrdinalIgnoreCase))
                    {
                        errors.Add("排序顺序必须是 ascend 或 descend");
                    }
                }
            }
            catch
            {
                errors.Add("排序参数格式错误，应为 JSON 格式如 {\"字段名\":\"ascend\"}");
            }
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


































































