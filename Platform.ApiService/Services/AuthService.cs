using User = Platform.ApiService.Models.AppUser;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using System.Security.Claims;

namespace Platform.ApiService.Services;

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
        IImageCaptchaService imageCaptchaService)
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
    }

    // 🔒 安全修复：移除静态密码哈希方法，统一使用注入的 IPasswordHasher
    // 这样可以集中管理密码哈希逻辑，便于测试和更换哈希算法

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
        if (!string.IsNullOrEmpty(user.CurrentCompanyId))
        {
            // 使用工厂查询 UserCompany 记录
            var userCompanyFilter = _userCompanyFactory.CreateFilterBuilder()
                .Equal(uc => uc.UserId, user.Id)
                .Equal(uc => uc.CompanyId, user.CurrentCompanyId)
                .Build();
            
            var userCompany = await _userCompanyFactory.FindAsync(userCompanyFilter);
            var firstUserCompany = userCompany.FirstOrDefault();
            if (firstUserCompany?.RoleIds != null && firstUserCompany.RoleIds.Any())
            {
                // 使用工厂查询角色信息
                var roleFilter = _roleFactory.CreateFilterBuilder()
                    .In(r => r.Id, firstUserCompany.RoleIds)
                    .Build();
                var userRoles = await _roleFactory.FindAsync(roleFilter);
                roleNames = userRoles.Select(r => r.Name).ToList();
            }
        }
        
        // 构建统一的用户信息
        return new CurrentUser
        {
            Id = user.Id,
            Username = user.Username,
            DisplayName = user.Name ?? user.Username,  // 如果 Name 为空，使用 Username
            Avatar = "https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png",
            Email = user.Email,
            Signature = "海纳百川，有容乃大",
            Title = "平台用户",
            Group = "平台管理团队",
            Tags = new List<UserTag>
            {
                new() { Key = "0", Label = "很有想法的" },
                new() { Key = "1", Label = "专注设计" },
                new() { Key = "2", Label = "技术达人" },
                new() { Key = "3", Label = "团队协作" },
                new() { Key = "4", Label = "创新思维" },
                new() { Key = "5", Label = "海纳百川" }
            },
            NotifyCount = 12,
            UnreadCount = 11,
            Country = "China",
            Roles = roleNames,
            Geographic = new GeographicInfo
            {
                Province = new LocationInfo { Label = "浙江省", Key = "330000" },
                City = new LocationInfo { Label = "杭州市", Key = "330100" }
            },
            Address = "西湖区工专路 77 号",
            Phone = "0752-268888888",
            IsLogin = true,
            CurrentCompanyId = user.CurrentCompanyId,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }

    public async Task<ApiResponse<LoginData>> LoginAsync(LoginRequest request)
    {
        // 验证图形验证码 - 必填项
        if (string.IsNullOrEmpty(request.CaptchaId) || string.IsNullOrEmpty(request.CaptchaAnswer))
        {
            return ApiResponse<LoginData>.ErrorResult(
                "CAPTCHA_REQUIRED",
                "图形验证码是必填项，请先获取验证码"
            );
        }

        var captchaValid = await _imageCaptchaService.ValidateCaptchaAsync(request.CaptchaId, request.CaptchaAnswer, "login");
        if (!captchaValid)
        {
            return ApiResponse<LoginData>.ErrorResult(
                "CAPTCHA_INVALID",
                "图形验证码错误，请重新输入"
            );
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
            return ApiResponse<LoginData>.ErrorResult(
                "LOGIN_FAILED", 
                "用户名或密码错误，请检查后重试"
            );
        }

        // 验证密码
        if (!_passwordHasher.VerifyPassword(request.Password ?? string.Empty, user.PasswordHash))
        {
            return ApiResponse<LoginData>.ErrorResult(
                "LOGIN_FAILED", 
                "用户名或密码错误，请检查后重试"
            );
        }

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

        var loginData = new LoginData
        {
            Type = request.Type,
            CurrentAuthority = "user", // 默认权限，实际权限由角色系统决定
            Token = token,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(60) // 访问token过期时间
        };

        return ApiResponse<LoginData>.SuccessResult(loginData);
    }

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
        // 验证图形验证码 - 必填项
        if (string.IsNullOrEmpty(request.CaptchaId) || string.IsNullOrEmpty(request.CaptchaAnswer))
        {
            return ApiResponse<User>.ErrorResult(
                "CAPTCHA_REQUIRED",
                "图形验证码是必填项，请先获取验证码"
            );
        }

        var captchaValid = await _imageCaptchaService.ValidateCaptchaAsync(request.CaptchaId, request.CaptchaAnswer, "register");
        if (!captchaValid)
        {
            return ApiResponse<User>.ErrorResult(
                "CAPTCHA_INVALID",
                "图形验证码错误，请重新输入"
            );
        }

        // 1. 验证输入
        _validationService.ValidateUsername(request.Username);
        _validationService.ValidatePassword(request.Password);
        _validationService.ValidateEmail(request.Email);
        
        // 2. 检查用户名全局唯一
        await _uniquenessChecker.EnsureUsernameUniqueAsync(request.Username);
        if (!string.IsNullOrEmpty(request.Email))
        {
            await _uniquenessChecker.EnsureEmailUniqueAsync(request.Email);
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
            
            return ApiResponse<User>.SuccessResult(user, "注册成功！已为您创建个人企业。");
        }
        catch (ArgumentException ex)
        {
            await RollbackUserRegistrationAsync(user, personalCompany, adminRole, userCompany);
            return ApiResponse<User>.ValidationErrorResult(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            await RollbackUserRegistrationAsync(user, personalCompany, adminRole, userCompany);
            // 唯一性检查失败
            var errorCode = ex.Message.Contains("用户名") ? "USER_EXISTS" : "EMAIL_EXISTS";
            return ApiResponse<User>.ErrorResult(errorCode, ex.Message);
        }
        catch (Exception ex)
        {
            await RollbackUserRegistrationAsync(user, personalCompany, adminRole, userCompany);
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

    public async Task<RefreshTokenResult> RefreshTokenAsync(RefreshTokenRequest request)
    {
        // 验证输入参数
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return new RefreshTokenResult
            {
                Status = "error",
                ErrorMessage = "刷新token不能为空"
            };
        }

            // 验证刷新token
            var principal = _jwtService.ValidateRefreshToken(request.RefreshToken);
            if (principal == null)
            {
                return new RefreshTokenResult
                {
                    Status = "error",
                    ErrorMessage = "无效的刷新token"
                };
            }

            // 从刷新token中获取用户ID
            var userId = _jwtService.GetUserIdFromRefreshToken(request.RefreshToken);
            if (string.IsNullOrEmpty(userId))
            {
                return new RefreshTokenResult
                {
                    Status = "error",
                    ErrorMessage = "无法从刷新token中获取用户信息"
                };
            }

            // 从数据库获取用户信息
            var users = await _userFactory.FindAsync(_userFactory.CreateFilterBuilder().Equal(u => u.Id, userId).Equal(u => u.IsActive, true).Build());
            var user = users.FirstOrDefault();
            if (user == null)
            {
                return new RefreshTokenResult
                {
                    Status = "error",
                    ErrorMessage = "用户不存在或已被禁用"
                };
            }

            // 生成新的访问token和刷新token
            var newToken = _jwtService.GenerateToken(user);
            var newRefreshToken = _jwtService.GenerateRefreshToken(user);

            // 记录刷新token活动日志
            var httpContext = _httpContextAccessor.HttpContext;
            var ipAddress = httpContext?.Connection?.RemoteIpAddress?.ToString();
            var userAgent = httpContext?.Request?.Headers["User-Agent"].ToString();
            await _userService.LogUserActivityAsync(userId, "refresh_token", "刷新访问token", ipAddress, userAgent);

            return new RefreshTokenResult
            {
                Status = "ok",
                Token = newToken,
                RefreshToken = newRefreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(60) // 访问token过期时间
            };
    }

}
