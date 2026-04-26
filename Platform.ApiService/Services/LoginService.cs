using Microsoft.EntityFrameworkCore;
using Platform.ServiceDefaults.Models;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using User = Platform.ApiService.Models.AppUser;

namespace Platform.ApiService.Services;

public class LoginService : ILoginService
{
    private readonly DbContext _context;
    private readonly IJwtService _jwtService;
    private readonly IUserService _userService;
    private readonly ILogger<LoginService> _logger;
    private readonly IConfiguration _configuration;
    private readonly IPasswordEncryptionService _encryptionService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IUniquenessChecker _uniquenessChecker;
    private readonly IFieldValidationService _validationService;

    public LoginService(
        DbContext context,
        IJwtService jwtService,
        IUserService userService,
        ILogger<LoginService> logger,
        IConfiguration configuration,
        IPasswordEncryptionService encryptionService,
        IPasswordHasher passwordHasher,
        IUniquenessChecker uniquenessChecker,
        IFieldValidationService validationService)
    {
        _context = context;
        _jwtService = jwtService;
        _userService = userService;
        _logger = logger;
        _configuration = configuration;
        _encryptionService = encryptionService;
        _passwordHasher = passwordHasher;
        _uniquenessChecker = uniquenessChecker;
        _validationService = validationService;
    }

    public async Task<LoginResult> LoginAsync(LoginRequest request, string? ipAddress = null, string? userAgent = null)
    {
        var user = await _context.Set<AppUser>().FirstOrDefaultAsync(u => u.Username == request.Username && u.IsActive == true);

if (user == null)
        {
            throw new ArgumentException(ErrorCode.InvalidCredentials);
        }

        var rawPassword = _encryptionService.TryDecryptPassword(request.Password ?? string.Empty);

        if (!_passwordHasher.VerifyPassword(rawPassword, user.PasswordHash))
        {
            throw new ArgumentException(ErrorCode.InvalidCredentials);
        }

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
                    throw new ArgumentException(ErrorCode.CompanyInactive);
                }

                if (company.ExpiresAt.HasValue && company.ExpiresAt.Value < DateTime.UtcNow)
                {
                    throw new ArgumentException(ErrorCode.CompanyExpired);
                }
            }
        }

        user.LastLoginAt = DateTime.UtcNow;
        if (shouldClearInvalidCompanyId)
        {
            user.CurrentCompanyId = null;
        }
        await _context.SaveChangesAsync();

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

        var loginResult = new LoginResult
        {
            Status = "ok",
            Type = request.Type,
            CurrentAuthority = "user",
            Token = token,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expirationMinutes)
        };

        return loginResult;
    }

    public async Task<bool> LogoutAsync(string userId, string? ipAddress = null, string? userAgent = null)
    {
        if (!string.IsNullOrEmpty(userId))
        {
            await _userService.LogUserActivityAsync(userId, "logout", "用户登出", ipAddress, userAgent);
        }
        return true;
    }

    public async Task<RefreshTokenResult> RefreshTokenAsync(RefreshTokenRequest request, string? ipAddress = null, string? userAgent = null)
    {
        _logger.LogInformation("[RefreshToken] 开始刷新 token，用户传入的 refreshToken 前10位: {TokenPrefix}", 
            request.RefreshToken?.Length > 10 ? request.RefreshToken[..10] : request.RefreshToken);

        if (string.IsNullOrWhiteSpace(request.RefreshToken))
            throw new ArgumentException("刷新token不能为空");

        var principal = _jwtService.ValidateRefreshToken(request.RefreshToken);
        if (principal == null)
        {
            _logger.LogWarning("[RefreshToken] JWT 验证失败，用户传入的 refreshToken: {TokenPrefix}", 
                request.RefreshToken?.Length > 10 ? request.RefreshToken[..10] : request.RefreshToken);
            throw new ArgumentException("无效的刷新token");
        }

        var userId = _jwtService.GetUserIdFromRefreshToken(request.RefreshToken);
        _logger.LogInformation("[RefreshToken] 从 refreshToken 解析出 userId: {UserId}", userId);
        if (string.IsNullOrEmpty(userId))
            throw new ArgumentException("无法从刷新token中获取用户信息");

        System.Linq.Expressions.Expression<Func<RefreshToken, bool>> baseFilter = rt => rt.Token == request.RefreshToken && rt.UserId == userId && rt.IsRevoked == false;
        var existingToken = await _context.Set<RefreshToken>().Where(baseFilter).FirstOrDefaultAsync();
        _logger.LogInformation("[RefreshToken] 数据库查询结果: {Found}, Token: {TokenPrefix}, IsRevoked: {IsRevoked}", 
            existingToken != null, 
            existingToken?.Token?.Length > 10 ? existingToken?.Token?[..10] : existingToken?.Token,
            existingToken?.IsRevoked);
        
        if (existingToken == null)
        {
            _logger.LogWarning("[RefreshToken] 数据库中未找到有效 token，检查是否有旧 token");

            var userTokens = await _context.Set<RefreshToken>().Where(rt => rt.UserId == userId && rt.IsRevoked == false).ToListAsync();
            _logger.LogWarning("[RefreshToken] 用户 {UserId} 当前有效的 token 数量: {Count}", userId, userTokens.Count);
            
            foreach (var token in userTokens)
            {
                _logger.LogWarning("[RefreshToken] 旧 token: Token={TokenPrefix}, ExpiresAt={ExpiresAt}, IsRevoked={IsRevoked}", 
                    token.Token?.Length > 10 ? token.Token?[..10] : token.Token,
                    token.ExpiresAt,
                    token.IsRevoked);
            }

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
        {
            _logger.LogWarning("[RefreshToken] 用户不存在或已被禁用，userId: {UserId}", userId);
            throw new ArgumentException("用户不存在或已被禁用");
        }
        _logger.LogInformation("[RefreshToken] 找到用户: {Username}, 当前企业: {CompanyId}", user.Username, user.CurrentCompanyId);

        if (!string.IsNullOrEmpty(request.CompanyId))
        {
            user.CurrentCompanyId = request.CompanyId;
        }
        var newToken = _jwtService.GenerateToken(user);
        var newRefreshToken = _jwtService.GenerateRefreshToken(user);

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

        _logger.LogInformation("[RefreshToken] Token 刷新成功! 新 token 前10位: {TokenPrefix}, 新 refreshToken 前10位: {RefreshTokenPrefix}, 过期时间: {ExpiresAt}", 
            newToken.Length > 10 ? newToken[..10] : newToken,
            newRefreshToken.Length > 10 ? newRefreshToken[..10] : newRefreshToken,
            refreshTokenResult.ExpiresAt);

        return refreshTokenResult;
    }
}
