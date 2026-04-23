using User = Platform.ApiService.Models.AppUser;
using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
    /// 用户注册服务接口
    /// </summary>
    public interface IRegistrationService
    {
        /// <summary>
        /// 用户注册
        /// </summary>
        Task<AppUser> RegisterAsync(RegisterRequest request);

        /// <summary>
        /// 回滚用户注册
        /// </summary>
        Task RollbackUserRegistrationAsync(User? user, Company? company, Role? role, UserCompany? userCompany);

        /// <summary>
        /// 更新用户验证Token
        /// </summary>
        Task UpdateUserVerificationTokenAsync(User user);
    }
