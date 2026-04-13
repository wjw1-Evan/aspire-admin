using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

public class CreateRoleRequest
{
    [Required(ErrorMessage = "角色名称不能为空")]
    [StringLength(50, MinimumLength = 2, ErrorMessage = "角色名称长度必须在2-50个字符之间")]
    public string Name { get; set; } = string.Empty;

    [StringLength(200, ErrorMessage = "描述长度不能超过200个字符")]
    public string? Description { get; set; }

    public List<string> MenuIds { get; set; } = new();

    public bool IsActive { get; set; } = true;
}

public class UpdateRoleRequest
{
    [StringLength(50, MinimumLength = 2, ErrorMessage = "角色名称长度必须在2-50个字符之间")]
    public string? Name { get; set; }

    [StringLength(200, ErrorMessage = "描述长度不能超过200个字符")]
    public string? Description { get; set; }

    public List<string>? MenuIds { get; set; }

    public bool? IsActive { get; set; }
}

public class AssignMenusToRoleRequest
{
    public List<string> MenuIds { get; set; } = new();
}

public class RoleWithStats
{
    public string? Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public List<string> MenuIds { get; set; } = new();

    public bool IsActive { get; set; }

    public int UserCount { get; set; }

    public int MenuCount { get; set; }
}

public class RoleListWithStatsResponse
{
    public List<RoleWithStats> Roles { get; set; } = new();

    public int Total { get; set; }
}