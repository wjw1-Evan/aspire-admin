using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public interface ICompanyMemberService
{
    Task<List<UserCompanyItem>> GetUserCompaniesAsync(string userId);
    Task<UserCompany?> GetUserCompanyAsync(string userId, string companyId);
    Task<bool> IsUserAdminInCompanyAsync(string userId, string companyId);
    Task<List<CompanyMemberItem>> GetCompanyMembersAsync(string companyId);
    Task<bool> RemoveMemberAsync(string companyId, string userId);
    Task<bool> LeaveCompanyAsync(string userId, string companyId);
}

public interface ICompanyAdminService
{
    Task<SwitchCompanyResult> SwitchCompanyAsync(string targetCompanyId);
    Task<bool> UpdateMemberRolesAsync(string companyId, string userId, List<string> roleIds);
    Task<bool> SetMemberAsAdminAsync(string companyId, string userId, bool isAdmin);
}
