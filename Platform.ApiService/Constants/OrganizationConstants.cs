namespace Platform.ApiService.Constants;

/// <summary>
/// 组织架构相关常量
/// </summary>
public static class OrganizationErrorMessages
{
    /// <summary>
    /// 组织节点不存在
    /// </summary>
    public const string OrganizationNotFound = "组织节点不存在";

    /// <summary>
    /// 组织节点名称已存在
    /// </summary>
    public const string OrganizationNameExists = "组织节点名称已存在";

    /// <summary>
    /// 组织节点编码已存在
    /// </summary>
    public const string OrganizationCodeExists = "组织节点编码已存在";

    /// <summary>
    /// 父级不能是当前节点
    /// </summary>
    public const string ParentCannotBeSelf = "父级不能选择当前节点";

    /// <summary>
    /// 父级不能是当前节点的子节点
    /// </summary>
    public const string ParentCannotBeDescendant = "父级不能选择当前节点的子节点";

    /// <summary>
    /// 删除前需要清空子节点
    /// </summary>
    public const string CannotDeleteWithChildren = "请先删除下级节点后再删除当前节点";
}
