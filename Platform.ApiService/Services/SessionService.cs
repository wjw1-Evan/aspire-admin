using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using User = Platform.ApiService.Models.AppUser;

namespace Platform.ApiService.Services;

public class SessionService : ISessionService
{
    private readonly DbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ISocialService _socialService;
    private readonly ILogger<SessionService> _logger;

    public SessionService(
        DbContext context,
        IHttpContextAccessor httpContextAccessor,
        ISocialService socialService,
        ILogger<SessionService> logger)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
        _socialService = socialService;
        _logger = logger;
    }

    public async Task<CurrentUser?> GetCurrentUserAsync()
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext?.User?.Identity?.IsAuthenticated != true)
        {
            return new CurrentUser { IsLogin = false };
        }

        var userId = httpContext.User.FindFirst("userId")?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return new CurrentUser { IsLogin = false };
        }

        var user = await _context.Set<User>()
            .FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null || !user.IsActive)
        {
            return new CurrentUser { IsLogin = false };
        }

        var roleNames = new List<string>();
        UserCompany? firstUserCompany = null;
        string? companyDisplayName = null;
        string? companyName = null;
        string? companyLogo = null;

        if (!string.IsNullOrEmpty(user.CurrentCompanyId))
        {
            firstUserCompany = await _context.Set<UserCompany>()
                .FirstOrDefaultAsync(uc =>
                    uc.UserId == user.Id && uc.CompanyId == user.CurrentCompanyId);

            if (firstUserCompany?.RoleIds != null && firstUserCompany.RoleIds.Any())
            {
                roleNames = await _context.Set<Role>()
                    .Where(r => firstUserCompany.RoleIds.Contains(r.Id))
                    .Select(r => r.Name)
                    .ToListAsync();
            }

            var company = await _context.Set<Company>()
                .FirstOrDefaultAsync(c => c.Id == user.CurrentCompanyId);
            if (company != null)
            {
                companyDisplayName = company.DisplayName;
                companyName = company.Name;
                companyLogo = company.Logo;
            }
        }

        string? city = null;
        try
        {
            var locationInfo = await _socialService.GetCurrentUserLocationInfoAsync();
            city = locationInfo?.City;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "获取用户城市信息失败，用户ID: {UserId}", userId);
        }

        return new CurrentUser
        {
            Id = user.Id,
            Username = user.Username,
            DisplayName = string.IsNullOrWhiteSpace(user.Name) ? user.Username : user.Name,
            Avatar = string.IsNullOrWhiteSpace(user.Avatar) ? null : user.Avatar,
            Email = user.Email,
            Tags = user.Tags ?? new List<UserTag>(),
            Roles = roleNames,
            Phone = user.PhoneNumber,
            Age = user.Age,
            IsLogin = true,
            CurrentCompanyId = user.CurrentCompanyId,
            City = city,
            CurrentCompanyDisplayName = companyDisplayName,
            CurrentCompanyName = companyName,
            CurrentCompanyLogo = companyLogo
        };
    }
}
