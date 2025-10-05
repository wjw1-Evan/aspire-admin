using MongoDB.Driver;
using Platform.ApiService.Models;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace Platform.ApiService.Services;

public class AuthService
{
    private const string AdminRole = "admin";
    private const string UserRole = "user";
    private const string GuestRole = "guest";
    
    private readonly IMongoCollection<AppUser> _users;
    private readonly IJwtService _jwtService;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AuthService(IMongoDatabase database, IJwtService jwtService, IHttpContextAccessor httpContextAccessor)
    {
        _users = database.GetCollection<AppUser>("users");
        _jwtService = jwtService;
        _httpContextAccessor = httpContextAccessor;
    }

    private static string HashPassword(string password)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        return Convert.ToBase64String(hashedBytes);
    }

    private static bool VerifyPassword(string? password, string hashedPassword)
    {
        if (string.IsNullOrEmpty(password))
            return false;
            
        var hashedInput = HashPassword(password);
        return hashedInput == hashedPassword;
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

    public async Task<LoginResult> LoginAsync(LoginRequest request)
    {
        try
        {
            // 从数据库查找用户
            var user = await _users.Find(u => u.Username == request.Username && u.IsActive).FirstOrDefaultAsync();
            
            if (user == null)
            {
                return new LoginResult
                {
                    Status = "error",
                    Type = request.Type,
                    CurrentAuthority = GuestRole
                };
            }

            // 验证密码
            if (!VerifyPassword(request.Password, user.PasswordHash))
            {
                return new LoginResult
                {
                    Status = "error",
                    Type = request.Type,
                    CurrentAuthority = GuestRole
                };
            }

            // 更新最后登录时间
            var update = Builders<AppUser>.Update.Set(u => u.LastLoginAt, DateTime.UtcNow);
            await _users.UpdateOneAsync(u => u.Id == user.Id, update);

            // 生成 JWT token
            var token = _jwtService.GenerateToken(user);

            return new LoginResult
            {
                Status = "ok",
                Type = request.Type,
                CurrentAuthority = user.Role,
                Token = token
            };
        }
        catch (Exception)
        {
            return new LoginResult
            {
                Status = "error",
                Type = request.Type,
                CurrentAuthority = GuestRole
            };
        }
    }

    public static Task<bool> LogoutAsync()
    {
        // JWT 是无状态的，登出只需要客户端删除 token
        // 如果需要服务端登出，可以实现 token 黑名单机制
        return Task.FromResult(true);
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
                return new ApiResponse<AppUser>
                {
                    Success = false,
                    ErrorCode = "INVALID_USERNAME",
                    ErrorMessage = "用户名不能为空"
                };
            }

            if (string.IsNullOrWhiteSpace(request.Password))
            {
                return new ApiResponse<AppUser>
                {
                    Success = false,
                    ErrorCode = "INVALID_PASSWORD",
                    ErrorMessage = "密码不能为空"
                };
            }

            // 验证用户名长度和格式
            if (request.Username.Length < 3 || request.Username.Length > 20)
            {
                return new ApiResponse<AppUser>
                {
                    Success = false,
                    ErrorCode = "INVALID_USERNAME_LENGTH",
                    ErrorMessage = "用户名长度必须在3-20个字符之间"
                };
            }

            // 验证密码强度
            if (request.Password.Length < 6)
            {
                return new ApiResponse<AppUser>
                {
                    Success = false,
                    ErrorCode = "WEAK_PASSWORD",
                    ErrorMessage = "密码长度至少6个字符"
                };
            }

            // 验证邮箱格式（如果提供了邮箱）
            if (!string.IsNullOrEmpty(request.Email))
            {
                var emailRegex = new System.Text.RegularExpressions.Regex(@"^[^@\s]+@[^@\s]+\.[^@\s]+$");
                if (!emailRegex.IsMatch(request.Email))
                {
                    return new ApiResponse<AppUser>
                    {
                        Success = false,
                        ErrorCode = "INVALID_EMAIL",
                        ErrorMessage = "邮箱格式不正确"
                    };
                }
            }

            // 检查用户名是否已存在
            var existingUser = await _users.Find(u => u.Username == request.Username).FirstOrDefaultAsync();
            if (existingUser != null)
            {
                return new ApiResponse<AppUser>
                {
                    Success = false,
                    ErrorCode = "USER_EXISTS",
                    ErrorMessage = "用户名已存在"
                };
            }

            // 检查邮箱是否已存在（如果提供了邮箱）
            if (!string.IsNullOrEmpty(request.Email))
            {
                var existingEmail = await _users.Find(u => u.Email == request.Email).FirstOrDefaultAsync();
                if (existingEmail != null)
                {
                    return new ApiResponse<AppUser>
                    {
                        Success = false,
                        ErrorCode = "EMAIL_EXISTS",
                        ErrorMessage = "邮箱已被使用"
                    };
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

            return new ApiResponse<AppUser>
            {
                Success = true,
                Data = newUser
            };
        }
        catch (Exception ex)
        {
            return new ApiResponse<AppUser>
            {
                Success = false,
                ErrorCode = "REGISTER_ERROR",
                ErrorMessage = $"注册失败: {ex.Message}"
            };
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
                return new ApiResponse<bool>
                {
                    Success = false,
                    ErrorCode = "UNAUTHORIZED",
                    ErrorMessage = "用户未认证"
                };
            }

            // 从 Claims 获取用户 ID
            var userId = httpContext.User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    ErrorCode = "UNAUTHORIZED",
                    ErrorMessage = "用户ID不存在"
                };
            }

            // 验证输入参数
            if (string.IsNullOrWhiteSpace(request.CurrentPassword))
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    ErrorCode = "INVALID_CURRENT_PASSWORD",
                    ErrorMessage = "当前密码不能为空"
                };
            }

            if (string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    ErrorCode = "INVALID_NEW_PASSWORD",
                    ErrorMessage = "新密码不能为空"
                };
            }

            if (string.IsNullOrWhiteSpace(request.ConfirmPassword))
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    ErrorCode = "INVALID_CONFIRM_PASSWORD",
                    ErrorMessage = "确认密码不能为空"
                };
            }

            // 验证新密码和确认密码是否一致
            if (request.NewPassword != request.ConfirmPassword)
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    ErrorCode = "PASSWORD_MISMATCH",
                    ErrorMessage = "新密码和确认密码不一致"
                };
            }

            // 验证新密码强度
            if (request.NewPassword.Length < 6)
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    ErrorCode = "WEAK_PASSWORD",
                    ErrorMessage = "新密码长度至少6个字符"
                };
            }

            // 验证新密码不能与当前密码相同
            if (request.CurrentPassword == request.NewPassword)
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    ErrorCode = "SAME_PASSWORD",
                    ErrorMessage = "新密码不能与当前密码相同"
                };
            }

            // 从数据库获取用户信息
            var user = await _users.Find(u => u.Id == userId && u.IsActive).FirstOrDefaultAsync();
            if (user == null)
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    ErrorCode = "USER_NOT_FOUND",
                    ErrorMessage = "用户不存在或已被禁用"
                };
            }

            // 验证当前密码是否正确
            if (!VerifyPassword(request.CurrentPassword, user.PasswordHash))
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    ErrorCode = "INVALID_CURRENT_PASSWORD",
                    ErrorMessage = "当前密码不正确"
                };
            }

            // 更新密码
            var newPasswordHash = HashPassword(request.NewPassword);
            var update = Builders<AppUser>.Update
                .Set(u => u.PasswordHash, newPasswordHash)
                .Set(u => u.UpdatedAt, DateTime.UtcNow);

            var result = await _users.UpdateOneAsync(u => u.Id == userId, update);

            if (result.ModifiedCount > 0)
            {
                return new ApiResponse<bool>
                {
                    Success = true,
                    Data = true
                };
            }
            else
            {
                return new ApiResponse<bool>
                {
                    Success = false,
                    ErrorCode = "UPDATE_FAILED",
                    ErrorMessage = "密码更新失败"
                };
            }
        }
        catch (Exception ex)
        {
            return new ApiResponse<bool>
            {
                Success = false,
                ErrorCode = "CHANGE_PASSWORD_ERROR",
                ErrorMessage = $"修改密码失败: {ex.Message}"
            };
        }
    }

}
