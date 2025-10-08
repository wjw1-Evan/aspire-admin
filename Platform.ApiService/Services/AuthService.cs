using MongoDB.Driver;
using Platform.ApiService.Models;
using System.Security.Claims;

namespace Platform.ApiService.Services;

public class AuthService
{
    private const string AdminRole = "admin";
    private const string UserRole = "user";
    private const string GuestRole = "guest";
    
    private readonly IMongoCollection<AppUser> _users;
    private readonly IJwtService _jwtService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly UserService _userService;

    public AuthService(IMongoDatabase database, IJwtService jwtService, IHttpContextAccessor httpContextAccessor, UserService userService)
    {
        _users = database.GetCollection<AppUser>("users");
        _jwtService = jwtService;
        _httpContextAccessor = httpContextAccessor;
        _userService = userService;
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
            return new CurrentUser
            {
                IsLogin = false
            };
        }

        // 从 Claims 获取用户 ID
        var userId = httpContext.User.FindFirst("userId")?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return new CurrentUser
            {
                IsLogin = false
            };
        }

        // 从数据库获取用户信息
        var user = await _users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        if (user == null || !user.IsActive)
        {
            return new CurrentUser
            {
                IsLogin = false
            };
        }

        // 构建用户信息
        return new CurrentUser
        {
            Id = user.Id,
            Name = user.Username,
            Avatar = "https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png",
            UserId = user.Id,
            Email = user.Email,
            Signature = "海纳百川，有容乃大",
            Title = user.Role == AdminRole ? "系统管理员" : "普通用户",
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
            Access = user.Role,
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
        try
        {
            // 从数据库查找用户
            var user = await _users.Find(u => u.Username == request.Username && u.IsActive).FirstOrDefaultAsync();
            
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
                CurrentAuthority = user.Role,
                Token = token,
                RefreshToken = refreshToken,
                ExpiresAt = DateTime.UtcNow.AddMinutes(60) // 访问token过期时间
            };

            return ApiResponse<LoginData>.SuccessResult(loginData);
        }
        catch (Exception ex)
        {
            return ApiResponse<LoginData>.ServerErrorResult(
                $"登录失败: {ex.Message}"
            );
        }
    }

    public async Task<bool> LogoutAsync()
    {
        try
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
        catch (Exception)
        {
            return false;
        }
    }

    public static async Task<string> GetCaptchaAsync()
    {
        // 模拟验证码生成
        await Task.Delay(2000); // 模拟延迟
        return "captcha-xxx";
    }

    public async Task<ApiResponse<AppUser>> RegisterAsync(RegisterRequest request)
    {
        try
        {
            // 验证输入参数
            if (string.IsNullOrWhiteSpace(request.Username))
            {
                return ApiResponse<AppUser>.ValidationErrorResult("用户名不能为空");
            }

            if (string.IsNullOrWhiteSpace(request.Password))
            {
                return ApiResponse<AppUser>.ValidationErrorResult("密码不能为空");
            }

            // 验证用户名长度和格式
            if (request.Username.Length < 3 || request.Username.Length > 20)
            {
                return ApiResponse<AppUser>.ValidationErrorResult("用户名长度必须在3-20个字符之间");
            }

            // 验证密码强度
            if (request.Password.Length < 6)
            {
                return ApiResponse<AppUser>.ValidationErrorResult("密码长度至少6个字符");
            }

            // 验证邮箱格式（如果提供了邮箱）
            if (!string.IsNullOrEmpty(request.Email))
            {
                var emailRegex = new System.Text.RegularExpressions.Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$");
                if (!emailRegex.IsMatch(request.Email))
                {
                    return ApiResponse<AppUser>.ValidationErrorResult("邮箱格式不正确");
                }
            }

            // 检查用户名是否已存在
            var existingUser = await _users.Find(u => u.Username == request.Username).FirstOrDefaultAsync();
            if (existingUser != null)
            {
                return ApiResponse<AppUser>.ErrorResult("USER_EXISTS", "用户名已存在");
            }

            // 检查邮箱是否已存在（如果提供了邮箱）
            if (!string.IsNullOrEmpty(request.Email))
            {
                var existingEmail = await _users.Find(u => u.Email == request.Email).FirstOrDefaultAsync();
                if (existingEmail != null)
                {
                    return ApiResponse<AppUser>.ErrorResult("EMAIL_EXISTS", "邮箱已被使用");
                }
            }

            // 创建新用户
            var newUser = new AppUser
            {
                Username = request.Username.Trim(),
                PasswordHash = HashPassword(request.Password),
                Email = string.IsNullOrEmpty(request.Email) ? null : request.Email.Trim(),
                Role = UserRole, // 默认为普通用户
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _users.InsertOneAsync(newUser);

            // 不返回密码哈希
            newUser.PasswordHash = string.Empty;

            return ApiResponse<AppUser>.SuccessResult(newUser);
        }
        catch (Exception ex)
        {
            return ApiResponse<AppUser>.ServerErrorResult($"注册失败: {ex.Message}");
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
        catch (Exception ex)
        {
            return ApiResponse<bool>.ServerErrorResult($"修改密码失败: {ex.Message}");
        }
    }

    public async Task<RefreshTokenResult> RefreshTokenAsync(RefreshTokenRequest request)
    {
        try
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
        catch (Exception ex)
        {
            return new RefreshTokenResult
            {
                Status = "error",
                ErrorMessage = $"刷新token失败: {ex.Message}"
            };
        }
    }

}
