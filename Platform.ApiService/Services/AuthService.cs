using User = Platform.ApiService.Models.AppUser;
using MongoDB.Driver;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using System.Security.Claims;

namespace Platform.ApiService.Services;

public class AuthService : BaseService, IAuthService
{
    private readonly IMongoDatabase _database;
    private readonly IMongoCollection<User> _users;
    private readonly IJwtService _jwtService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IUserService _userService;
    private readonly ILogger<AuthService> _logger;
    private readonly IUniquenessChecker _uniquenessChecker;
    private readonly IFieldValidationService _validationService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IPasswordPolicyService _passwordPolicyService;

    public AuthService(
        IMongoDatabase database,
        IJwtService jwtService,
        IHttpContextAccessor httpContextAccessor,
        ITenantContext tenantContext,
        IUserService userService,
        ILogger<AuthService> logger,
        IUniquenessChecker uniquenessChecker,
        IFieldValidationService validationService,
        IPasswordHasher passwordHasher,
        IPasswordPolicyService passwordPolicyService)
        : base(database, httpContextAccessor, tenantContext, logger)
    {
        _database = database;
        _users = database.GetCollection<User>("users");
        _jwtService = jwtService;
        _httpContextAccessor = httpContextAccessor;
        _userService = userService;
        _logger = logger;
        _uniquenessChecker = uniquenessChecker;
        _validationService = validationService;
        _passwordHasher = passwordHasher;
        _passwordPolicyService = passwordPolicyService;
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
        var user = await _users.Find(u => u.Id == userId).FirstOrDefaultAsync();
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
            var userCompanies = _database.GetCollection<UserCompany>("user_companies");
            var roles = _database.GetCollection<Role>("roles");
            
            var userCompanyFilter = Builders<UserCompany>.Filter.And(
                Builders<UserCompany>.Filter.Eq(uc => uc.UserId, user.Id),
                Builders<UserCompany>.Filter.Eq(uc => uc.CompanyId, user.CurrentCompanyId),
                Builders<UserCompany>.Filter.Eq(uc => uc.IsDeleted, false)
            );
            
            var userCompany = await userCompanies.Find(userCompanyFilter).FirstOrDefaultAsync();
            if (userCompany?.RoleIds != null && userCompany.RoleIds.Any())
            {
                var roleFilter = Builders<Role>.Filter.And(
                    Builders<Role>.Filter.In(r => r.Id, userCompany.RoleIds),
                    Builders<Role>.Filter.Eq(r => r.IsDeleted, false)
                );
                var userRoles = await roles.Find(roleFilter).ToListAsync();
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
        // v3.1: 用户名全局查找（不需要企业代码）
        var filter = Builders<User>.Filter.And(
            Builders<User>.Filter.Eq(u => u.Username, request.Username),
            Builders<User>.Filter.Eq(u => u.IsActive, true),
            MongoFilterExtensions.NotDeleted<User>()
        );
        var user = await _users.Find(filter).FirstOrDefaultAsync();
        
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
            var companies = _database.GetCollection<Company>("companies");
            var company = await companies.Find(c => c.Id == user.CurrentCompanyId && c.IsDeleted == false)
                .FirstOrDefaultAsync();
            
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
        var update = Builders<User>.Update.Set(u => u.LastLoginAt, DateTime.UtcNow);
        await _users.UpdateOneAsync(u => u.Id == user.Id, update);

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
    /// v3.1: 用户注册（自动创建个人企业）
    /// </summary>
    public async Task<ApiResponse<User>> RegisterAsync(RegisterRequest request)
    {
        try
        {
            // 1. 验证输入
            _validationService.ValidateUsername(request.Username);
            _passwordPolicyService.ValidatePassword(request.Password);  // ✅ 使用强密码策略
            _validationService.ValidateEmail(request.Email);
            
            // 2. 检查用户名全局唯一
            await _uniquenessChecker.EnsureUsernameUniqueAsync(request.Username);
            if (!string.IsNullOrEmpty(request.Email))
            {
                await _uniquenessChecker.EnsureEmailUniqueAsync(request.Email);
            }
            
            // 3. 创建用户
            var user = new User
            {
                Username = request.Username.Trim(),
                PasswordHash = _passwordHasher.HashPassword(request.Password),
                Email = string.IsNullOrEmpty(request.Email) ? null : request.Email.Trim(),
                IsActive = true,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            
            await _users.InsertOneAsync(user);
            _logger.LogInformation("用户注册成功: {Username} ({UserId})", user.Username, user.Id);
            
            // 4. 创建个人企业
            var personalCompany = await CreatePersonalCompanyAsync(user);
            
            // 5. 设置用户的企业信息
            var update = Builders<User>.Update
                .Set(u => u.CurrentCompanyId, personalCompany.Id)
                .Set(u => u.PersonalCompanyId, personalCompany.Id)
                .Set(u => u.CompanyId, personalCompany.Id) // ✅ 修复：同时设置CompanyId保持一致性
                .Set(u => u.UpdatedAt, DateTime.UtcNow);
            
            await _users.UpdateOneAsync(u => u.Id == user.Id, update);
            
            // 6. 更新用户对象
            user.CurrentCompanyId = personalCompany.Id;
            user.PersonalCompanyId = personalCompany.Id;
            user.CompanyId = personalCompany.Id!; // ✅ 修复：同时设置CompanyId
            
            // 清除密码哈希
            user.PasswordHash = string.Empty;
            
            _logger.LogInformation("用户 {Username} 注册完成，个人企业: {CompanyName}", 
                user.Username, personalCompany.Name);
            
            return ApiResponse<User>.SuccessResult(user, "注册成功！已为您创建个人企业。");
        }
        catch (ArgumentException ex)
        {
            return ApiResponse<User>.ValidationErrorResult(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            // 唯一性检查失败
            var errorCode = ex.Message.Contains("用户名") ? "USER_EXISTS" : "EMAIL_EXISTS";
            return ApiResponse<User>.ErrorResult(errorCode, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "用户注册失败: {Username}", request.Username);
            
            // ✅ 生产环境隐藏详细错误信息
            var errorMessage = "注册失败，请稍后重试或联系管理员";
            
            // 仅在开发环境显示详细错误
            #if DEBUG
            errorMessage = $"注册失败: {ex.Message}";
            #endif
            
            return ApiResponse<User>.ErrorResult("SERVER_ERROR", errorMessage);
        }
    }
    
    /// <summary>
    /// v3.1: 创建个人企业（用户注册时自动调用）
    /// 注意：MongoDB单机模式不支持事务，使用错误回滚机制
    /// </summary>
    private async Task<Company> CreatePersonalCompanyAsync(User user)
    {
        var companies = _database.GetCollection<Company>("companies");
        var roles = _database.GetCollection<Role>("roles");
        var menus = _database.GetCollection<Menu>("menus");
        var userCompanies = _database.GetCollection<UserCompany>("user_companies");
        
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
            
            await companies.InsertOneAsync(company);
            _logger.LogInformation("创建个人企业: {CompanyName} ({CompanyCode})", company.Name, company.Code);
            
            // 2. 获取所有全局菜单ID（菜单是全局资源，所有企业共享）
            var allMenus = await menus.Find(m => m.IsEnabled && !m.IsDeleted).ToListAsync();
            var allMenuIds = allMenus.Select(m => m.Id!).ToList();
            _logger.LogInformation("获取 {Count} 个全局菜单", allMenuIds.Count);
            
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
            
            await roles.InsertOneAsync(adminRole);
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
            
            await userCompanies.InsertOneAsync(userCompany);
            
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
                    await userCompanies.DeleteOneAsync(uc => uc.UserId == user.Id && uc.CompanyId == company.Id);
                    _logger.LogInformation("已清理用户-企业关联: UserId={UserId}, CompanyId={CompanyId}", user.Id, company.Id);
                }
                
                // 2. 删除角色
                if (adminRole?.Id != null)
                {
                    await roles.DeleteOneAsync(r => r.Id == adminRole.Id);
                    _logger.LogInformation("已清理角色: {RoleId}", adminRole.Id);
                }
                
                // 3. 删除企业
                if (company?.Id != null)
                {
                    await companies.DeleteOneAsync(c => c.Id == company.Id);
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

            // ✅ 使用强密码策略验证新密码
            try
            {
                _passwordPolicyService.ValidatePassword(request.NewPassword);
            }
            catch (ArgumentException ex)
            {
                return ApiResponse<bool>.ValidationErrorResult(ex.Message);
            }

            // 验证新密码不能与当前密码相同
            if (request.CurrentPassword == request.NewPassword)
            {
                return ApiResponse<bool>.ValidationErrorResult("新密码不能与当前密码相同");
            }

            // 从数据库获取用户信息
            var user = await _users.Find(u => u.Id == userId && u.IsActive).FirstOrDefaultAsync();
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
            var update = Builders<User>.Update
                .Set(u => u.PasswordHash, newPasswordHash)
                .Set(u => u.UpdatedAt, DateTime.UtcNow);

            var result = await _users.UpdateOneAsync(u => u.Id == userId, update);

            if (result.ModifiedCount > 0)
            {
                // 记录修改密码活动日志
                var currentHttpContext = _httpContextAccessor.HttpContext;
                var ipAddress = currentHttpContext?.Connection?.RemoteIpAddress?.ToString();
                var userAgent = currentHttpContext?.Request?.Headers["User-Agent"].ToString();
                await _userService.LogUserActivityAsync(userId, "change_password", "修改密码", ipAddress, userAgent);

                return ApiResponse<bool>.SuccessResult(true);
            }
            else
            {
                return ApiResponse<bool>.ErrorResult("UPDATE_FAILED", "密码更新失败");
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
            var user = await _users.Find(u => u.Id == userId && u.IsActive).FirstOrDefaultAsync();
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
