namespace Platform.ApiService.Models;

public abstract class OrganizationUnitRequestBase
{
    public string Name { get; set; } = string.Empty;

    public string? Code { get; set; }

    public string? ParentId { get; set; }

    public string? Description { get; set; }

    public int SortOrder { get; set; } = 1;

    public string? ManagerUserId { get; set; }
}

public class CreateOrganizationUnitRequest : OrganizationUnitRequestBase
{
}

public class UpdateOrganizationUnitRequest : OrganizationUnitRequestBase
{
}

public class OrganizationTreeNode
{
    public string Id { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string? Code { get; set; }

    public string? ParentId { get; set; }

    public string? Description { get; set; }

    public int SortOrder { get; set; }

    public string? ManagerUserId { get; set; }

    public List<OrganizationTreeNode> Children { get; set; } = new();
}

public class OrganizationReorderItem
{
    public string Id { get; set; } = string.Empty;

    public string? ParentId { get; set; }

    public int SortOrder { get; set; } = 1;
}