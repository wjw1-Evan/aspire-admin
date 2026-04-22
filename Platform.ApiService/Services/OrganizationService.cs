using Microsoft.EntityFrameworkCore;
using MongoDB.Bson;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Platform.ApiService.Services;

/// <summary>
/// 组织架构服务接口
/// </summary>
public interface IOrganizationService
{
    Task<List<OrganizationTreeNode>> GetTreeAsync();
    Task<OrganizationUnit?> GetByIdAsync(string id);
    Task<OrganizationUnit> CreateAsync(CreateOrganizationUnitRequest request);
    Task<bool> UpdateAsync(string id, UpdateOrganizationUnitRequest request);
    Task<bool> DeleteAsync(string id);
    Task<bool> ReorderAsync(List<OrganizationReorderItem> items);
    Task<List<OrganizationMemberItem>> GetMembersAsync(string organizationUnitId);
    Task<bool> AssignUserAsync(AssignUserOrganizationRequest request);
    Task<bool> RemoveUserAsync(RemoveUserOrganizationRequest request);
    Task<int> CountAsync();
}

/// <summary>
/// 组织架构服务实现
/// </summary>
public class OrganizationService : IOrganizationService
{
    private readonly DbContext _context;
    private readonly ILogger<OrganizationService> _logger;
    private const int DefaultNameMaxLength = 50;
    private const int DefaultCodeMaxLength = 50;

    public OrganizationService(DbContext context, ILogger<OrganizationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<List<OrganizationTreeNode>> GetTreeAsync()
    {
        var units = await _context.Set<OrganizationUnit>().OrderBy(o => o.SortOrder).ThenBy(o => o.CreatedAt).ToListAsync();
        var lookup = units.ToLookup(u => string.IsNullOrEmpty(u.ParentId) ? null : u.ParentId);

        List<OrganizationTreeNode> BuildTree(string? parentId)
        {
            return (lookup[parentId] ?? Enumerable.Empty<OrganizationUnit>())
                .Select(u => new OrganizationTreeNode
                {
                    Id = u.Id, Name = u.Name, Code = u.Code, ParentId = u.ParentId, Description = u.Description,
                    SortOrder = u.SortOrder, ManagerUserId = u.ManagerUserId, Children = BuildTree(u.Id)
                }).ToList();
        }
        return BuildTree(null);
    }

    public Task<OrganizationUnit?> GetByIdAsync(string id) => _context.Set<OrganizationUnit>().FirstOrDefaultAsync(x => x.Id == id);

    public async Task<OrganizationUnit> CreateAsync(CreateOrganizationUnitRequest request)
    {
        NormalizeRequest(request);
        ValidateRequest(request);
        if (!string.IsNullOrEmpty(request.ParentId)) await EnsureParentExistsAsync(request.ParentId!);
        await EnsureUniqueAsync(request.Name, request.Code, request.ParentId);

        var entity = new OrganizationUnit { Name = request.Name, Code = request.Code, ParentId = request.ParentId, Description = request.Description, SortOrder = request.SortOrder, ManagerUserId = request.ManagerUserId };
        await _context.Set<OrganizationUnit>().AddAsync(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    public async Task<bool> UpdateAsync(string id, UpdateOrganizationUnitRequest request)
    {
        NormalizeRequest(request);
        ValidateRequest(request);
        var existing = await _context.Set<OrganizationUnit>().FirstOrDefaultAsync(x => x.Id == id);
        if (existing == null) throw new KeyNotFoundException(ErrorCode.OrganizationNotFound);

        if (!string.IsNullOrEmpty(request.ParentId))
        {
            await EnsureParentExistsAsync(request.ParentId!);
            if (id == request.ParentId) throw new InvalidOperationException(ErrorCode.ParentCannotBeSelf);
            await EnsureParentIsNotDescendantAsync(id, request.ParentId!);
        }

        await EnsureUniqueAsync(request.Name, request.Code, request.ParentId, id);
        existing.Name = request.Name; existing.Code = request.Code; existing.ParentId = request.ParentId;
        existing.Description = request.Description; existing.SortOrder = request.SortOrder; existing.ManagerUserId = request.ManagerUserId;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(string id)
    {
        var existing = await _context.Set<OrganizationUnit>().FirstOrDefaultAsync(x => x.Id == id);
        if (existing == null) throw new KeyNotFoundException(ErrorCode.OrganizationNotFound);
        if (await _context.Set<OrganizationUnit>().AnyAsync(o => o.ParentId == id)) throw new InvalidOperationException(ErrorCode.CannotDeleteWithChildren);

        _context.Set<OrganizationUnit>().Remove(existing);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ReorderAsync(List<OrganizationReorderItem> items)
    {
        if (items == null || !items.Any()) return true;
        var all = await _context.Set<OrganizationUnit>().ToListAsync();
        var parentMap = all.ToDictionary(u => u.Id, u => u.ParentId);

        foreach (var item in items)
        {
            if (item.SortOrder < 1) throw new ArgumentException(string.Format(ErrorMessages.ParameterInvalid, "排序"));
            if (!string.IsNullOrEmpty(item.ParentId))
            {
                if (!parentMap.ContainsKey(item.ParentId)) throw new KeyNotFoundException(ErrorCode.OrganizationNotFound);
                if (item.Id == item.ParentId) throw new InvalidOperationException(ErrorCode.ParentCannotBeSelf);
                
                var cursor = item.ParentId;
                while (!string.IsNullOrEmpty(cursor))
                {
                    if (cursor == item.Id) throw new InvalidOperationException(ErrorCode.ParentCannotBeDescendant);
                    if (!parentMap.TryGetValue(cursor, out cursor)) break;
                }
                parentMap[item.Id] = item.ParentId;
            }
            else parentMap[item.Id] = null;
        }

        foreach (var item in items)
        {
            var entity = await _context.Set<OrganizationUnit>().FirstOrDefaultAsync(x => x.Id == item.Id);
            if (entity == null) throw new KeyNotFoundException(ErrorCode.OrganizationNotFound);
            entity.ParentId = item.ParentId;
            entity.SortOrder = item.SortOrder;
        }
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<OrganizationMemberItem>> GetMembersAsync(string organizationUnitId)
    {
        var all = await _context.Set<OrganizationUnit>().ToListAsync();
        var targetIds = CollectWithDescendants(organizationUnitId, all);

        var mappings = await _context.Set<UserOrganization>().Where(u => targetIds.Contains(u.OrganizationUnitId)).ToListAsync();
        var userIds = mappings.Select(m => m.UserId).Distinct().ToList();
        if (!userIds.Any()) return new List<OrganizationMemberItem>();

        var users = await _context.Set<AppUser>().Where(u => userIds.Contains(u.Id)).ToListAsync();
        var userMap = users.ToDictionary(u => u.Id, u => u);
        var unitNameMap = all.ToDictionary(u => u.Id, u => u.Name);

        return mappings.Select(m => new OrganizationMemberItem
        {
            UserId = m.UserId,
            Username = userMap.TryGetValue(m.UserId, out var u) ? (string.IsNullOrWhiteSpace(u.Name) ? u.Username : u.Name!) : string.Empty,
            Email = userMap.TryGetValue(m.UserId, out var u2) ? u2.Email : null,
            OrganizationUnitId = m.OrganizationUnitId,
            OrganizationUnitName = unitNameMap.TryGetValue(m.OrganizationUnitId, out var name) ? name : null
        }).ToList();
    }

    public async Task<bool> AssignUserAsync(AssignUserOrganizationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserId)) throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, "用户ID"));
        if (string.IsNullOrWhiteSpace(request.OrganizationUnitId)) throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, "组织ID"));

        if (!await _context.Set<OrganizationUnit>().AnyAsync(x => x.Id == request.OrganizationUnitId)) throw new KeyNotFoundException(ErrorCode.OrganizationNotFound);

        var user = await FindUserByIdOrUsernameAsync(request.UserId);
        if (user == null) throw new KeyNotFoundException(ErrorCode.UserNotFound);

        var existing = await _context.Set<UserOrganization>().FirstOrDefaultAsync(m => m.UserId == user.Id && m.OrganizationUnitId == request.OrganizationUnitId);
        if (existing != null)
        {
            existing.IsPrimary = request.IsPrimary ?? existing.IsPrimary;
            await _context.SaveChangesAsync();
            return true;
        }

        await _context.Set<UserOrganization>().AddAsync(new UserOrganization { UserId = user.Id, OrganizationUnitId = request.OrganizationUnitId, IsPrimary = request.IsPrimary ?? false });
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveUserAsync(RemoveUserOrganizationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserId)) throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, "用户ID"));
        if (string.IsNullOrWhiteSpace(request.OrganizationUnitId)) throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, "组织ID"));

        var user = await FindUserByIdOrUsernameAsync(request.UserId);
        if (user == null) throw new KeyNotFoundException(ErrorCode.UserNotFound);

        var mapping = await _context.Set<UserOrganization>().FirstOrDefaultAsync(m => m.UserId == user.Id && m.OrganizationUnitId == request.OrganizationUnitId);
        if (mapping == null) return false;

        _context.Set<UserOrganization>().Remove(mapping);
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task<AppUser?> FindUserByIdOrUsernameAsync(string userIdOrName)
    {
        if (!string.IsNullOrWhiteSpace(userIdOrName) && ObjectId.TryParse(userIdOrName, out _))
        {
            var u = await _context.Set<AppUser>().FirstOrDefaultAsync(x => x.Id == userIdOrName);
            if (u != null) return u;
        }
        return await _context.Set<AppUser>().FirstOrDefaultAsync(u => u.Username == userIdOrName);
    }

    private static HashSet<string> CollectWithDescendants(string rootId, List<OrganizationUnit> units)
    {
        var result = new HashSet<string> { rootId };
        var childrenMap = units.Where(u => !string.IsNullOrEmpty(u.Id)).ToLookup(u => u.ParentId ?? string.Empty, u => u.Id);
        var stack = new Stack<string>(); stack.Push(rootId);
        while (stack.Any())
        {
            var cur = stack.Pop();
            foreach (var childId in childrenMap[cur ?? string.Empty]) if (result.Add(childId)) stack.Push(childId);
        }
        return result;
    }

    private void ValidateRequest(OrganizationUnitRequestBase request)
    {
        if (string.IsNullOrWhiteSpace(request.Name)) throw new ArgumentException(string.Format(ErrorMessages.ParameterRequired, "名称"));
        if (request.Name.Length > DefaultNameMaxLength) throw new ArgumentException(string.Format(ErrorMessages.ParameterTooLong, "名称", DefaultNameMaxLength));
        if (!string.IsNullOrEmpty(request.Code) && request.Code.Length > DefaultCodeMaxLength) throw new ArgumentException(string.Format(ErrorMessages.ParameterTooLong, "编码", DefaultCodeMaxLength));
        if (!string.IsNullOrEmpty(request.Description) && request.Description.Length > ValidationRules.DescriptionMaxLength) throw new ArgumentException(string.Format(ErrorMessages.ParameterTooLong, "描述", ValidationRules.DescriptionMaxLength));
        if (request.SortOrder < 1) throw new ArgumentException(string.Format(ErrorMessages.ParameterInvalid, "排序"));
    }

    private static void NormalizeRequest(OrganizationUnitRequestBase request)
    {
        request.Name = request.Name?.Trim() ?? string.Empty;
        request.Code = string.IsNullOrWhiteSpace(request.Code) ? null : request.Code.Trim();
        request.ParentId = string.IsNullOrWhiteSpace(request.ParentId) ? null : request.ParentId.Trim();
        request.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        request.ManagerUserId = string.IsNullOrWhiteSpace(request.ManagerUserId) ? null : request.ManagerUserId.Trim();
        if (request.SortOrder < 1) request.SortOrder = 1;
    }

    private async Task EnsureParentExistsAsync(string parentId)
    {
        if (!await _context.Set<OrganizationUnit>().AnyAsync(x => x.Id == parentId)) throw new KeyNotFoundException(ErrorCode.OrganizationNotFound);
    }

    private async Task EnsureParentIsNotDescendantAsync(string currentId, string parentId)
    {
        var units = await _context.Set<OrganizationUnit>().ToListAsync();
        var parentMap = units.ToDictionary(u => u.Id, u => u.ParentId);
        var cursor = parentId;
        while (!string.IsNullOrEmpty(cursor))
        {
            if (cursor == currentId) throw new InvalidOperationException(ErrorCode.ParentCannotBeDescendant);
            if (!parentMap.TryGetValue(cursor, out cursor)) break;
        }
    }

    private async Task EnsureUniqueAsync(string name, string? code, string? parentId, string? excludeId = null)
    {
        if (await _context.Set<OrganizationUnit>().AnyAsync(o => o.Name == name && o.ParentId == parentId && o.Id != excludeId))
            throw new InvalidOperationException(ErrorCode.OrganizationNameExists);

        if (!string.IsNullOrEmpty(code) && await _context.Set<OrganizationUnit>().AnyAsync(o => o.Code == code && o.Id != excludeId))
            throw new InvalidOperationException(ErrorCode.OrganizationCodeExists);
    }

    public async Task<int> CountAsync() => (int)await _context.Set<OrganizationUnit>().LongCountAsync();
}