using Platform.ApiService.Models;

namespace Platform.ApiService.Validators;

/// <summary>
/// 角色请求验证器
/// </summary>
public static class RoleRequestValidator
{
    /// <summary>
    /// 验证创建角色请求
    /// </summary>
    public static List<string> ValidateCreateRoleRequest(CreateRoleRequest request)
    {
        var errors = new List<string>();

        // 验证角色名称
        var (isNameValid, nameError) = ValidationHelper.ValidateRoleName(request.Name);
        if (!isNameValid)
        {
            errors.Add(nameError!);
        }

        // 验证描述（如果提供）
        if (!string.IsNullOrEmpty(request.Description))
        {
            var (isDescValid, descError) = ValidationHelper.ValidateDescription(request.Description, required: false);
            if (!isDescValid)
            {
                errors.Add(descError!);
            }
        }

        return errors;
    }

    /// <summary>
    /// 验证更新角色请求
    /// </summary>
    public static List<string> ValidateUpdateRoleRequest(UpdateRoleRequest request)
    {
        var errors = new List<string>();

        // 验证角色名称（如果提供）
        if (!string.IsNullOrEmpty(request.Name))
        {
            var (isNameValid, nameError) = ValidationHelper.ValidateRoleName(request.Name);
            if (!isNameValid)
            {
                errors.Add(nameError!);
            }
        }

        // 验证描述（如果提供）
        if (!string.IsNullOrEmpty(request.Description))
        {
            var (isDescValid, descError) = ValidationHelper.ValidateDescription(request.Description, required: false);
            if (!isDescValid)
            {
                errors.Add(descError!);
            }
        }

        return errors;
    }

    /// <summary>
    /// 验证分配菜单请求
    /// </summary>
    public static List<string> ValidateAssignMenusRequest(AssignMenusToRoleRequest request)
    {
        var errors = new List<string>();

        // MenuIds 可以为空（表示清空所有菜单）
        // 但如果提供了，需要确保是有效的列表
        if (request.MenuIds != null && request.MenuIds.Any(string.IsNullOrWhiteSpace))
        {
            errors.Add("菜单ID列表包含无效的ID");
        }

        return errors;
    }

    /// <summary>
    /// 验证分配权限请求
    /// </summary>
    public static List<string> ValidateAssignPermissionsRequest(AssignPermissionsRequest request)
    {
        var errors = new List<string>();

        // PermissionIds 可以为空（表示清空所有权限）
        // 但如果提供了，需要确保是有效的列表
        if (request.PermissionIds != null && request.PermissionIds.Any(string.IsNullOrWhiteSpace))
        {
            errors.Add("权限ID列表包含无效的ID");
        }

        return errors;
    }
}




