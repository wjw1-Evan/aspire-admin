using User = Platform.ApiService.Models.AppUser;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using System.Security.Claims;
using MongoDB.Driver;

namespace Platform.ApiService.Services;

/// <summary>
/// 认证服务实现 - 处理用户登录、注册、密码管理等认证相关操作
/// </summary>
public class AuthService : IAuthService
{
    private readonly IDatabaseOperationFactory<User> _userFactory;
    private readonly IDatabaseOperationFactory<UserCompany> _userCompanyFactory;
    private readonly IDatabaseOperationFactory<Role> _roleFactory;
    private readonly IDatabaseOperationFactory<Company> _companyFactory;
    private readonly IDatabaseOperationFactory<Menu> _menuFactory;
    private readonly IJwtService _jwtService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IUserService _userService;
    private readonly ILogger<AuthService> _logger;
    private readonly IUniquenessChecker _uniquenessChecker;
    private readonly IFieldValidationService _validationService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IImageCaptchaService _imageCaptchaService;
    private readonly IDatabaseOperationFactory<LoginFailureRecord> _failureRecordFactory;
    private readonly IPhoneValidationService _phoneValidationService;
    private readonly ISocialService _socialService;
    private readonly IDatabaseOperationFactory<RefreshToken> _refreshTokenFactory;
    private readonly IConfiguration _configuration;

    /// <summary>
    /// 初始化认证服务
    /// </summary>
    /// <param name="userFactory">用户数据操作工厂</param>
    /// <param name="userCompanyFactory">用户企业关联数据操作工厂</param>
    /// <param name="roleFactory">角色数据操作工厂</param>
    /// <param name="companyFactory">企业数据操作工厂</param>
    /// <param name="menuFactory">菜单数据操作工厂</param>
    /// <param name="jwtService">JWT 服务</param>
    /// <param name="httpContextAccessor">HTTP 上下文访问器</param>
    /// <param name="userService">用户服务</param>
    /// <param name="logger">日志记录器</param>
    /// <param name="uniquenessChecker">唯一性检查服务</param>
    /// <param name="validationService">字段验证服务</param>
    /// <param name="passwordHasher">密码哈希服务</param>
    /// <param name="imageCaptchaService">图形验证码服务</param>
    /// <param name="phoneValidationService">手机号校验服务</param>
    /// <param name="failureRecordFactory">登录失败记录数据操作工厂</param>
    /// <param name="socialService">社交服务（用于获取用户位置信息）</param>
    /// <param name="refreshTokenFactory">刷新令牌数据操作工厂</param>
    /// <param name="configuration">配置对象</param>
    public AuthService(
        IDatabaseOperationFactory<User> userFactory,
        IDatabaseOperationFactory<UserCompany> userCompanyFactory,
        IDatabaseOperationFactory<Role> roleFactory,
        IDatabaseOperationFactory<Company> companyFactory,
        IDatabaseOperationFactory<Menu> menuFactory,
        IJwtService jwtService,
        IHttpContextAccessor httpContextAccessor,
        IUserService userService,
        ILogger<AuthService> logger,
        IUniquenessChecker uniquenessChecker,
        IFieldValidationService validationService,
        IPasswordHasher passwordHasher,
        IImageCaptchaService imageCaptchaService,
        IPhoneValidationService phoneValidationService,
        IDatabaseOperationFactory<LoginFailureRecord> failureRecordFactory,
        ISocialService socialService,
        IDatabaseOperationFactory<RefreshToken> refreshTokenFactory,
        IConfiguration configuration)
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
    }

    // 🔒 安全修复：移除静态密码哈希方法，统一使用注入的 IPasswordHasher
    // 这样可以集中管理密码哈希逻辑，便于测试和更换哈希算法

    /// <summary>
    /// 获取失败尝试次数（用于判断是否需要验证码）
    /// </summary>
    /// <param name="clientId">客户端标识（IP地址或用户名）</param>
    /// <param name="type">类型（login 或 register）</param>
    /// <returns>失败次数</returns>
    private async Task<int> GetFailureCountAsync(string clientId, string type)
    {
        var filter = _failureRecordFactory.CreateFilterBuilder()
            .Equal(r => r.ClientId, clientId)
            .Equal(r => r.Type, type)
            .GreaterThan(r => r.ExpiresAt, DateTime.UtcNow) // 只查询未过期的记录
            .Build();

        var records = await _failureRecordFactory.FindWithoutTenantFilterAsync(filter);
        var record = records.FirstOrDefault();

        return record?.FailureCount ?? 0;
    }

    /// <summary>
    /// 记录失败尝试（增加失败次数）
    /// </summary>
    /// <param name="clientId">客户端标识（IP地址或用户名）</param>
    /// <param name="type">类型（login 或 register）</param>
    private async Task RecordFailureAsync(string clientId, string type)
    {
        var filter = _failureRecordFactory.CreateFilterBuilder()
            .Equal(r => r.ClientId, clientId)
            .Equal(r => r.Type, type)
            .Build();

        // 使用 UpdateOneAsync 配合 IsUpsert，避免 Id 为 null 的问题
        // 这样可以原子性地更新现有记录或插入新记录
        // Inc 在 upsert 时，如果字段不存在会将字段设置为指定值（1），如果存在则增加
        // 注意：updatedAt 由 FindOneAndUpdateWithoutTenantFilterAsync 内部的 WithUpdateAudit 自动设置，不需要手动设置
        var update = _failureRecordFactory.CreateUpdateBuilder()
            .Inc(r => r.FailureCount, 1) // 增加失败次数（新记录时设置为1，现有记录时增加1）
            .Set(r => r.LastFailureAt, DateTime.UtcNow)
            .Set(r => r.ExpiresAt, DateTime.UtcNow.AddMinutes(30)) // 重置过期时间
            .SetOnInsert(r => r.ClientId, clientId) // 仅在插入时设置
            .SetOnInsert(r => r.Type, type) // 仅在插入时设置
            .SetOnInsert(r => r.CreatedAt, DateTime.UtcNow) // 仅在插入时设置
            .SetOnInsert(r => r.IsDeleted, false) // 仅在插入时设置
            .Build();

        var options = new MongoDB.Driver.FindOneAndUpdateOptions<LoginFailureRecord>
        {
            IsUpsert = true, // 如果不存在则插入
            ReturnDocument = MongoDB.Driver.ReturnDocument.After
        };

        await _failureRecordFactory.FindOneAndUpdateWithoutTenantFilterAsync(filter, update, options);
    }

    /// <summary>
    /// 清除失败记录（登录/注册成功时调用）
    /// </summary>
    /// <param name="clientId">客户端标识（IP地址或用户名）</param>
    /// <param name="type">类型（login 或 register）</param>
    private async Task ClearFailureAsync(string clientId, string type)
    {
        var filter = _failureRecordFactory.CreateFilterBuilder()
            .Equal(r => r.ClientId, clientId)
            .Equal(r => r.Type, type)
            .Build();

        // 使用软删除（原子操作）
        await _failureRecordFactory.FindOneAndSoftDeleteWithoutTenantFilterAsync(filter);
    }

    /// <summary>
    /// 获取客户端标识（IP地址或用户名）
    /// </summary>
    /// <param name="username">用户名（可选）</param>
    /// <returns>客户端标识</returns>
    private string GetClientIdentifier(string? username = null)
    {
        // 优先使用用户名，如果没有则使用IP地址
        if (!string.IsNullOrEmpty(username))
        {
            return username.ToLowerInvariant();
        }

        var httpContext = _httpContextAccessor.HttpContext;
        var ipAddress = httpContext?.Connection?.RemoteIpAddress?.ToString() ?? "unknown";
        return ipAddress;
    }

    /// <summary>
    /// 获取当前登录用户信息
    /// </summary>
    /// <returns>当前用户信息，如果未登录则返回 null</returns>
    public async Task<CurrentUser?> GetCurrentUserAsync()
    {
        // 从 HTTP 上下文获取当前用户信息
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext?.User?.Identity?.IsAuthenticated != true)
        {
            // 未认证：用户未登录或 token 无效
            return new CurrentUser
            {
                IsLogin = false
            };
        }

        // 从 Claims 获取用户 ID
        var userId = httpContext.User.FindFirst("userId")?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            // Token 有效但缺少用户 ID：token 格式错误
            return new CurrentUser
            {
                IsLogin = false
            };
        }

        // 从数据库获取用户信息
        var users = await _userFactory.FindAsync(_userFactory.CreateFilterBuilder().Equal(u => u.Id, userId).Build());
        var user = users.FirstOrDefault();
        if (user == null)
        {
            // 用户不存在：可能已被删除
            return new CurrentUser
            {
                IsLogin = false
            };
        }

        if (!user.IsActive)
        {
            // 用户已被禁用：账户被管理员停用
            return new CurrentUser
            {
                IsLogin = false
            };
        }

        // 获取用户角色信息
        var roleNames = new List<string>();
        UserCompany? firstUserCompany = null;

        if (!string.IsNullOrEmpty(user.CurrentCompanyId))
        {
            // 使用工厂查询 UserCompany 记录
            var userCompanyFilter = _userCompanyFactory.CreateFilterBuilder()
                .Equal(uc => uc.UserId, user.Id)
                .Equal(uc => uc.CompanyId, user.CurrentCompanyId)
                .Build();

            var userCompany = await _userCompanyFactory.FindAsync(userCompanyFilter);
            firstUserCompany = userCompany.FirstOrDefault();
            if (firstUserCompany?.RoleIds != null && firstUserCompany.RoleIds.Any())
            {
                // ✅ 优化：使用字段投影，只返回 Name
                var roleFilter = _roleFactory.CreateFilterBuilder()
                    .In(r => r.Id, firstUserCompany.RoleIds)
                    .Build();
                var roleProjection = _roleFactory.CreateProjectionBuilder()
                    .Include(r => r.Id)
                    .Include(r => r.Name)
                    .Build();
                var userRoles = await _roleFactory.FindAsync(roleFilter, projection: roleProjection);
                roleNames = userRoles.Select(r => r.Name).ToList();
            }
        }

        // 获取用户最后一次保存的城市信息（从位置信标中获取）
        string? city = null;
        try
        {
            var locationInfo = await _socialService.GetCurrentUserLocationInfoAsync();
            city = locationInfo?.City;
        }
        catch (Exception ex)
        {
            // 获取城市信息失败不影响用户信息返回，只记录警告
            _logger.LogWarning(ex, "获取用户城市信息失败，用户ID: {UserId}", userId);
        }

        // 构建统一的用户信息
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
            City = city
        };
    }

    /// <summary>
    /// 用户登录
    /// </summary>
    /// <param name="request">登录请求</param>
    /// <returns>登录结果，包含 Token 和用户信息</returns>
    public async Task<ApiResponse<LoginData>> LoginAsync(LoginRequest request)
    {
        var clientId = GetClientIdentifier(request.Username);
        var failureCount = await GetFailureCountAsync(clientId, "login");
        var requiresCaptcha = failureCount > 0; // 失败过一次后需要验证码

        // 如果之前失败过，需要验证码
        if (requiresCaptcha)
        {
            if (string.IsNullOrEmpty(request.CaptchaId) || string.IsNullOrEmpty(request.CaptchaAnswer))
            {
                return ApiResponse<LoginData>.ErrorResult(
                    "CAPTCHA_REQUIRED",
                    "登录失败后需要输入验证码，请先获取验证码"
                );
            }

            var captchaValid = await _imageCaptchaService.ValidateCaptchaAsync(request.CaptchaId, request.CaptchaAnswer, "login");
            if (!captchaValid)
            {
                await RecordFailureAsync(clientId, "login"); // 验证码错误也记录失败
                return ApiResponse<LoginData>.ErrorResult(
                    "CAPTCHA_INVALID",
                    "图形验证码错误，请重新输入"
                );
            }
        }

        // v3.1: 用户名全局查找（不需要企业代码）
        var filter = _userFactory.CreateFilterBuilder()
            .Equal(u => u.Username, request.Username)
            .Equal(u => u.IsActive, true)
            .Build();
        var users = await _userFactory.FindAsync(filter);
        var user = users.FirstOrDefault();

        if (user == null)
        {
            await RecordFailureAsync(clientId, "login");
            return ApiResponse<LoginData>.ErrorResult(
                "LOGIN_FAILED",
                "用户名或密码错误，请检查后重试"
            );
        }

        // 验证密码
        if (!_passwordHasher.VerifyPassword(request.Password ?? string.Empty, user.PasswordHash))
        {
            await RecordFailureAsync(clientId, "login");
            return ApiResponse<LoginData>.ErrorResult(
                "LOGIN_FAILED",
                "用户名或密码错误，请检查后重试"
            );
        }

        // 登录成功，清除失败记录
        await ClearFailureAsync(clientId, "login");

        // v3.1: 检查当前企业状态（如果有）
        if (!string.IsNullOrEmpty(user.CurrentCompanyId))
        {
            var companies = await _companyFactory.FindAsync(_companyFactory.CreateFilterBuilder().Equal(c => c.Id, user.CurrentCompanyId).Build());
            var company = companies.FirstOrDefault();

            if (company == null)
            {
                return ApiResponse<LoginData>.ErrorResult(
                    "COMPANY_NOT_FOUND",
                    "当前企业不存在，请联系管理员"
                );
            }

            if (!company.IsActive)
            {
                return ApiResponse<LoginData>.ErrorResult(
                    "COMPANY_INACTIVE",
                    ErrorMessages.CompanyInactive
                );
            }

            if (company.ExpiresAt.HasValue && company.ExpiresAt.Value < DateTime.UtcNow)
            {
                return ApiResponse<LoginData>.ErrorResult(
                    "COMPANY_EXPIRED",
                    ErrorMessages.CompanyExpired
                );
            }
        }

        // 更新最后登录时间
        var loginFilter = _userFactory.CreateFilterBuilder().Equal(u => u.Id, user.Id).Build();
        var loginUpdate = _userFactory.CreateUpdateBuilder()
            .Set(u => u.LastLoginAt, DateTime.UtcNow)
            .Build();

        await _userFactory.FindOneAndUpdateAsync(loginFilter, loginUpdate);

        // 记录登录活动日志
        var httpContext = _httpContextAccessor.HttpContext;
        var ipAddress = httpContext?.Connection?.RemoteIpAddress?.ToString();
        var userAgent = httpContext?.Request?.Headers["User-Agent"].ToString();
        await _userService.LogUserActivityAsync(user.Id!, "login", "用户登录", ipAddress, userAgent);

        // 生成 JWT token 和刷新token
        var token = _jwtService.GenerateToken(user);
        var refreshToken = _jwtService.GenerateRefreshToken(user);

        // 保存刷新token到数据库
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
            CurrentAuthority = "user", // 默认权限，实际权限由角色系统决定
            Token = token,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes) // 从配置读取访问token过期时间
        };

        return ApiResponse<LoginData>.SuccessResult(loginData);
    }

    /// <summary>
    /// 用户登出
    /// </summary>
    /// <returns>是否成功登出</returns>
    public async Task<bool> LogoutAsync()
    {
        // 从 HTTP 上下文获取当前用户信息
        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext?.User?.Identity?.IsAuthenticated == true)
        {
            var userId = httpContext.User.FindFirst("userId")?.Value;
            if (!string.IsNullOrEmpty(userId))
            {
                // 记录登出活动日志
                var ipAddress = httpContext?.Connection?.RemoteIpAddress?.ToString();
                var userAgent = httpContext?.Request?.Headers["User-Agent"].ToString();
                await _userService.LogUserActivityAsync(userId, "logout", "用户登出", ipAddress, userAgent);
            }
        }

        // JWT 是无状态的，登出只需要客户端删除 token
        // 如果需要服务端登出，可以实现 token 黑名单机制
        return true;
    }


    /// <summary>
    /// v3.1: 用户注册（自动创建个人企业，支持事务回滚）
    /// </summary>
    public async Task<ApiResponse<User>> RegisterAsync(RegisterRequest request)
    {
        var clientId = GetClientIdentifier(request.Username);
        var failureCount = await GetFailureCountAsync(clientId, "register");
        var requiresCaptcha = failureCount > 0; // 失败过一次后需要验证码

        // 如果之前失败过，需要验证码
        if (requiresCaptcha)
        {
            if (string.IsNullOrEmpty(request.CaptchaId) || string.IsNullOrEmpty(request.CaptchaAnswer))
            {
                return ApiResponse<User>.ErrorResult(
                    "CAPTCHA_REQUIRED",
                    "注册失败后需要输入验证码，请先获取验证码"
                );
            }

            var captchaValid = await _imageCaptchaService.ValidateCaptchaAsync(request.CaptchaId, request.CaptchaAnswer, "register");
            if (!captchaValid)
            {
                await RecordFailureAsync(clientId, "register"); // 验证码错误也记录失败
                return ApiResponse<User>.ErrorResult(
                    "CAPTCHA_INVALID",
                    "图形验证码错误，请重新输入"
                );
            }
        }

        // 1. 验证输入
        _validationService.ValidateUsername(request.Username);
        _validationService.ValidatePassword(request.Password);
        _validationService.ValidateEmail(request.Email);
        if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            _phoneValidationService.ValidatePhone(request.PhoneNumber.Trim());
        }

        // 2. 检查用户名全局唯一
        try
        {
            await _uniquenessChecker.EnsureUsernameUniqueAsync(request.Username);
        }
        catch (InvalidOperationException)
        {
            await RecordFailureAsync(clientId, "register");
            throw; // 重新抛出异常，让调用者处理
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
                throw; // 重新抛出异常，让调用者处理
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

        // 3. 执行注册流程（使用错误回滚机制，因为单机MongoDB不支持事务）
        User? user = null;
        Company? personalCompany = null;
        Role? adminRole = null;
        UserCompany? userCompany = null;

        try
        {
            // 创建用户
            user = new User
            {
                Username = request.Username.Trim(),
                PasswordHash = _passwordHasher.HashPassword(request.Password),
                Email = string.IsNullOrEmpty(request.Email) ? null : request.Email.Trim(),
                IsActive = true
                // ✅ DatabaseOperationFactory.CreateAsync 会自动设置 IsDeleted = false, CreatedAt, UpdatedAt
            };

            // 只有当 PhoneNumber 有值时才设置
            // AppUser.PhoneNumber 使用了 [BsonIgnoreIfNull] 特性，null 值不会被写入数据库
            // 这样可以避免稀疏唯一索引的 null 值冲突问题
            if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
            {
                user.PhoneNumber = request.PhoneNumber.Trim();
            }

            await _userFactory.CreateAsync(user);
            _logger.LogInformation("用户注册成功: {Username} ({UserId})", user.Username, user.Id);

            // 创建个人企业
            var companyResult = await CreatePersonalCompanyWithDetailsAsync(user);
            personalCompany = companyResult.Company;
            adminRole = companyResult.Role;
            userCompany = companyResult.UserCompany;

            // 设置用户的企业信息（v3.1: 使用 CurrentCompanyId 和 PersonalCompanyId，不再使用 CompanyId）
            var userFilter = _userFactory.CreateFilterBuilder().Equal(u => u.Id, user.Id).Build();
            var userUpdate = _userFactory.CreateUpdateBuilder()
                .Set(u => u.CurrentCompanyId, personalCompany.Id!)
                .Set(u => u.PersonalCompanyId, personalCompany.Id!)
                // 注意：AppUser 不再有 CompanyId 字段（多企业模型，通过 UserCompany 关联表管理）
                .SetCurrentTimestamp()
                .Build();

            await _userFactory.FindOneAndUpdateAsync(userFilter, userUpdate);

            // 更新用户对象（用于后续返回）
            user.CurrentCompanyId = personalCompany.Id;
            user.PersonalCompanyId = personalCompany.Id;
            // 注意：AppUser 不再有 CompanyId 字段（多企业模型）

            // 清除密码哈希
            user.PasswordHash = string.Empty;

            _logger.LogInformation("用户 {Username} 注册完成，个人企业: {CompanyName}",
                user.Username, personalCompany.Name);

            // 注册成功，清除失败记录
            await ClearFailureAsync(clientId, "register");

            return ApiResponse<User>.SuccessResult(user, "注册成功！已为您创建个人企业。");
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
            // 唯一性检查失败
            var errorCode = ex.Message.Contains("用户名") ? "USER_EXISTS" : "EMAIL_EXISTS";
            return ApiResponse<User>.ErrorResult(errorCode, ex.Message);
        }
        catch (Exception ex)
        {
            await RollbackUserRegistrationAsync(user, personalCompany, adminRole, userCompany);
            await RecordFailureAsync(clientId, "register");
            _logger.LogError(ex, "用户注册失败，已执行回滚操作");
            return ApiResponse<User>.ErrorResult("SERVER_ERROR", $"注册失败: {ex.Message}");
        }
    }

    /// <summary>
    /// 回滚用户注册操作（清理已创建的数据）
    /// </summary>
    private async Task RollbackUserRegistrationAsync(User? user, Company? company, Role? role, UserCompany? userCompany)
    {
        try
        {
            // 按相反顺序删除（避免外键约束问题）
            if (userCompany != null)
            {
                var filter = _userCompanyFactory.CreateFilterBuilder().Equal(uc => uc.Id, userCompany.Id).Build();
                await _userCompanyFactory.FindOneAndSoftDeleteAsync(filter);
                _logger.LogInformation("回滚：删除用户-企业关联 {UserCompanyId}", userCompany.Id);
            }

            if (role != null)
            {
                var filter = _roleFactory.CreateFilterBuilder().Equal(r => r.Id, role.Id).Build();
                await _roleFactory.FindOneAndSoftDeleteAsync(filter);
                _logger.LogInformation("回滚：删除角色 {RoleId}", role.Id);
            }

            if (company != null)
            {
                var filter = _companyFactory.CreateFilterBuilder().Equal(c => c.Id, company.Id).Build();
                await _companyFactory.FindOneAndSoftDeleteAsync(filter);
                _logger.LogInformation("回滚：删除企业 {CompanyId}", company.Id);
            }

            if (user != null)
            {
                var filter = _userFactory.CreateFilterBuilder().Equal(u => u.Id, user.Id).Build();
                await _userFactory.FindOneAndSoftDeleteAsync(filter);
                _logger.LogInformation("回滚：删除用户 {UserId}", user.Id);
            }

            _logger.LogInformation("用户注册回滚完成");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "回滚操作失败，可能需要手动清理数据");
        }
    }

    /// <summary>
    /// 企业创建结果（用于回滚）
    /// </summary>
    private class CompanyCreationResult
    {
        public Company Company { get; set; } = null!;
        public Role Role { get; set; } = null!;
        public UserCompany UserCompany { get; set; } = null!;
    }

    /// <summary>
    /// v3.1: 创建个人企业（返回详细信息用于回滚）
    /// </summary>
    private async Task<CompanyCreationResult> CreatePersonalCompanyWithDetailsAsync(User user)
    {
        Company? company = null;
        Role? adminRole = null;
        UserCompany? userCompany = null;

        try
        {
            // 1. 创建个人企业
            company = new Company
            {
                Name = $"{user.Username} 的企业",
                Code = $"personal-{user.Id}",  // 使用用户ID保证唯一
                Description = "个人企业",
                IsActive = true
                // ✅ DatabaseOperationFactory.CreateAsync 会自动设置 IsDeleted = false, CreatedAt, UpdatedAt
            };

            await _companyFactory.CreateAsync(company);
            _logger.LogInformation("创建个人企业: {CompanyName} ({CompanyCode})", company.Name, company.Code);

            // 2. 获取所有全局菜单ID（菜单是全局资源，所有企业共享）
            // DatabaseOperationFactory 会自动应用 IsDeleted = false 的软删除过滤
            var menuFilter = _menuFactory.CreateFilterBuilder()
                .Equal(m => m.IsEnabled, true)
                .Build();
            var allMenus = await _menuFactory.FindAsync(menuFilter);
            var allMenuIds = allMenus.Select(m => m.Id!).ToList();
            _logger.LogInformation("获取 {Count} 个全局菜单", allMenuIds.Count);

            // 验证菜单数据完整性
            if (!allMenuIds.Any())
            {
                _logger.LogError("❌ 系统菜单未初始化！请确保 DataInitializer 服务已成功运行");
                throw new InvalidOperationException("系统菜单未初始化，请先运行 DataInitializer 服务");
            }

            // 3. 创建管理员角色（分配所有菜单）
            adminRole = new Role
            {
                Name = "管理员",
                Description = "企业管理员，拥有所有菜单访问权限",
                CompanyId = company.Id!,
                MenuIds = allMenuIds,  // 分配所有全局菜单
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _roleFactory.CreateAsync(adminRole);
            _logger.LogInformation("创建管理员角色: {RoleId}，分配 {MenuCount} 个菜单", adminRole.Id, allMenuIds.Count);

            // 4. 创建用户-企业关联（用户是管理员）
            userCompany = new UserCompany
            {
                UserId = user.Id!,
                CompanyId = company.Id!,
                RoleIds = new List<string> { adminRole.Id! },
                Status = "active",
                IsAdmin = true,
                JoinedAt = DateTime.UtcNow  // 业务字段，需要手动设置
                // ✅ DatabaseOperationFactory.CreateAsync 会自动设置 IsDeleted = false, CreatedAt, UpdatedAt
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


    /// <summary>
    /// v3.1: 创建个人企业（用户注册时自动调用）
    /// 注意：MongoDB单机模式不支持事务，使用错误回滚机制
    /// </summary>
    private async Task<Company> CreatePersonalCompanyAsync(User user)
    {
        Company? company = null;
        Role? adminRole = null;

        try
        {
            // 1. 创建个人企业
            company = new Company
            {
                Name = $"{user.Username} 的企业",
                Code = $"personal-{user.Id}",  // 使用用户ID保证唯一
                Description = "个人企业",
                IsActive = true,
                MaxUsers = 50,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _companyFactory.CreateAsync(company);
            _logger.LogInformation("创建个人企业: {CompanyName} ({CompanyCode})", company.Name, company.Code);

            // 2. 获取所有全局菜单ID（菜单是全局资源，所有企业共享）
            // DatabaseOperationFactory 会自动应用 IsDeleted = false 的软删除过滤
            var menuFilter = _menuFactory.CreateFilterBuilder()
                .Equal(m => m.IsEnabled, true)
                .Build();
            var allMenus = await _menuFactory.FindAsync(menuFilter);
            var allMenuIds = allMenus.Select(m => m.Id!).ToList();
            _logger.LogInformation("获取 {Count} 个全局菜单", allMenuIds.Count);

            // 验证菜单数据完整性
            if (!allMenuIds.Any())
            {
                _logger.LogError("❌ 系统菜单未初始化！请确保 DataInitializer 服务已成功运行");
                throw new InvalidOperationException("系统菜单未初始化，请先运行 DataInitializer 服务");
            }

            // 3. 创建管理员角色（分配所有菜单）
            adminRole = new Role
            {
                Name = "管理员",
                Description = "企业管理员，拥有所有菜单访问权限",
                CompanyId = company.Id!,
                MenuIds = allMenuIds,  // 分配所有全局菜单
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _roleFactory.CreateAsync(adminRole);
            _logger.LogInformation("创建管理员角色: {RoleId}，分配 {MenuCount} 个菜单", adminRole.Id, allMenuIds.Count);

            // 4. 创建用户-企业关联（用户是管理员）
            var userCompany = new UserCompany
            {
                UserId = user.Id!,
                CompanyId = company.Id!,
                RoleIds = new List<string> { adminRole.Id! },
                IsAdmin = true,
                Status = "active",
                JoinedAt = DateTime.UtcNow,
                ApprovedBy = user.Id,  // 自己审核自己
                ApprovedAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _userCompanyFactory.CreateAsync(userCompany);

            _logger.LogInformation("个人企业创建完成");

            return company;
        }
        catch (Exception ex)
        {
            // 错误回滚：清理已创建的数据
            _logger.LogError(ex, "创建个人企业失败，开始清理数据");

            try
            {
                // 按创建的逆序删除
                // 1. 删除用户-企业关联
                if (user?.Id != null && company?.Id != null)
                {
                    // 查找并删除用户-企业关联
                    var userCompanyFilter = _userCompanyFactory.CreateFilterBuilder()
                        .Equal(uc => uc.UserId, user.Id)
                        .Equal(uc => uc.CompanyId, company.Id)
                        .Build();
                    var userCompanies = await _userCompanyFactory.FindAsync(userCompanyFilter);
                    var userCompanyToDelete = userCompanies.FirstOrDefault();

                    if (userCompanyToDelete != null)
                    {
                        var filter = _userCompanyFactory.CreateFilterBuilder().Equal(uc => uc.Id, userCompanyToDelete.Id!).Build();
                        await _userCompanyFactory.FindOneAndSoftDeleteAsync(filter);
                        _logger.LogInformation("已清理用户-企业关联: UserId={UserId}, CompanyId={CompanyId}", user.Id, company.Id);
                    }
                }

                // 2. 删除角色
                if (adminRole?.Id != null)
                {
                    var filter = _roleFactory.CreateFilterBuilder().Equal(r => r.Id, adminRole.Id!).Build();
                    await _roleFactory.FindOneAndSoftDeleteAsync(filter);
                    _logger.LogInformation("已清理角色: {RoleId}", adminRole.Id);
                }

                // 3. 删除企业
                if (company?.Id != null)
                {
                    var filter = _companyFactory.CreateFilterBuilder().Equal(c => c.Id, company.Id).Build();
                    await _companyFactory.FindOneAndSoftDeleteAsync(filter);
                    _logger.LogInformation("已清理企业: {CompanyId}", company.Id);
                }
            }
            catch (Exception cleanupEx)
            {
                _logger.LogError(cleanupEx, "清理数据失败，可能需要手动清理");
            }

            throw new InvalidOperationException($"注册失败: {ex.Message}", ex);
        }
    }

    /// <summary>
    /// 修改密码
    /// </summary>
    /// <param name="request">修改密码请求</param>
    /// <returns>是否成功修改</returns>
    public async Task<ApiResponse<bool>> ChangePasswordAsync(ChangePasswordRequest request)
    {
        try
        {
            // 从 HTTP 上下文获取当前用户信息
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext?.User?.Identity?.IsAuthenticated != true)
            {
                return ApiResponse<bool>.UnauthorizedResult("用户未认证");
            }

            // 从 Claims 获取用户 ID
            var userId = httpContext.User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return ApiResponse<bool>.UnauthorizedResult("用户ID不存在");
            }

            // 验证输入参数
            if (string.IsNullOrWhiteSpace(request.CurrentPassword))
            {
                return ApiResponse<bool>.ValidationErrorResult("当前密码不能为空");
            }

            if (string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return ApiResponse<bool>.ValidationErrorResult("新密码不能为空");
            }

            if (string.IsNullOrWhiteSpace(request.ConfirmPassword))
            {
                return ApiResponse<bool>.ValidationErrorResult("确认密码不能为空");
            }

            // 验证新密码和确认密码是否一致
            if (request.NewPassword != request.ConfirmPassword)
            {
                return ApiResponse<bool>.ValidationErrorResult("新密码和确认密码不一致");
            }

            // 验证新密码强度
            if (request.NewPassword.Length < 6)
            {
                return ApiResponse<bool>.ValidationErrorResult("新密码长度至少6个字符");
            }

            // 验证新密码不能与当前密码相同
            if (request.CurrentPassword == request.NewPassword)
            {
                return ApiResponse<bool>.ValidationErrorResult("新密码不能与当前密码相同");
            }

            // 从数据库获取用户信息
            var users = await _userFactory.FindAsync(_userFactory.CreateFilterBuilder().Equal(u => u.Id, userId).Equal(u => u.IsActive, true).Build());
            var user = users.FirstOrDefault();
            if (user == null)
            {
                return ApiResponse<bool>.NotFoundResult("用户", userId);
            }

            // 验证当前密码是否正确
            if (!_passwordHasher.VerifyPassword(request.CurrentPassword, user.PasswordHash))
            {
                return ApiResponse<bool>.ErrorResult("INVALID_CURRENT_PASSWORD", "当前密码不正确");
            }

            // 更新密码
            var newPasswordHash = _passwordHasher.HashPassword(request.NewPassword);

            var filter = _userFactory.CreateFilterBuilder().Equal(u => u.Id, user.Id).Build();
            var update = _userFactory.CreateUpdateBuilder()
                .Set(u => u.PasswordHash, newPasswordHash)
                .Set(u => u.UpdatedAt, DateTime.UtcNow)
                .Build();

            await _userFactory.FindOneAndUpdateAsync(filter, update);

            // 记录修改密码活动日志
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
    /// 刷新 Token
    /// </summary>
    /// <param name="request">刷新 Token 请求</param>
    /// <returns>新的 Token 信息</returns>
    public async Task<ApiResponse<RefreshTokenResult>> RefreshTokenAsync(RefreshTokenRequest request)
    {
        // 验证输入参数
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return ApiResponse<RefreshTokenResult>.ErrorResult(
                "REFRESH_TOKEN_EMPTY",
                "刷新token不能为空"
            );
        }

        // 验证刷新token（JWT格式）
        var principal = _jwtService.ValidateRefreshToken(request.RefreshToken);
        if (principal == null)
        {
            return ApiResponse<RefreshTokenResult>.ErrorResult(
                "REFRESH_TOKEN_INVALID",
                "无效的刷新token"
            );
        }

        // 从刷新token中获取用户ID
        var userId = _jwtService.GetUserIdFromRefreshToken(request.RefreshToken);
        if (string.IsNullOrEmpty(userId))
        {
            return ApiResponse<RefreshTokenResult>.ErrorResult(
                "REFRESH_TOKEN_USER_NOT_FOUND",
                "无法从刷新token中获取用户信息"
            );
        }

        // 从数据库查找刷新token记录
        var refreshTokenFilter = _refreshTokenFactory.CreateFilterBuilder()
            .Equal(rt => rt.Token, request.RefreshToken)
            .Equal(rt => rt.UserId, userId)
            .Equal(rt => rt.IsRevoked, false)
            .Build();

        var existingTokens = await _refreshTokenFactory.FindWithoutTenantFilterAsync(refreshTokenFilter);
        var existingToken = existingTokens.FirstOrDefault();

        // 检查token是否在数据库中存在且有效
        if (existingToken == null)
        {
            // Token不在数据库中，可能是旧token重用攻击
            // 检查是否有其他有效的token（可能已经被轮换）
            var userTokensFilter = _refreshTokenFactory.CreateFilterBuilder()
                .Equal(rt => rt.UserId, userId)
                .Equal(rt => rt.IsRevoked, false)
                .Build();

            var userTokens = await _refreshTokenFactory.FindWithoutTenantFilterAsync(userTokensFilter);
            if (userTokens.Any())
            {
                // 检测到旧token重用，撤销该用户所有token（安全措施）
                var revokeFilter = _refreshTokenFactory.CreateFilterBuilder()
                    .Equal(rt => rt.UserId, userId)
                    .Build();

                var revokeUpdate = _refreshTokenFactory.CreateUpdateBuilder()
                    .Set(rt => rt.IsRevoked, true)
                    .Set(rt => rt.RevokedAt, DateTime.UtcNow)
                    .Set(rt => rt.RevokedReason, "检测到旧token重用攻击")
                    .Build();

                await _refreshTokenFactory.UpdateManyAsync(revokeFilter, revokeUpdate);

                _logger.LogWarning("检测到用户 {UserId} 的旧token重用攻击，已撤销所有token", userId);
            }

            return ApiResponse<RefreshTokenResult>.ErrorResult(
                "REFRESH_TOKEN_REVOKED",
                "刷新token无效或已被撤销"
            );
        }

        // 检查token是否已过期
        if (existingToken.ExpiresAt < DateTime.UtcNow)
        {
            // 标记为已撤销
            var expireUpdate = _refreshTokenFactory.CreateUpdateBuilder()
                .Set(rt => rt.IsRevoked, true)
                .Set(rt => rt.RevokedAt, DateTime.UtcNow)
                .Set(rt => rt.RevokedReason, "Token已过期")
                .Build();

            await _refreshTokenFactory.FindOneAndUpdateAsync(refreshTokenFilter, expireUpdate);

            return ApiResponse<RefreshTokenResult>.ErrorResult(
                "REFRESH_TOKEN_EXPIRED",
                "刷新token已过期"
            );
        }

        // 从数据库获取用户信息
        var users = await _userFactory.FindAsync(_userFactory.CreateFilterBuilder().Equal(u => u.Id, userId).Equal(u => u.IsActive, true).Build());
        var user = users.FirstOrDefault();
        if (user == null)
        {
            return ApiResponse<RefreshTokenResult>.ErrorResult(
                "USER_NOT_FOUND",
                "用户不存在或已被禁用"
            );
        }

        // 生成新的访问token和刷新token
        var newToken = _jwtService.GenerateToken(user);
        var newRefreshToken = _jwtService.GenerateRefreshToken(user);

        // 获取HTTP上下文信息
        var httpContext = _httpContextAccessor.HttpContext;
        var ipAddress = httpContext?.Connection?.RemoteIpAddress?.ToString();
        var userAgent = httpContext?.Request?.Headers["User-Agent"].ToString();

        // 撤销旧token（标记为已撤销）
        var oldTokenUpdate = _refreshTokenFactory.CreateUpdateBuilder()
            .Set(rt => rt.IsRevoked, true)
            .Set(rt => rt.RevokedAt, DateTime.UtcNow)
            .Set(rt => rt.RevokedReason, "Token轮换")
            .Build();

        await _refreshTokenFactory.FindOneAndUpdateAsync(refreshTokenFilter, oldTokenUpdate);

        // 保存新token到数据库
        var refreshTokenExpirationDays = int.Parse(_configuration["Jwt:RefreshTokenExpirationDays"] ?? "7");
        var newRefreshTokenEntity = new RefreshToken
        {
            UserId = userId,
            Token = newRefreshToken,
            PreviousToken = existingToken.Token, // 记录上一个token用于追踪
            ExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpirationDays),
            IpAddress = ipAddress,
            UserAgent = userAgent,
            LastUsedAt = DateTime.UtcNow,
            IsRevoked = false
        };
        await _refreshTokenFactory.CreateAsync(newRefreshTokenEntity);

        // 记录刷新token活动日志
        await _userService.LogUserActivityAsync(userId, "refresh_token", "刷新访问token", ipAddress, userAgent);

        // 从配置读取过期时间
        var expirationMinutes = int.Parse(_configuration["Jwt:ExpirationMinutes"] ?? "1440");

        var refreshTokenResult = new RefreshTokenResult
        {
            Status = "ok",
            Token = newToken,
            RefreshToken = newRefreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes) // 从配置读取访问token过期时间
        };

        return ApiResponse<RefreshTokenResult>.SuccessResult(refreshTokenResult);
    }

}
