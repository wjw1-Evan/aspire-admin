namespace Platform.ApiService.Constants;

/// <summary>
/// 系统常量定义
/// </summary>
public static class SystemConstants
{
    /// <summary>系统角色</summary>
    public static class Roles
    {
        /// <summary>管理员</summary>
        public const string Admin = "admin";
        /// <summary>普通用户</summary>
        public const string User = "user";
        /// <summary>经理</summary>
        public const string Manager = "manager";
    }

    /// <summary>用户状态</summary>
    public static class UserStatus
    {
        /// <summary>活跃</summary>
        public const string Active = "active";
        /// <summary>非活跃</summary>
        public const string Inactive = "inactive";
        /// <summary>已暂停</summary>
        public const string Suspended = "suspended";
    }

    /// <summary>
    /// 系统权限常量
    /// </summary>
    public static class Permissions
    {
        /// <summary>用户管理权限</summary>
        public const string UserManagement = "user-management";
        /// <summary>角色管理权限</summary>
        public const string RoleManagement = "role-management";
        /// <summary>内容管理权限</summary>
        public const string ContentManagement = "content-management";
    }
}
