using MongoDB.Driver;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using System.Security.Claims;

namespace Platform.ApiService.Services;

public class AuthService : IAuthService
{
    private readonly IMongoDatabase _database;
    private readonly IMongoCollection<AppUser> _users;
    private readonly IJwtService _jwtService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IUserService _userService;
    private readonly ILogger<AuthService> _logger;
    private readonly IUniquenessChecker _uniquenessChecker;
    private readonly IFieldValidationService _validationService;
    private readonly IPermissionService _permissionService;
    private readonly IPasswordHasher _passwordHasher;

    public AuthService(
        IMongoDatabase database, 
        IJwtService jwtService, 
        IHttpContextAccessor httpContextAccessor, 
        IUserService userService,
        ILogger<AuthService> logger,
        IUniquenessChecker uniquenessChecker,
        IFieldValidationService validationService,
        IPermissionService permissionService,
        IPasswordHasher passwordHasher)
    {
        _database = database;
        _users = database.GetCollection<AppUser>("users");
        _jwtService = jwtService;
        _httpContextAccessor = httpContextAccessor;
        _userService = userService;
        _logger = logger;
        _uniquenessChecker = uniquenessChecker;
        _validationService = validationService;
        _permissionService = permissionService;
        _passwordHasher = passwordHasher;
    }

    private static string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password);
    }

    private static bool VerifyPassword(string? password, string hashedPassword)
    {
        if (string.IsNullOrEmpty(password))
            return false;
            
        return BCrypt.Net.BCrypt.Verify(password, hashedPassword);
    }

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

        // 获取用户权限信息
        var userPermissions = await _permissionService.GetUserPermissionsAsync(user.Id!);
        
        // 构建统一的用户信息
        return new CurrentUser
        {
            Id = user.Id,
            Username = user.Username,
            DisplayName = user.Name,
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
            Roles = userPermissions.RoleNames,
            Permissions = userPermissions.AllPermissionCodes,
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
        var filter = Builders<AppUser>.Filter.And(
            Builders<AppUser>.Filter.Eq(u => u.Username, request.Username),
            Builders<AppUser>.Filter.Eq(u => u.IsActive, true),
            MongoFilterExtensions.NotDeleted<AppUser>()
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
        if (!VerifyPassword(request.Password, user.PasswordHash))
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
        var update = Builders<AppUser>.Update.Set(u => u.LastLoginAt, DateTime.UtcNow);
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
    public async Task<ApiResponse<AppUser>> RegisterAsync(RegisterRequest request)
    {
        try
        {
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
            
            // 3. 创建用户
            var user = new AppUser
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
            var update = Builders<AppUser>.Update
                .Set(u => u.CurrentCompanyId, personalCompany.Id)
                .Set(u => u.PersonalCompanyId, personalCompany.Id)
                .Set(u => u.UpdatedAt, DateTime.UtcNow);
            
            await _users.UpdateOneAsync(u => u.Id == user.Id, update);
            
            // 6. 更新用户对象
            user.CurrentCompanyId = personalCompany.Id;
            user.PersonalCompanyId = personalCompany.Id;
            
            // 清除密码哈希
            user.PasswordHash = string.Empty;
            
            _logger.LogInformation("用户 {Username} 注册完成，个人企业: {CompanyName}", 
                user.Username, personalCompany.Name);
            
            return ApiResponse<AppUser>.SuccessResult(user, "注册成功！已为您创建个人企业。");
        }
        catch (ArgumentException ex)
        {
            return ApiResponse<AppUser>.ValidationErrorResult(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            // 唯一性检查失败
            var errorCode = ex.Message.Contains("用户名") ? "USER_EXISTS" : "EMAIL_EXISTS";
            return ApiResponse<AppUser>.ErrorResult(errorCode, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "用户注册失败");
            return ApiResponse<AppUser>.ServerErrorResult($"注册失败: {ex.Message}");
        }
    }
    
    /// <summary>
    /// v3.1: 创建个人企业（用户注册时自动调用）
    /// 注意：MongoDB单机模式不支持事务，使用错误回滚机制
    /// </summary>
    private async Task<Company> CreatePersonalCompanyAsync(AppUser user)
    {
        var companies = _database.GetCollection<Company>("companies");
        var roles = _database.GetCollection<Role>("roles");
        var menus = _database.GetCollection<Menu>("menus");
        var permissions = _database.GetCollection<Permission>("permissions");
        var userCompanies = _database.GetCollection<UserCompany>("user_companies");
        
        Company? company = null;
        List<Permission>? permissionList = null;
        Role? adminRole = null;
        List<Menu>? defaultMenus = null;
        
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
            
            // 2. 创建默认权限
            var defaultPermissions = _permissionService.GetDefaultPermissions();
            permissionList = new List<Permission>();
            
            foreach (var perm in defaultPermissions)
            {
                var permission = new Permission
                {
                    ResourceName = perm.ResourceName,
                    ResourceTitle = perm.ResourceTitle,
                    Action = perm.Action,
                    ActionTitle = perm.ActionTitle,
                    Code = $"{perm.ResourceName}:{perm.Action}",
                    Description = perm.Description,
                    CompanyId = company.Id!,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                permissionList.Add(permission);
            }
            
            await permissions.InsertManyAsync(permissionList);
            _logger.LogInformation("创建 {Count} 个默认权限", permissionList.Count);
            
            // 3. 创建管理员角色
            adminRole = new Role
            {
                Name = "管理员",
                Description = "企业管理员，拥有所有权限",
                CompanyId = company.Id!,
                PermissionIds = permissionList.Select(p => p.Id!).ToList(),
                MenuIds = new List<string>(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            
            await roles.InsertOneAsync(adminRole);
            
            // 4. 创建默认菜单
            defaultMenus = CreateDefaultMenus(company.Id!);
            await menus.InsertManyAsync(defaultMenus);
            
            // 5. 更新角色的菜单权限
            var updateRole = Builders<Role>.Update.Set(r => r.MenuIds, defaultMenus.Select(m => m.Id!).ToList());
            await roles.UpdateOneAsync(r => r.Id == adminRole.Id, updateRole);
            
            _logger.LogInformation("创建 {Count} 个默认菜单", defaultMenus.Count);
            
            // 6. 创建用户-企业关联（用户是管理员）
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
                if (adminRole?.Id != null)
                {
                    await roles.DeleteOneAsync(r => r.Id == adminRole.Id);
                    _logger.LogInformation("已清理角色: {RoleId}", adminRole.Id);
                }
                
                if (defaultMenus != null && defaultMenus.Count > 0)
                {
                    var menuIds = defaultMenus.Select(m => m.Id!).ToList();
                    await menus.DeleteManyAsync(m => menuIds.Contains(m.Id!));
                    _logger.LogInformation("已清理菜单: {Count}个", defaultMenus.Count);
                }
                
                if (permissionList != null && permissionList.Count > 0)
                {
                    var permissionIds = permissionList.Select(p => p.Id!).ToList();
                    await permissions.DeleteManyAsync(p => permissionIds.Contains(p.Id!));
                    _logger.LogInformation("已清理权限: {Count}个", permissionList.Count);
                }
                
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
    
    /// <summary>
    /// 创建默认菜单
    /// </summary>
    private static List<Menu> CreateDefaultMenus(string companyId)
    {
        return new List<Menu>
        {
            new Menu
            {
                Name = "dashboard",
                Title = "仪表板",
                Path = "/dashboard",
                Component = "./dashboard",
                Icon = "DashboardOutlined",
                SortOrder = 1,
                IsEnabled = true,
                CompanyId = companyId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new Menu
            {
                Name = "user-management",
                Title = "用户管理",
                Path = "/user-management",
                Component = "./user-management",
                Icon = "UserOutlined",
                SortOrder = 2,
                IsEnabled = true,
                CompanyId = companyId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            },
            new Menu
            {
                Name = "system",
                Title = "系统设置",
                Path = "/system",
                Icon = "SettingOutlined",
                SortOrder = 10,
                IsEnabled = true,
                CompanyId = companyId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            }
        };
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
            var user = await _users.Find(u => u.Id == userId && u.IsActive).FirstOrDefaultAsync();
            if (user == null)
            {
                return ApiResponse<bool>.NotFoundResult("用户不存在或已被禁用");
            }

            // 验证当前密码是否正确
            if (!VerifyPassword(request.CurrentPassword, user.PasswordHash))
            {
                return ApiResponse<bool>.ErrorResult("INVALID_CURRENT_PASSWORD", "当前密码不正确");
            }

            // 更新密码
            var newPasswordHash = HashPassword(request.NewPassword);
            var update = Builders<AppUser>.Update
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
