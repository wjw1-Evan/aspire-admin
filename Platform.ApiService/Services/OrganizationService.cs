using System.Collections.Generic;
using System.Linq;
using MongoDB.Driver;
using MongoDB.Bson;
using Platform.ApiService.Constants;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Services;

/// <summary>
/// 组织架构服务接口
/// </summary>
public interface IOrganizationService
{
    /// <summary>
    /// 获取组织架构树
    /// </summary>
    /// <returns>树形节点列表</returns>
    Task<List<OrganizationTreeNode>> GetTreeAsync();

    /// <summary>
    /// 按ID获取组织节点
    /// </summary>
    /// <param name="id">节点ID</param>
    /// <returns>组织节点或空</returns>
    Task<OrganizationUnit?> GetByIdAsync(string id);

    /// <summary>
    /// 创建组织节点
    /// </summary>
    /// <param name="request">创建请求</param>
    /// <returns>创建后的节点</returns>
    Task<OrganizationUnit> CreateAsync(CreateOrganizationUnitRequest request);

    /// <summary>
    /// 更新组织节点
    /// </summary>
    /// <param name="id">节点ID</param>
    /// <param name="request">更新请求</param>
    /// <returns>是否成功</returns>
    Task<bool> UpdateAsync(string id, UpdateOrganizationUnitRequest request);

    /// <summary>
    /// 删除组织节点
    /// </summary>
    /// <param name="id">节点ID</param>
    /// <returns>是否成功</returns>
    Task<bool> DeleteAsync(string id);

    /// <summary>
    /// 批量重排节点（含父子关系）
    /// </summary>
    /// <param name="items">重排项</param>
    /// <returns>是否成功</returns>
    Task<bool> ReorderAsync(List<OrganizationReorderItem> items);

    /// <summary>
    /// 获取组织成员（含子节点）
    /// </summary>
    /// <param name="organizationUnitId">组织节点ID</param>
    /// <returns>成员列表</returns>
    Task<List<OrganizationMemberItem>> GetMembersAsync(string organizationUnitId);

    /// <summary>
    /// 设置用户所在组织
    /// </summary>
    /// <param name="request">设置请求</param>
    /// <returns>是否成功</returns>
    Task<bool> AssignUserAsync(AssignUserOrganizationRequest request);

    /// <summary>
    /// 从组织移除用户
    /// </summary>
    /// <param name="request">移除请求</param>
    /// <returns>是否成功</returns>
    Task<bool> RemoveUserAsync(RemoveUserOrganizationRequest request);
}

/// <summary>
/// 组织架构服务实现
/// </summary>
public class OrganizationService : IOrganizationService
{
    private const int DefaultNameMaxLength = 50;
    private const int DefaultCodeMaxLength = 50;

    private readonly IDatabaseOperationFactory<OrganizationUnit> _organizationFactory;
    private readonly IDatabaseOperationFactory<UserOrganization> _userOrgFactory;
    private readonly IDatabaseOperationFactory<AppUser> _userFactory;
    private readonly ILogger<OrganizationService> _logger;

    /// <summary>
    /// 初始化组织架构服务
    /// </summary>
    /// <param name="organizationFactory">组织节点数据工厂</param>
    /// <param name="userOrgFactory">用户-组织关系数据工厂</param>
    /// <param name="userFactory">用户数据工厂</param>
    /// <param name="logger">日志记录器</param>
    public OrganizationService(
        IDatabaseOperationFactory<OrganizationUnit> organizationFactory,
        IDatabaseOperationFactory<UserOrganization> userOrgFactory,
        IDatabaseOperationFactory<AppUser> userFactory,
        ILogger<OrganizationService> logger)
    {
        _organizationFactory = organizationFactory;
        _userOrgFactory = userOrgFactory;
        _userFactory = userFactory;
        _logger = logger;
    }

    /// <summary>
    /// 获取组织架构树
    /// </summary>
    public async Task<List<OrganizationTreeNode>> GetTreeAsync()
    {
        var sort = _organizationFactory.CreateSortBuilder()
            .Ascending(o => o.SortOrder)
            .Ascending(o => o.CreatedAt)
            .Build();

        var units = await _organizationFactory.FindAsync(sort: sort).ConfigureAwait(false);

        var lookup = units.ToLookup(u => string.IsNullOrEmpty(u.ParentId) ? null : u.ParentId);

        List<OrganizationTreeNode> BuildTree(string? parentId)
        {
            return lookup[parentId]
                .Select(u => new OrganizationTreeNode
                {
                    Id = u.Id,
                    Name = u.Name,
                    Code = u.Code,
                    ParentId = u.ParentId,
                    Description = u.Description,
                    SortOrder = u.SortOrder,
                    ManagerUserId = u.ManagerUserId,
                    CreatedAt = u.CreatedAt,
                    UpdatedAt = u.UpdatedAt,
                    Children = BuildTree(u.Id)
                })
                .ToList();
        }

        return BuildTree(null);
    }

    public Task<OrganizationUnit?> GetByIdAsync(string id)
    {
        return _organizationFactory.GetByIdAsync(id);
    }

    public async Task<OrganizationUnit> CreateAsync(CreateOrganizationUnitRequest request)
    {
        NormalizeRequest(request);
        ValidateRequest(request);

        if (!string.IsNullOrEmpty(request.ParentId))
        {
            await EnsureParentExistsAsync(request.ParentId!).ConfigureAwait(false);
        }

        await EnsureUniqueAsync(request.Name, request.Code, request.ParentId).ConfigureAwait(false);

        var entity = new OrganizationUnit
        {
            Name = request.Name,
            Code = request.Code,
            ParentId = request.ParentId,
            Description = request.Description,
            SortOrder = request.SortOrder,
            ManagerUserId = request.ManagerUserId
        };

        var created = await _organizationFactory.CreateAsync(entity).ConfigureAwait(false);
        return created;
    }

    /// <summary>
    /// 更新组织节点
    /// </summary>
    /// <param name="id">节点ID</param>
    /// <param name="request">更新请求</param>
    /// <returns>是否成功</returns>
    public async Task<bool> UpdateAsync(string id, UpdateOrganizationUnitRequest request)
    {
        NormalizeRequest(request);
        ValidateRequest(request);

        var existing = await _organizationFactory.GetByIdAsync(id).ConfigureAwait(false);
        if (existing == null)
        {
            throw new KeyNotFoundException(OrganizationErrorMessages.OrganizationNotFound);
        }

        if (!string.IsNullOrEmpty(request.ParentId))
        {
            await EnsureParentExistsAsync(request.ParentId!).ConfigureAwait(false);
            EnsureParentIsNotSelf(id, request.ParentId!);
            await EnsureParentIsNotDescendantAsync(id, request.ParentId!).ConfigureAwait(false);
        }

        await EnsureUniqueAsync(request.Name, request.Code, request.ParentId, id).ConfigureAwait(false);

        var filter = _organizationFactory.CreateFilterBuilder()
            .Equal(o => o.Id, id)
            .Build();

        var update = _organizationFactory.CreateUpdateBuilder()
            .Set(o => o.Name, request.Name)
            .Set(o => o.Code, request.Code)
            .Set(o => o.ParentId, request.ParentId)
            .Set(o => o.Description, request.Description)
            .Set(o => o.SortOrder, request.SortOrder)
            .Set(o => o.ManagerUserId, request.ManagerUserId)
            .Build();

        var result = await _organizationFactory.FindOneAndUpdateAsync(filter, update).ConfigureAwait(false);
        return result != null;
    }

    /// <summary>
    /// 删除组织节点
    /// </summary>
    /// <param name="id">节点ID</param>
    /// <returns>是否成功</returns>
    public async Task<bool> DeleteAsync(string id)
    {
        var existing = await _organizationFactory.GetByIdAsync(id).ConfigureAwait(false);
        if (existing == null)
        {
            throw new KeyNotFoundException(OrganizationErrorMessages.OrganizationNotFound);
        }

        var childFilter = _organizationFactory.CreateFilterBuilder()
            .Equal(o => o.ParentId, id)
            .Build();
        var childCount = await _organizationFactory.CountAsync(childFilter).ConfigureAwait(false);
        if (childCount > 0)
        {
            throw new InvalidOperationException(OrganizationErrorMessages.CannotDeleteWithChildren);
        }

        var deleteFilter = _organizationFactory.CreateFilterBuilder()
            .Equal(o => o.Id, id)
            .Build();

        var deleted = await _organizationFactory.FindOneAndSoftDeleteAsync(deleteFilter).ConfigureAwait(false);
        return deleted != null;
    }

    /// <summary>
    /// 批量重排：支持调整父子关系与排序号
    /// </summary>
    public async Task<bool> ReorderAsync(List<OrganizationReorderItem> items)
    {
        if (items == null || items.Count == 0) return true;

        // 预加载所有节点用于循环校验
        var allUnits = await _organizationFactory.FindAsync().ConfigureAwait(false);
        var parentMap = allUnits.ToDictionary(u => u.Id, u => u.ParentId);

        foreach (var item in items)
        {
            if (item.SortOrder < 1)
                throw new ArgumentException(string.Format(ErrorMessages.ParameterInvalid, "排序"));

            // 父级合法性
            if (!string.IsNullOrEmpty(item.ParentId))
            {
                await EnsureParentExistsAsync(item.ParentId!).ConfigureAwait(false);
                EnsureParentIsNotSelf(item.Id, item.ParentId!);
                // 使用当前最新父图做循环校验
                await EnsureParentIsNotDescendantAsync(item.Id, item.ParentId!).ConfigureAwait(false);
                parentMap[item.Id] = item.ParentId;
            }
            else
            {
                parentMap[item.Id] = null;
            }
        }

        // 应用更新（逐条原子更新，工厂负责审计）
        foreach (var item in items)
        {
            var filter = _organizationFactory.CreateFilterBuilder()
                .Equal(o => o.Id, item.Id)
                .Build();

            var update = _organizationFactory.CreateUpdateBuilder()
                .Set(o => o.ParentId, item.ParentId)
                .Set(o => o.SortOrder, item.SortOrder)
                .Build();

            var updated = await _organizationFactory.FindOneAndUpdateAsync(filter, update).ConfigureAwait(false);
            if (updated == null)
                throw new KeyNotFoundException(OrganizationErrorMessages.OrganizationNotFound);
        }

        return true;
    }

    /// <summary>
    /// 获取组织成员列表
    /// </summary>
    public async Task<List<OrganizationMemberItem>> GetMembersAsync(string organizationUnitId)
    {
        // 获取所有节点并计算包含下级的ID集合
        var allUnits = await _organizationFactory.FindAsync().ConfigureAwait(false);
        var targetIds = CollectWithDescendants(organizationUnitId, allUnits);

        var filter = _userOrgFactory.CreateFilterBuilder()
            .In(u => u.OrganizationUnitId, targetIds.ToList())
            .Build();
        var mappings = await _userOrgFactory.FindAsync(filter).ConfigureAwait(false);
        var userIds = mappings.Select(m => m.UserId).Distinct().ToList();

        if (userIds.Count == 0) return new List<OrganizationMemberItem>();

        var usersFilter = _userFactory.CreateFilterBuilder()
            .In(u => u.Id, userIds)
            .Build();
        var projection = _userFactory.CreateProjectionBuilder()
            .Include(u => u.Id)
            .Include(u => u.Name)
            .Include(u => u.Email)
            .Build();
        var users = await _userFactory.FindAsync(usersFilter, projection: projection).ConfigureAwait(false);
        var userMap = users.ToDictionary(u => u.Id, u => u);
        var unitNameMap = allUnits.ToDictionary(u => u.Id, u => u.Name);

        return mappings
            .Select(m => new OrganizationMemberItem
            {
                UserId = m.UserId,
                Username = userMap.TryGetValue(m.UserId, out var u) ? (string.IsNullOrWhiteSpace(u.Name) ? u.Username : u.Name!) : string.Empty,
                Email = userMap.TryGetValue(m.UserId, out var u2) ? u2.Email : null,
                OrganizationUnitId = m.OrganizationUnitId,
                OrganizationUnitName = unitNameMap.TryGetValue(m.OrganizationUnitId, out var name) ? name : null
            })
            .ToList();
    }

    /// <summary>
    /// 设置用户所在组织（如果已存在则更新 isPrimary）
    /// </summary>
    public async Task<bool> AssignUserAsync(AssignUserOrganizationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserId))
            throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, "用户ID"));
        if (string.IsNullOrWhiteSpace(request.OrganizationUnitId))
            throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, "组织ID"));

        // 校验组织存在
        var org = await _organizationFactory.GetByIdAsync(request.OrganizationUnitId).ConfigureAwait(false);
        if (org == null) throw new KeyNotFoundException(OrganizationErrorMessages.OrganizationNotFound);

        // 支持以用户ID或用户名查找用户，避免非 ObjectId 值抛出格式异常
        var user = await FindUserByIdOrUsernameAsync(request.UserId).ConfigureAwait(false);
        if (user == null) throw new KeyNotFoundException(ErrorMessages.UserNotFound);

        var targetUserId = user.Id;

        // 查找是否已有映射
        var findFilter = _userOrgFactory.CreateFilterBuilder()
            .Equal(m => m.UserId, targetUserId)
            .Equal(m => m.OrganizationUnitId, request.OrganizationUnitId)
            .Build();
        var existing = await _userOrgFactory.FindAsync(findFilter, limit: 1).ConfigureAwait(false);

        if (existing.Any())
        {
            var update = _userOrgFactory.CreateUpdateBuilder()
                .Set(m => m.IsPrimary, request.IsPrimary ?? existing.First().IsPrimary)
                .Build();
            await _userOrgFactory.FindOneAndUpdateAsync(findFilter, update).ConfigureAwait(false);
            return true;
        }
        else
        {
            var entity = new UserOrganization
            {
                UserId = targetUserId,
                OrganizationUnitId = request.OrganizationUnitId,
                IsPrimary = request.IsPrimary ?? false
            };
            await _userOrgFactory.CreateAsync(entity).ConfigureAwait(false);
            return true;
        }
    }

    /// <summary>
    /// 从组织中移除用户
    /// </summary>
    public async Task<bool> RemoveUserAsync(RemoveUserOrganizationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserId))
            throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, "用户ID"));
        if (string.IsNullOrWhiteSpace(request.OrganizationUnitId))
            throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, "组织ID"));

        // 校验组织存在
        var org = await _organizationFactory.GetByIdAsync(request.OrganizationUnitId).ConfigureAwait(false);
        if (org == null) throw new KeyNotFoundException(OrganizationErrorMessages.OrganizationNotFound);

        // 查找用户（ID 或用户名）
        var user = await FindUserByIdOrUsernameAsync(request.UserId).ConfigureAwait(false);
        if (user == null) throw new KeyNotFoundException(ErrorMessages.UserNotFound);

        var filter = _userOrgFactory.CreateFilterBuilder()
            .Equal(m => m.UserId, user.Id)
            .Equal(m => m.OrganizationUnitId, request.OrganizationUnitId)
            .Build();

        var deleted = await _userOrgFactory.FindOneAndSoftDeleteAsync(filter).ConfigureAwait(false);
        return deleted != null;
    }

    /// <summary>
    /// 兼容以用户ID或用户名查询用户，避免非 ObjectId 输入导致格式异常
    /// </summary>
    private async Task<AppUser?> FindUserByIdOrUsernameAsync(string userIdOrName)
    {
        if (ObjectId.TryParse(userIdOrName, out _))
        {
            var byId = await _userFactory.GetByIdAsync(userIdOrName).ConfigureAwait(false);
            if (byId != null) return byId;
        }

        var usernameFilter = _userFactory.CreateFilterBuilder()
            .Equal(u => u.Username, userIdOrName)
            .Build();
        var byUsername = await _userFactory.FindAsync(usernameFilter, limit: 1).ConfigureAwait(false);
        return byUsername.FirstOrDefault();
    }

    private static HashSet<string> CollectWithDescendants(string rootId, List<OrganizationUnit> units)
    {
        var result = new HashSet<string> { rootId };

        // 显式构建字典，避免 null 键产生的 notnull 约束警告/运行期问题
        var childrenMap = new Dictionary<string, List<string>>();
        foreach (var unit in units)
        {
            if (string.IsNullOrEmpty(unit.Id)) continue;
            var parentKey = unit.ParentId ?? string.Empty;
            if (!childrenMap.TryGetValue(parentKey, out var list))
            {
                list = new List<string>();
                childrenMap[parentKey] = list;
            }
            list.Add(unit.Id);
        }

        var stack = new Stack<string>();
        stack.Push(rootId);
        while (stack.Count > 0)
        {
            var current = stack.Pop();
            var key = current ?? string.Empty;
            if (childrenMap.TryGetValue(key, out var children))
            {
                foreach (var childId in children)
                {
                    if (result.Add(childId))
                    {
                        stack.Push(childId);
                    }
                }
            }
        }
        return result;
    }

    private void ValidateRequest(OrganizationUnitRequestBase request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, "名称"));
        }

        if (request.Name.Length > DefaultNameMaxLength)
        {
            throw new ArgumentException(string.Format(ErrorMessages.ParameterTooLong, "名称", DefaultNameMaxLength));
        }

        if (!string.IsNullOrEmpty(request.Code) && request.Code.Length > DefaultCodeMaxLength)
        {
            throw new ArgumentException(string.Format(ErrorMessages.ParameterTooLong, "编码", DefaultCodeMaxLength));
        }

        if (!string.IsNullOrEmpty(request.Description) && request.Description.Length > ValidationRules.DescriptionMaxLength)
        {
            throw new ArgumentException(string.Format(ErrorMessages.ParameterTooLong, "描述", ValidationRules.DescriptionMaxLength));
        }

        if (request.SortOrder < 1)
        {
            throw new ArgumentException(string.Format(ErrorMessages.ParameterInvalid, "排序"));
        }
    }

    private static void NormalizeRequest(OrganizationUnitRequestBase request)
    {
        request.Name = request.Name?.Trim() ?? string.Empty;
        request.Code = string.IsNullOrWhiteSpace(request.Code) ? null : request.Code.Trim();
        request.ParentId = string.IsNullOrWhiteSpace(request.ParentId) ? null : request.ParentId.Trim();
        request.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        request.ManagerUserId = string.IsNullOrWhiteSpace(request.ManagerUserId) ? null : request.ManagerUserId.Trim();
        if (request.SortOrder < 1)
        {
            request.SortOrder = 1;
        }
    }

    private async Task EnsureParentExistsAsync(string parentId)
    {
        var parent = await _organizationFactory.GetByIdAsync(parentId).ConfigureAwait(false);
        if (parent == null)
        {
            throw new KeyNotFoundException(OrganizationErrorMessages.OrganizationNotFound);
        }
    }

    private void EnsureParentIsNotSelf(string currentId, string parentId)
    {
        if (currentId == parentId)
        {
            throw new InvalidOperationException(OrganizationErrorMessages.ParentCannotBeSelf);
        }
    }

    private async Task EnsureParentIsNotDescendantAsync(string currentId, string parentId)
    {
        var units = await _organizationFactory.FindAsync().ConfigureAwait(false);
        var parentMap = units.ToDictionary(u => u.Id, u => u.ParentId);

        var cursor = parentId;
        while (!string.IsNullOrEmpty(cursor))
        {
            if (cursor == currentId)
            {
                throw new InvalidOperationException(OrganizationErrorMessages.ParentCannotBeDescendant);
            }

            if (!parentMap.TryGetValue(cursor, out var next))
            {
                break;
            }
            cursor = next;
        }
    }

    private async Task EnsureUniqueAsync(string name, string? code, string? parentId, string? excludeId = null)
    {
        var nameFilter = _organizationFactory.CreateFilterBuilder()
            .Equal(o => o.Name, name)
            .Equal(o => o.ParentId, parentId)
            .Build();
        var existingByName = await _organizationFactory.FindAsync(nameFilter, limit: 1).ConfigureAwait(false);
        if (existingByName.Any() && existingByName.First().Id != excludeId)
        {
            throw new InvalidOperationException(OrganizationErrorMessages.OrganizationNameExists);
        }

        if (!string.IsNullOrEmpty(code))
        {
            var codeFilter = _organizationFactory.CreateFilterBuilder()
                .Equal(o => o.Code, code)
                .Build();
            var existingByCode = await _organizationFactory.FindAsync(codeFilter, limit: 1).ConfigureAwait(false);
            if (existingByCode.Any() && existingByCode.First().Id != excludeId)
            {
                throw new InvalidOperationException(OrganizationErrorMessages.OrganizationCodeExists);
            }
        }
    }
}
