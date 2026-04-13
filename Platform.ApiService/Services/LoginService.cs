using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Constants;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using User = Platform.ApiService.Models.AppUser;

namespace Platform.ApiService.Services;

public class LoginService : ILoginService
{
    private readonly DbContext _context;
    private readonly IJwtService _jwtService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IUserService _userService;
    private readonly ILogger<LoginService> _logger;
    private readonly IImageCaptchaService _imageCaptchaService;
    private readonly IConfiguration _configuration;
    private readonly IPasswordEncryptionService _encryptionService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IUniquenessChecker _uniquenessChecker;
    private readonly IFieldValidationService _validationService;

    public LoginService(
        DbContext context,
        IJwtService jwtService,
        IHttpContextAccessor httpContextAccessor,
        IUserService userService,
        ILogger<LoginService> logger,
        IImageCaptchaService imageCaptchaService,
        IConfiguration configuration,
        IPasswordEncryptionService encryptionService,
        IPasswordHasher passwordHasher,
        IUniquenessChecker uniquenessChecker,
        IFieldValidationService validationService)
    {
        _context = context;
        _jwtService = jwtService;
        _httpContextAccessor = httpContextAccessor;
        _userService = userService;
        _logger = logger;
        _imageCaptchaService = imageCaptchaService;
        _configuration = configuration;
        _encryptionService = encryptionService;
        _passwordHasher = passwordHasher;
        _uniquenessChecker = uniquenessChecker;
        _validationService = validationService;
    }

    private async Task<int> GetFailureCountAsync(string clientId, string type)
    {
        var record = await _context.Set<LoginFailureRecord>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r =>
                r.ClientId == clientId &&
                r.Type == type &&
                r.ExpiresAt > DateTime.UtcNow);
        return record?.FailureCount ?? 0;
    }

    private async Task RecordFailureAsync(string clientId, string type)
    {
        var existingRecord = await _context.Set<LoginFailureRecord>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r =>
                r.ClientId == clientId &&
                r.Type == type);

        if (existingRecord != null)
        {
            existingRecord.FailureCount++;
            existingRecord.LastFailureAt = DateTime.UtcNow;
            existingRecord.ExpiresAt = DateTime.UtcNow.AddMinutes(AuthConstants.LoginFailureExpiresMinutes);
        }
        else
        {
            var newRecord = new LoginFailureRecord
            {
                ClientId = clientId,
                Type = type,
                FailureCount = 1,
                LastFailureAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(AuthConstants.LoginFailureExpiresMinutes)
            };
            await _context.Set<LoginFailureRecord>().AddAsync(newRecord);
        }

        await _context.SaveChangesAsync();
    }

    private async Task ClearFailureAsync(string clientId, string type)
    {
        var record = await _context.Set<LoginFailureRecord>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(r =>
                r.ClientId == clientId &&
                r.Type == type &&
                r.IsDeleted != true);
        if (record != null)
        {
            _context.Set<LoginFailureRecord>().Remove(record);
            await _context.SaveChangesAsync();
        }
    }

    private string GetClientIdentifier(string? username = null)
    {
        var httpContext = _httpContextAccessor.HttpContext;
        return httpContext?.Connection?.RemoteIpAddress?.ToString() ?? "unknown";
    }

    public async Task<LoginData> LoginAsync(LoginRequest request)
    {
        var clientId = GetClientIdentifier(request.Username);
        var failureCount = await GetFailureCountAsync(clientId, "login");
        var requiresCaptcha = failureCount >= 1;

        if (requiresCaptcha || !string.IsNullOrEmpty(request.CaptchaId))
        {
            if (string.IsNullOrEmpty(request.CaptchaId) || string.IsNullOrEmpty(request.CaptchaAnswer))
            {
                throw new ArgumentException("需要验证码");
            }

            var captchaValid = await _imageCaptchaService.ValidateCaptchaAsync(request.CaptchaId, request.CaptchaAnswer, "login");
            if (!captchaValid)
            {
                await RecordFailureAsync(clientId, "login");
                throw new ArgumentException("验证码无效");
            }
        }

        var user = await _context.Set<AppUser>().FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive == true);

        if (user == null)
        {
            await RecordFailureAsync(clientId, "login");
            throw new ArgumentException("用户名或密码错误");
        }

        var rawPassword = _encryptionService.TryDecryptPassword(request.Password ?? string.Empty);

        if (!_passwordHasher.VerifyPassword(rawPassword, user.PasswordHash))
        {
            await RecordFailureAsync(clientId, "login");
            throw new ArgumentException("用户名或密码错误");
        }

        await ClearFailureAsync(clientId, "login");

        bool shouldClearInvalidCompanyId = false;
        if (!string.IsNullOrEmpty(user.CurrentCompanyId))
        {
            var company = await _context.Set<Company>().FirstOrDefaultAsync(c => c.Id == user.CurrentCompanyId);

            if (company == null)
            {
                _logger.LogWarning("LoginAsync: 用户 {UserId} 的 CurrentCompanyId 为 '{CompanyId}'，但在数据库中未找到。将在后续步骤中清理。", user.Id, user.CurrentCompanyId);
                shouldClearInvalidCompanyId = true;
            }
            else
            {
                if (!company.IsActive)
                {
                    throw new ArgumentException(ErrorMessages.CompanyInactive);
                }

                if (company.ExpiresAt.HasValue && company.ExpiresAt.Value < DateTime.UtcNow)
                {
                    throw new ArgumentException(ErrorMessages.CompanyExpired);
                }
            }
        }

        user.LastLoginAt = DateTime.UtcNow;
        if (shouldClearInvalidCompanyId)
        {
            user.CurrentCompanyId = null;
        }
        await _context.SaveChangesAsync();

        var httpContext = _httpContextAccessor.HttpContext;
        var ipAddress = httpContext?.Connection?.RemoteIpAddress?.ToString();
        var userAgent = httpContext?.Request?.Headers["User-Agent"].ToString();
        await _userService.LogUserActivityAsync(user.Id!, "login", "用户登录", ipAddress, userAgent);

        var token = _jwtService.GenerateToken(user);
        var refreshToken = _jwtService.GenerateRefreshToken(user);

        var expirationMinutes = int.Parse(_configuration["Jwt:ExpirationMinutes"] ?? AuthConstants.DefaultTokenExpirationMinutes.ToString());
        var refreshTokenExpirationDays = int.Parse(_configuration["Jwt:RefreshTokenExpirationDays"] ?? AuthConstants.DefaultRefreshTokenExpirationDays.ToString());
        var refreshTokenEntity = new RefreshToken
        {
            UserId = user.Id!,
            Token = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(refreshTokenExpirationDays),
            IpAddress = ipAddress,
            UserAgent = userAgent,
            IsRevoked = false
        };
        await _context.Set<RefreshToken>().AddAsync(refreshTokenEntity);
        await _context.SaveChangesAsync();

        var loginData = new LoginData
        {
            Type = request.Type,
            CurrentAuthority = "user",
            Token = token,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes)
        };

        return loginData;
    }

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

    public async Task<RefreshTokenResult> RefreshTokenAsync(RefreshTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            throw new ArgumentException("刷新token不能为空");

        var principal = _jwtService.ValidateRefreshToken(request.RefreshToken);
        if (principal == null)
            throw new ArgumentException("无效的刷新token");

        var userId = _jwtService.GetUserIdFromRefreshToken(request.RefreshToken);
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("无法从刷新token中获取用户信息");

        System.Linq.Expressions.Expression<Func<RefreshToken, bool>> baseFilter = rt => rt.Token == request.RefreshToken && rt.UserId == userId && rt.IsRevoked == false;
        var existingToken = await _context.Set<RefreshToken>().Where(baseFilter).FirstOrDefaultAsync();
        if (existingToken == null)
        {
            var userTokens = await _context.Set<RefreshToken>().Where(rt => rt.UserId == userId && rt.IsRevoked == false).ToListAsync();
            if (userTokens.Any())
            {
                foreach (var rt in userTokens)
                {
                    rt.IsRevoked = true;
                    rt.RevokedAt = DateTime.UtcNow;
                    rt.RevokedReason = "检测到旧token重用攻击";
                }
                await _context.SaveChangesAsync();
                _logger.LogWarning("检测到用户 {UserId} 的旧token重用攻击，已撤销所有token", userId);
            }
            throw new ArgumentException("刷新token无效或已被撤销");
        }

        if (existingToken.ExpiresAt < DateTime.UtcNow)
        {
            existingToken.IsRevoked = true;
            existingToken.RevokedAt = DateTime.UtcNow;
            existingToken.RevokedReason = "Token已过期";
            await _context.SaveChangesAsync();
            throw new ArgumentException("刷新token已过期");
        }

        var user = await _context.Set<AppUser>().FirstOrDefaultAsync(u => u.Id == userId && u.IsActive == true);
        if (user == null)
            throw new ArgumentException("用户不存在或已被禁用");

        var newToken = _jwtService.GenerateToken(user);
        var newRefreshToken = _jwtService.GenerateRefreshToken(user);

        var httpContext = _httpContextAccessor.HttpContext;
        var ipAddress = httpContext?.Connection?.RemoteIpAddress?.ToString();
        var userAgent = httpContext?.Request?.Headers["User-Agent"].ToString();

        existingToken.IsRevoked = true;
        existingToken.RevokedAt = DateTime.UtcNow;
        existingToken.RevokedReason = "Token轮换";
        await _context.SaveChangesAsync();

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
        await _context.Set<RefreshToken>().AddAsync(newRefreshTokenEntity);
        await _context.SaveChangesAsync();

        await _userService.LogUserActivityAsync(userId, "refresh_token", "刷新访问token", ipAddress, userAgent);

        var expirationMinutes = int.Parse(_configuration["Jwt:ExpirationMinutes"] ?? "1440");
        var refreshTokenResult = new RefreshTokenResult
        {
            Status = "ok",
            Token = newToken,
            RefreshToken = newRefreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes)
        };

        return refreshTokenResult;
    }
}
