using MongoDB.Driver;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using System.Security.Claims;

namespace Platform.ApiService.Services;

public class AuthService : IAuthService
{
    private readonly IMongoCollection<AppUser> _users;
    private readonly IJwtService _jwtService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IUserService _userService;
    private readonly ILogger<AuthService> _logger;
    private readonly IUniquenessChecker _uniquenessChecker;
    private readonly IFieldValidationService _validationService;

    public AuthService(
        IMongoDatabase database, 
        IJwtService jwtService, 
        IHttpContextAccessor httpContextAccessor, 
        IUserService userService,
        ILogger<AuthService> logger,
        IUniquenessChecker uniquenessChecker,
        IFieldValidationService validationService)
    {
        _users = database.GetCollection<AppUser>("users");
        _jwtService = jwtService;
        _httpContextAccessor = httpContextAccessor;
        _userService = userService;
        _logger = logger;
        _uniquenessChecker = uniquenessChecker;
        _validationService = validationService;
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

        // 构建用户信息
        // 注意：用户的权限基于 RoleIds，前端使用 access 字段进行权限检查
        // 这里暂时设置为 "user"，实际权限由角色系统决定
        return new CurrentUser
        {
            Id = user.Id,
            Name = user.Username,
            Avatar = "https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png",
            UserId = user.Id,
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
            Access = "user", // 默认 access，实际权限由角色和权限系统决定
            Geographic = new GeographicInfo
            {
                Province = new LocationInfo { Label = "浙江省", Key = "330000" },
                City = new LocationInfo { Label = "杭州市", Key = "330100" }
            },
            Address = "西湖区工专路 77 号",
            Phone = "0752-268888888",
            IsLogin = true,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }

    public async Task<ApiResponse<LoginData>> LoginAsync(LoginRequest request)
    {
        // 从数据库查找用户（排除已删除用户）
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


    public async Task<ApiResponse<AppUser>> RegisterAsync(RegisterRequest request)
    {
        // 使用通用验证服务（捕获异常转换为ApiResponse）
        try
        {
            _validationService.ValidateUsername(request.Username);
            _validationService.ValidatePassword(request.Password);
            _validationService.ValidateEmail(request.Email);
            
            // 使用唯一性检查服务
            await _uniquenessChecker.EnsureUsernameUniqueAsync(request.Username);
            if (!string.IsNullOrEmpty(request.Email))
            {
                await _uniquenessChecker.EnsureEmailUniqueAsync(request.Email);
            }
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

        // 创建新用户（无默认角色，需要管理员分配）
        var newUser = new AppUser
        {
            Username = request.Username.Trim(),
            PasswordHash = HashPassword(request.Password),
            Email = string.IsNullOrEmpty(request.Email) ? null : request.Email.Trim(),
            RoleIds = new List<string>(), // 空角色列表，需要管理员分配
            IsActive = true,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

            await _users.InsertOneAsync(newUser);

            // 不返回密码哈希
            newUser.PasswordHash = string.Empty;

            return ApiResponse<AppUser>.SuccessResult(newUser);
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
