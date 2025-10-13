namespace Platform.ApiService.Constants;

/// <summary>
/// 用户相关常量
/// </summary>
public static class UserConstants
{
    /// <summary>
    /// 默认管理员角色名称
    /// </summary>
    public const string AdminRoleName = "admin";
    
    /// <summary>
    /// 默认用户角色名称
    /// </summary>
    public const string UserRoleName = "user";
    
    /// <summary>
    /// 默认访客角色名称
    /// </summary>
    public const string GuestRoleName = "guest";
    
    /// <summary>
    /// 系统管理员用户名
    /// </summary>
    public const string SystemAdminUsername = "admin";
}

/// <summary>
/// 排序方向枚举
/// </summary>
public enum SortOrder
{
    /// <summary>
    /// 升序
    /// </summary>
    Ascending,
    
    /// <summary>
    /// 降序
    /// </summary>
    Descending
}

/// <summary>
/// 批量操作类型
/// </summary>
public static class BulkActionTypes
{
    /// <summary>
    /// 激活用户
    /// </summary>
    public const string Activate = "activate";
    
    /// <summary>
    /// 停用用户
    /// </summary>
    public const string Deactivate = "deactivate";
    
    /// <summary>
    /// 删除用户
    /// </summary>
    public const string Delete = "delete";
}

/// <summary>
/// 通用错误消息
/// </summary>
public static class ErrorMessages
{
    /// <summary>
    /// 资源不存在
    /// </summary>
    public const string ResourceNotFound = "{0}不存在";
    
    /// <summary>
    /// 创建成功
    /// </summary>
    public const string CreateSuccess = "创建成功";
    
    /// <summary>
    /// 更新成功
    /// </summary>
    public const string UpdateSuccess = "更新成功";
    
    /// <summary>
    /// 删除成功
    /// </summary>
    public const string DeleteSuccess = "删除成功";
    
    /// <summary>
    /// 操作成功
    /// </summary>
    public const string OperationSuccess = "操作成功";
    
    /// <summary>
    /// 参数不能为空
    /// </summary>
    public const string ParameterRequired = "{0}不能为空";
    
    /// <summary>
    /// 无权访问
    /// </summary>
    public const string Unauthorized = "无权访问";
    
    /// <summary>
    /// 不能删除自己
    /// </summary>
    public const string CannotDeleteSelf = "不能删除自己的账户";
    
    /// <summary>
    /// 不能修改自己的角色
    /// </summary>
    public const string CannotModifyOwnRole = "不能修改自己的角色";
    
    /// <summary>
    /// 系统角色不能删除
    /// </summary>
    public const string SystemRoleCannotDelete = "不能删除系统管理员角色";
    
    /// <summary>
    /// 不能移除最后一个管理员
    /// </summary>
    public const string CannotRemoveLastAdmin = "不能移除最后一个管理员的角色";
    
    /// <summary>
    /// 有子菜单不能删除
    /// </summary>
    public const string CannotDeleteMenuWithChildren = "不能删除有子菜单的菜单，请先删除子菜单";
}


