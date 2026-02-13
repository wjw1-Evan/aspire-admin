using Microsoft.EntityFrameworkCore;
using User = Platform.ApiService.Models.AppUser;
using System.Linq.Expressions;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using System.Security.Claims;

namespace Platform.ApiService.Services;

/// <summary>
/// 认证服务实现 - 处理用户登录、注册、密码管理等认证相关操作
/// </summary>
public class AuthService : IAuthService
{
    private readonly IDataFactory<User> _userFactory;
    private readonly IDataFactory<UserCompany> _userCompanyFactory;
    private readonly IDataFactory<Role> _roleFactory;
    private readonly IDataFactory<Company> _companyFactory;
    private readonly IDataFactory<Menu> _menuFactory;
    private readonly IJwtService _jwtService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IUserService _userService;
    private readonly ILogger<AuthService> _logger;
    private readonly IUniquenessChecker _uniquenessChecker;
    private readonly IFieldValidationService _validationService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IImageCaptchaService _imageCaptchaService;
    private readonly IPhoneValidationService _phoneValidationService;
    private readonly IDataFactory<LoginFailureRecord> _failureRecordFactory;
    private readonly ISocialService _socialService;
    private readonly IDataFactory<RefreshToken> _refreshTokenFactory;
    private readonly IConfiguration _configuration;
    private readonly IPasswordEncryptionService _encryptionService;

    /// <summary>
    /// 初始化认证服务
    /// </summary>
    /// <param name="userFactory">用户数据工厂</param>
    /// <param name="userCompanyFactory">用户企业关联数据工厂</param>
    /// <param name="roleFactory">角色数据工厂</param>
    /// <param name="companyFactory">企业数据工厂</param>
    /// <param name="menuFactory">菜单数据工厂</param>
    /// <param name="jwtService">JWT 服务</param>
    /// <param name="httpContextAccessor">HTTP 上下文访问器</param>
    /// <param name="userService">用户服务</param>
    /// <param name="logger">日志</param>
    /// <param name="uniquenessChecker">唯一性校验器</param>
    /// <param name="validationService">字段校验服务</param>
    /// <param name="passwordHasher">密码哈希服务</param>
    /// <param name="imageCaptchaService">图形验证码服务</param>
    /// <param name="phoneValidationService">手机号校验服务</param>
    /// <param name="failureRecordFactory">登录失败记录工厂</param>
    /// <param name="socialService">社交服务</param>
    /// <param name="refreshTokenFactory">刷新令牌工厂</param>
    /// <param name="configuration">配置</param>
    /// <param name="encryptionService">密码加密服务</param>
    public AuthService(
        IDataFactory<User> userFactory,
        IDataFactory<UserCompany> userCompanyFactory,
        IDataFactory<Role> roleFactory,
        IDataFactory<Company> companyFactory,
        IDataFactory<Menu> menuFactory,
        IJwtService jwtService,
        IHttpContextAccessor httpContextAccessor,
        IUserService userService,
        ILogger<AuthService> logger,
        IUniquenessChecker uniquenessChecker,
        IFieldValidationService validationService,
        IPasswordHasher passwordHasher,
        IImageCaptchaService imageCaptchaService,
        IPhoneValidationService phoneValidationService,
        IDataFactory<LoginFailureRecord> failureRecordFactory,
        ISocialService socialService,
        IDataFactory<RefreshToken> refreshTokenFactory,
        IConfiguration configuration,
        IPasswordEncryptionService encryptionService)
    {
        _userFactory = userFactory;
        _userCompanyFactory = userCompanyFactory;
        _roleFactory = roleFactory;
        _companyFactory = companyFactory;
        _menuFactory = menuFactory;
        _jwtService = jwtService;
        _httpContextAccessor = httpContextAccessor;
        _userService = userService;
        _logger = logger;
        _uniquenessChecker = uniquenessChecker;
        _validationService = validationService;
        _passwordHasher = passwordHasher;
        _imageCaptchaService = imageCaptchaService;
        _failureRecordFactory = failureRecordFactory;
        _phoneValidationService = phoneValidationService;
        _socialService = socialService;
        _refreshTokenFactory = refreshTokenFactory;
        _configuration = configuration;
        _encryptionService = encryptionService;
    }

    private async Task<int> GetFailureCountAsync(string clientId, string type)
    {
        Expression<Func<LoginFailureRecord, bool>> filter = r =>
            r.ClientId == clientId &&
            r.Type == type &&
            r.ExpiresAt > DateTime.UtcNow;
        var records = await _failureRecordFactory.FindWithoutTenantFilterAsync(filter);
        return records.FirstOrDefault()?.FailureCount ?? 0;
    }

    private async Task RecordFailureAsync(string clientId, string type)
    {
        Expression<Func<LoginFailureRecord, bool>> filter = r => r.ClientId == clientId && r.Type == type;
        var existingRecord = (await _failureRecordFactory.FindWithoutTenantFilterAsync(filter)).FirstOrDefault();

        if (existingRecord != null)
        {
            await _failureRecordFactory.UpdateAsync(existingRecord.Id!, r =>
            {
                r.FailureCount++;
                r.LastFailureAt = DateTime.UtcNow;
                r.ExpiresAt = DateTime.UtcNow.AddMinutes(30);
            });
        }
        else
        {
            var newRecord = new LoginFailureRecord
            {
                ClientId = clientId,
                Type = type,
                FailureCount = 1,
                LastFailureAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(30),
                IsDeleted = false
            };
            await _failureRecordFactory.CreateAsync(newRecord);
        }
    }

    private async Task ClearFailureAsync(string clientId, string type)
    {
        Expression<Func<LoginFailureRecord, bool>> filter = r => r.ClientId == clientId && r.Type == type;
        var record = (await _failureRecordFactory.FindWithoutTenantFilterAsync(filter)).FirstOrDefault();
        if (record != null)
        {
            await _failureRecordFactory.SoftDeleteAsync(record.Id!);
        }
    }

    private string GetClientIdentifier(string? username = null)
    {
        if (!string.IsNullOrEmpty(username))
        {
            return username.ToLowerInvariant();
        }
        var httpContext = _httpContextAccessor.HttpContext;
        return httpContext?.Connection?.RemoteIpAddress?.ToString() ?? "unknown";
    }

    /// <summary>
    /// 获取当前登录用户信息
    /// </summary>
    /// <returns>当前用户信息，未登录时返回 IsLogin=false</returns>
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

        var users = await _userFactory.FindAsync(u => u.Id == userId);
        var user = users.FirstOrDefault();
        if (user == null)
        {
            return new CurrentUser { IsLogin = false };
        }

        if (!user.IsActive)
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
            var userCompanies = await _userCompanyFactory.FindAsync(uc =>
                uc.UserId == user.Id && uc.CompanyId == user.CurrentCompanyId);
            firstUserCompany = userCompanies.FirstOrDefault();
            if (firstUserCompany?.RoleIds != null && firstUserCompany.RoleIds.Any())
            {
                var userRoles = await _roleFactory.FindAsync(r => firstUserCompany.RoleIds.Contains(r.Id));
                roleNames = userRoles.Select(r => r.Name).ToList();
            }

            var companies = await _companyFactory.FindAsync(c => c.Id == user.CurrentCompanyId);
            var company = companies.FirstOrDefault();
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
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
            City = city,
            CurrentCompanyDisplayName = companyDisplayName,
            CurrentCompanyName = companyName,
            CurrentCompanyLogo = companyLogo
        };
    }

    /// <summary>
    /// 用户登录
    /// </summary>
    /// <param name="request">登录请求</param>
    /// <returns>登录结果</returns>
    public async Task<ApiResponse<LoginData>> LoginAsync(LoginRequest request)
    {
        var clientId = GetClientIdentifier(request.Username);
        var failureCount = await GetFailureCountAsync(clientId, "login");
        var requiresCaptcha = failureCount > 0;

        if (requiresCaptcha)
        {
            if (string.IsNullOrEmpty(request.CaptchaId) || string.IsNullOrEmpty(request.CaptchaAnswer))
            {
                return ApiResponse<LoginData>.ErrorResult("CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN", "CAPTCHA_REQUIRED_AFTER_FAILED_LOGIN");
            }

            var captchaValid = await _imageCaptchaService.ValidateCaptchaAsync(request.CaptchaId, request.CaptchaAnswer, "login");
            if (!captchaValid)
            {
                await RecordFailureAsync(clientId, "login");
                return ApiResponse<LoginData>.ErrorResult("CAPTCHA_INVALID", "CAPTCHA_INVALID");
            }
        }

        var users = await _userFactory.FindAsync(u => u.Username == request.Username && u.IsActive == true);
        var user = users.FirstOrDefault();

        if (user == null)
        {
            await RecordFailureAsync(clientId, "login");
            return ApiResponse<LoginData>.ErrorResult("LOGIN_FAILED", "INVALID_CREDENTIALS");
        }

        // 🔒 安全增强：解密前端加密的密码
        var rawPassword = _encryptionService.TryDecryptPassword(request.Password ?? string.Empty);

        if (!_passwordHasher.VerifyPassword(rawPassword, user.PasswordHash))
        {
            await RecordFailureAsync(clientId, "login");
            return ApiResponse<LoginData>.ErrorResult("LOGIN_FAILED", "INVALID_CREDENTIALS");
        }

        await ClearFailureAsync(clientId, "login");

        bool shouldClearInvalidCompanyId = false;
        if (!string.IsNullOrEmpty(user.CurrentCompanyId))
        {
            // 使用 FindWithoutTenantFilterAsync 绕过过滤器，确保登录时能找到企业
            var companies = await _companyFactory.FindWithoutTenantFilterAsync(c => c.Id == user.CurrentCompanyId);
            var company = companies.FirstOrDefault();

            if (company == null)
            {
                // 鲁棒性修复：记录警告并标记清理，但不在此处立即执行异步任务避免 DbContext 并发错误
                _logger.LogWarning("LoginAsync: [发现无效数据] 用户 {UserId} 的 CurrentCompanyId 为 '{CompanyId}'，但在数据库中未找到。将在后续步骤中清理。", user.Id, user.CurrentCompanyId);
                shouldClearInvalidCompanyId = true;
            }
            else
            {
                if (!company.IsActive)
                {
                    return ApiResponse<LoginData>.ErrorResult("COMPANY_INACTIVE", ErrorMessages.CompanyInactive);
                }

                if (company.ExpiresAt.HasValue && company.ExpiresAt.Value < DateTime.UtcNow)
                {
                    return ApiResponse<LoginData>.ErrorResult("COMPANY_EXPIRED", ErrorMessages.CompanyExpired);
                }
            }
        }

        // 统一更新用户信息（最后登录时间 + 可选的无效企业 ID 清理）
        await _userFactory.UpdateAsync(user.Id!, u =>
        {
            u.LastLoginAt = DateTime.UtcNow;
            if (shouldClearInvalidCompanyId)
            {
                u.CurrentCompanyId = null;
            }
        });

        var httpContext = _httpContextAccessor.HttpContext;
        var ipAddress = httpContext?.Connection?.RemoteIpAddress?.ToString();
        var userAgent = httpContext?.Request?.Headers["User-Agent"].ToString();
        await _userService.LogUserActivityAsync(user.Id!, "login", "用户登录", ipAddress, userAgent);

        var token = _jwtService.GenerateToken(user);
        var refreshToken = _jwtService.GenerateRefreshToken(user);

        var expirationMinutes = int.Parse(_configuration["Jwt:ExpirationMinutes"] ?? "1440");
        var refreshTokenExpirationDays = int.Parse(_configuration["Jwt:RefreshTokenExpirationDays"] ?? "7");
        var refreshTokenEntity = new RefreshToken
        {
            UserId = user.Id!,
            Token = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpirationDays),
            IpAddress = ipAddress,
            UserAgent = userAgent,
            IsRevoked = false
        };
        await _refreshTokenFactory.CreateAsync(refreshTokenEntity);

        var loginData = new LoginData
        {
            Type = request.Type,
            CurrentAuthority = "user",
            Token = token,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes)
        };

        return ApiResponse<LoginData>.SuccessResult(loginData);
    }

    /// <summary>
    /// 用户登出
    /// </summary>
    /// <returns>是否成功</returns>
    public async Task<bool> LogoutAsync()
    {
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext?.User?.Identity?.IsAuthenticated == true)
        {
            var userId = httpContext.User.FindFirst("userId")?.Value;
            if (!string.IsNullOrEmpty(userId))
            {
                var ipAddress = httpContext?.Connection?.RemoteIpAddress?.ToString();
                var userAgent = httpContext?.Request?.Headers["User-Agent"].ToString();
                await _userService.LogUserActivityAsync(userId, "logout", "用户登出", ipAddress, userAgent);
            }
        }
        return true;
    }

    /// <summary>
    /// 用户注册
    /// </summary>
    /// <param name="request">注册请求</param>
    /// <returns>注册结果</returns>
    public async Task<ApiResponse<User>> RegisterAsync(RegisterRequest request)
    {
        var clientId = GetClientIdentifier(request.Username);
        var failureCount = await GetFailureCountAsync(clientId, "register");
        var requiresCaptcha = failureCount > 0;

        if (requiresCaptcha)
        {
            if (string.IsNullOrEmpty(request.CaptchaId) || string.IsNullOrEmpty(request.CaptchaAnswer))
            {
                return ApiResponse<User>.ErrorResult("CAPTCHA_REQUIRED", "CAPTCHA_REQUIRED_AFTER_FAILED_REGISTER");
            }

            var captchaValid = await _imageCaptchaService.ValidateCaptchaAsync(request.CaptchaId, request.CaptchaAnswer, "register");
            if (!captchaValid)
            {
                await RecordFailureAsync(clientId, "register");
                return ApiResponse<User>.ErrorResult("CAPTCHA_INVALID", "CAPTCHA_INVALID");
            }
        }

        _validationService.ValidateUsername(request.Username);
        _validationService.ValidatePassword(request.Password);
        _validationService.ValidateEmail(request.Email);
        if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            _phoneValidationService.ValidatePhone(request.PhoneNumber.Trim());
        }

        try
        {
            await _uniquenessChecker.EnsureUsernameUniqueAsync(request.Username);
        }
        catch (InvalidOperationException)
        {
            await RecordFailureAsync(clientId, "register");
            throw;
        }

        if (!string.IsNullOrEmpty(request.Email))
        {
            try
            {
                await _uniquenessChecker.EnsureEmailUniqueAsync(request.Email);
            }
            catch (InvalidOperationException)
            {
                await RecordFailureAsync(clientId, "register");
                throw;
            }
        }

        if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            try
            {
                await _uniquenessChecker.EnsurePhoneUniqueAsync(request.PhoneNumber.Trim());
            }
            catch (InvalidOperationException)
            {
                await RecordFailureAsync(clientId, "register");
                throw;
            }
        }

        User? user = null;
        Company? personalCompany = null;
        Role? adminRole = null;
        UserCompany? userCompany = null;

        try
        {
            // 🔒 安全增强：解密前端加密的密码
            var rawPassword = _encryptionService.TryDecryptPassword(request.Password);

            user = new User
            {
                Username = request.Username.Trim(),
                PasswordHash = _passwordHasher.HashPassword(rawPassword),
                Email = string.IsNullOrEmpty(request.Email) ? null : request.Email.Trim(),
                IsActive = true
            };

            if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
            {
                user.PhoneNumber = request.PhoneNumber.Trim();
            }

            await _userFactory.CreateAsync(user);
            _logger.LogInformation("用户注册成功: {Username} ({UserId})", user.Username, user.Id);

            var companyResult = await CreatePersonalCompanyWithDetailsAsync(user);
            personalCompany = companyResult.Company;
            adminRole = companyResult.Role;
            userCompany = companyResult.UserCompany;

            await _userFactory.UpdateAsync(user.Id!, u =>
            {
                u.CurrentCompanyId = personalCompany.Id;
                u.PersonalCompanyId = personalCompany.Id;
            });

            user.CurrentCompanyId = personalCompany.Id;
            user.PersonalCompanyId = personalCompany.Id;
            user.PasswordHash = string.Empty;

            _logger.LogInformation("用户 {Username} 注册完成，个人企业: {CompanyName}", user.Username, personalCompany.Name);

            await ClearFailureAsync(clientId, "register");

            return ApiResponse<User>.SuccessResult(user, "REGISTER_SUCCESS_PERSONAL_COMPANY_CREATED");
        }
        catch (ArgumentException ex)
        {
            await RollbackUserRegistrationAsync(user, personalCompany, adminRole, userCompany);
            await RecordFailureAsync(clientId, "register");
            return ApiResponse<User>.ValidationErrorResult(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            await RollbackUserRegistrationAsync(user, personalCompany, adminRole, userCompany);
            await RecordFailureAsync(clientId, "register");
            var errorCode = ex.Message.Contains("USER_NAME_EXISTS") ? "USER_EXISTS" : "EMAIL_EXISTS";
            return ApiResponse<User>.ErrorResult(errorCode, ex.Message);
        }
        catch (Exception ex)
        {
            await RollbackUserRegistrationAsync(user, personalCompany, adminRole, userCompany);
            await RecordFailureAsync(clientId, "register");
            _logger.LogError(ex, "用户注册失败，已执行回滚操作");
            return ApiResponse<User>.ErrorResult("SERVER_ERROR", $"REGISTER_FAILED: {ex.Message}");
        }
    }

    private async Task RollbackUserRegistrationAsync(User? user, Company? company, Role? role, UserCompany? userCompany)
    {
        try
        {
            if (userCompany != null)
            {
                await _userCompanyFactory.SoftDeleteAsync(userCompany.Id!);
                _logger.LogInformation("回滚：删除用户-企业关联 {UserCompanyId}", userCompany.Id);
            }

            if (role != null)
            {
                await _roleFactory.SoftDeleteAsync(role.Id!);
                _logger.LogInformation("回滚：删除角色 {RoleId}", role.Id);
            }

            if (company != null)
            {
                await _companyFactory.SoftDeleteAsync(company.Id!);
                _logger.LogInformation("回滚：删除企业 {CompanyId}", company.Id);
            }

            if (user != null)
            {
                await _userFactory.SoftDeleteAsync(user.Id!);
                _logger.LogInformation("回滚：删除用户 {UserId}", user.Id);
            }

            _logger.LogInformation("用户注册回滚完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "回滚操作失败，可能需要手动清理数据");
        }
    }

    private class CompanyCreationResult
    {
        public Company Company { get; set; } = null!;
        public Role Role { get; set; } = null!;
        public UserCompany UserCompany { get; set; } = null!;
    }

    private async Task<CompanyCreationResult> CreatePersonalCompanyWithDetailsAsync(User user)
    {
        Company? company = null;
        Role? adminRole = null;
        UserCompany? userCompany = null;

        try
        {
            company = new Company
            {
                Name = $"{user.Username} 的企业",
                Code = $"personal-{user.Id}",
                Description = "个人企业",
                IsActive = true,
                CreatedBy = user.Id
            };

            await _companyFactory.CreateAsync(company);
            _logger.LogInformation("创建个人企业: {CompanyName} ({CompanyCode}), CreatedBy: {CreatedBy}", company.Name, company.Code, company.CreatedBy);

            var allMenus = await _menuFactory.FindAsync(m => m.IsEnabled == true);
            var allMenuIds = allMenus.Select(m => m.Id!).ToList();
            _logger.LogInformation("获取 {Count} 个全局菜单", allMenuIds.Count);

            if (!allMenuIds.Any())
            {
                _logger.LogError("❌ 系统菜单未初始化！请确保 DataInitializer 服务已成功运行");
                throw new InvalidOperationException("系统菜单未初始化，请先运行 DataInitializer 服务");
            }

            adminRole = new Role
            {
                Name = "管理员",
                Description = "企业管理员，拥有所有菜单访问权限",
                CompanyId = company.Id!,
                MenuIds = allMenuIds,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _roleFactory.CreateAsync(adminRole);
            _logger.LogInformation("创建管理员角色: {RoleId}，分配 {MenuCount} 个菜单", adminRole.Id, allMenuIds.Count);

            userCompany = new UserCompany
            {
                UserId = user.Id!,
                CompanyId = company.Id!,
                RoleIds = new List<string> { adminRole.Id! },
                Status = "active",
                IsAdmin = true,
                JoinedAt = DateTime.UtcNow
            };

            await _userCompanyFactory.CreateAsync(userCompany);
            _logger.LogInformation("创建用户-企业关联: {UserId} -> {CompanyId}", user.Id, company.Id);

            return new CompanyCreationResult
            {
                Company = company,
                Role = adminRole,
                UserCompany = userCompany
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建个人企业失败: {CompanyName}", company?.Name);
            throw;
        }
    }

    private async Task<Company> CreatePersonalCompanyAsync(User user)
    {
        Company? company = null;
        Role? adminRole = null;

        try
        {
            company = new Company
            {
                Name = $"{user.Username} 的企业",
                Code = $"personal-{user.Id}",
                Description = "个人企业",
                IsActive = true,
                MaxUsers = 50,
                CreatedBy = user.Id
            };

            await _companyFactory.CreateAsync(company);
            _logger.LogInformation("创建个人企业: {CompanyName} ({CompanyCode}), CreatedBy: {CreatedBy}", company.Name, company.Code, company.CreatedBy);

            var allMenus = await _menuFactory.FindAsync(m => m.IsEnabled == true);
            var allMenuIds = allMenus.Select(m => m.Id!).ToList();
            _logger.LogInformation("获取 {Count} 个全局菜单", allMenuIds.Count);

            if (!allMenuIds.Any())
            {
                _logger.LogError("❌ 系统菜单未初始化！请确保 DataInitializer 服务已成功运行");
                throw new InvalidOperationException("系统菜单未初始化，请先运行 DataInitializer 服务");
            }

            adminRole = new Role
            {
                Name = "管理员",
                Description = "企业管理员，拥有所有菜单访问权限",
                CompanyId = company.Id!,
                MenuIds = allMenuIds,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _roleFactory.CreateAsync(adminRole);
            _logger.LogInformation("创建管理员角色: {RoleId}，分配 {MenuCount} 个菜单", adminRole.Id, allMenuIds.Count);

            var newUserCompany = new UserCompany
            {
                UserId = user.Id!,
                CompanyId = company.Id!,
                RoleIds = new List<string> { adminRole.Id! },
                IsAdmin = true,
                Status = "active",
                JoinedAt = DateTime.UtcNow,
                ApprovedBy = user.Id,
                ApprovedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _userCompanyFactory.CreateAsync(newUserCompany);

            _logger.LogInformation("个人企业创建完成");
            return company;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建个人企业失败，开始清理数据");

            try
            {
                if (user?.Id != null && company?.Id != null)
                {
                    var userCompanies = await _userCompanyFactory.FindAsync(uc =>
                        uc.UserId == user.Id && uc.CompanyId == company.Id);
                    var userCompanyToDelete = userCompanies.FirstOrDefault();

                    if (userCompanyToDelete != null)
                    {
                        await _userCompanyFactory.SoftDeleteAsync(userCompanyToDelete.Id!);
                        _logger.LogInformation("已清理用户-企业关联");
                    }
                }

                if (adminRole?.Id != null)
                {
                    await _roleFactory.SoftDeleteAsync(adminRole.Id!);
                    _logger.LogInformation("已清理角色");
                }

                if (company?.Id != null)
                {
                    await _companyFactory.SoftDeleteAsync(company.Id!);
                    _logger.LogInformation("已清理企业");
                }
            }
            catch (Exception cleanupEx)
            {
                _logger.LogError(cleanupEx, "清理数据失败");
            }

            throw new InvalidOperationException($"注册失败: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// 修改密码
    /// </summary>
    /// <param name="request">修改密码请求</param>
    /// <returns>修改结果</returns>
    public async Task<ApiResponse<bool>> ChangePasswordAsync(ChangePasswordRequest request)
    {
        try
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext?.User?.Identity?.IsAuthenticated != true)
            {
                return ApiResponse<bool>.UnauthorizedResult("用户未认证");
            }

            var userId = httpContext.User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return ApiResponse<bool>.UnauthorizedResult("用户ID不存在");
            }

            if (string.IsNullOrWhiteSpace(request.CurrentPassword))
                return ApiResponse<bool>.ValidationErrorResult("当前密码不能为空");
            if (string.IsNullOrWhiteSpace(request.NewPassword))
                return ApiResponse<bool>.ValidationErrorResult("新密码不能为空");
            if (string.IsNullOrWhiteSpace(request.ConfirmPassword))
                return ApiResponse<bool>.ValidationErrorResult("确认密码不能为空");
            if (request.NewPassword != request.ConfirmPassword)
                return ApiResponse<bool>.ValidationErrorResult("新密码和确认密码不一致");
            if (request.NewPassword.Length < 6)
                return ApiResponse<bool>.ValidationErrorResult("新密码长度至少6个字符");
            if (request.CurrentPassword == request.NewPassword)
                return ApiResponse<bool>.ValidationErrorResult("新密码不能与当前密码相同");

            var users = await _userFactory.FindAsync(u => u.Id == userId && u.IsActive == true);
            var user = users.FirstOrDefault();
            if (user == null)
                return ApiResponse<bool>.NotFoundResult("用户", userId);

            // 🔒 安全增强：解密前端加密的密码
            var rawCurrentPassword = _encryptionService.TryDecryptPassword(request.CurrentPassword);
            var rawNewPassword = _encryptionService.TryDecryptPassword(request.NewPassword);

            if (!_passwordHasher.VerifyPassword(rawCurrentPassword, user.PasswordHash))
                return ApiResponse<bool>.ErrorResult("INVALID_CURRENT_PASSWORD", "当前密码不正确");

            var newPasswordHash = _passwordHasher.HashPassword(rawNewPassword);
            await _userFactory.UpdateAsync(user.Id!, u =>
            {
                u.PasswordHash = newPasswordHash;
                u.UpdatedAt = DateTime.UtcNow;
            });

            var currentHttpContext = _httpContextAccessor.HttpContext;
            var ipAddress = currentHttpContext?.Connection?.RemoteIpAddress?.ToString();
            var userAgent = currentHttpContext?.Request?.Headers["User-Agent"].ToString();
            await _userService.LogUserActivityAsync(user.Id!, "change_password", "修改密码", ipAddress, userAgent);

            return ApiResponse<bool>.SuccessResult(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "修改密码失败");
            return ApiResponse<bool>.ErrorResult("INTERNAL_ERROR", "修改密码失败");
        }
    }

    /// <summary>
    /// 刷新访问令牌
    /// </summary>
    /// <param name="request">刷新令牌请求</param>
    /// <returns>刷新结果</returns>
    public async Task<ApiResponse<RefreshTokenResult>> RefreshTokenAsync(RefreshTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            return ApiResponse<RefreshTokenResult>.ErrorResult("REFRESH_TOKEN_EMPTY", "刷新token不能为空");

        var principal = _jwtService.ValidateRefreshToken(request.RefreshToken);
        if (principal == null)
            return ApiResponse<RefreshTokenResult>.ErrorResult("REFRESH_TOKEN_INVALID", "无效的刷新token");

        var userId = _jwtService.GetUserIdFromRefreshToken(request.RefreshToken);
        if (string.IsNullOrEmpty(userId))
            return ApiResponse<RefreshTokenResult>.ErrorResult("REFRESH_TOKEN_USER_NOT_FOUND", "无法从刷新token中获取用户信息");

        Expression<Func<RefreshToken, bool>> baseFilter = rt => rt.Token == request.RefreshToken && rt.UserId == userId && rt.IsRevoked == false;
        var existingToken = (await _refreshTokenFactory.FindWithoutTenantFilterAsync(baseFilter)).FirstOrDefault();

        if (existingToken == null)
        {
            var userTokens = await _refreshTokenFactory.FindWithoutTenantFilterAsync(rt => rt.UserId == userId && rt.IsRevoked == false);
            if (userTokens.Any())
            {
                await _refreshTokenFactory.UpdateManyAsync(
                    rt => rt.UserId == userId,
                    rt =>
                    {
                        rt.IsRevoked = true;
                        rt.RevokedAt = DateTime.UtcNow;
                        rt.RevokedReason = "检测到旧token重用攻击";
                    }
                );
                _logger.LogWarning("检测到用户 {UserId} 的旧token重用攻击，已撤销所有token", userId);
            }
            return ApiResponse<RefreshTokenResult>.ErrorResult("REFRESH_TOKEN_REVOKED", "刷新token无效或已被撤销");
        }

        if (existingToken.ExpiresAt < DateTime.UtcNow)
        {
            await _refreshTokenFactory.UpdateAsync(existingToken.Id!, rt =>
            {
                rt.IsRevoked = true;
                rt.RevokedAt = DateTime.UtcNow;
                rt.RevokedReason = "Token已过期";
            });
            return ApiResponse<RefreshTokenResult>.ErrorResult("REFRESH_TOKEN_EXPIRED", "刷新token已过期");
        }

        var users = await _userFactory.FindAsync(u => u.Id == userId && u.IsActive == true);
        var user = users.FirstOrDefault();
        if (user == null)
            return ApiResponse<RefreshTokenResult>.ErrorResult("USER_NOT_FOUND", "用户不存在或已被禁用");

        var newToken = _jwtService.GenerateToken(user);
        var newRefreshToken = _jwtService.GenerateRefreshToken(user);

        var httpContext = _httpContextAccessor.HttpContext;
        var ipAddress = httpContext?.Connection?.RemoteIpAddress?.ToString();
        var userAgent = httpContext?.Request?.Headers["User-Agent"].ToString();

        await _refreshTokenFactory.UpdateAsync(existingToken.Id!, rt =>
        {
            rt.IsRevoked = true;
            rt.RevokedAt = DateTime.UtcNow;
            rt.RevokedReason = "Token轮换";
        });

        var refreshTokenExpirationDays = int.Parse(_configuration["Jwt:RefreshTokenExpirationDays"] ?? "7");
        var newRefreshTokenEntity = new RefreshToken
        {
            UserId = userId,
            Token = newRefreshToken,
            PreviousToken = existingToken.Token,
            ExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpirationDays),
            IpAddress = ipAddress,
            UserAgent = userAgent,
            LastUsedAt = DateTime.UtcNow,
            IsRevoked = false
        };
        await _refreshTokenFactory.CreateAsync(newRefreshTokenEntity);

        await _userService.LogUserActivityAsync(userId, "refresh_token", "刷新访问token", ipAddress, userAgent);

        var expirationMinutes = int.Parse(_configuration["Jwt:ExpirationMinutes"] ?? "1440");
        var refreshTokenResult = new RefreshTokenResult
        {
            Status = "ok",
            Token = newToken,
            RefreshToken = newRefreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes)
        };

        return ApiResponse<RefreshTokenResult>.SuccessResult(refreshTokenResult);
    }
}
