using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public interface ISessionService
{
    Task<CurrentUser?> GetCurrentUserAsync(string? userId = null);
}
