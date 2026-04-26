using Microsoft.IdentityModel.Tokens;
using Platform.ApiService.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Platform.ApiService.Services;

/// <summary>
/// JWT 服务接口
/// </summary>
public interface IJwtService
{
    /// <summary>
    /// 生成访问 Token
    /// </summary>
    /// <param name="user">用户信息</param>
    /// <returns>JWT Token</returns>
    string GenerateToken(AppUser user);
    
    /// <summary>
    /// 生成刷新 Token
    /// </summary>
    /// <param name="user">用户信息</param>
    /// <returns>刷新 Token</returns>
    string GenerateRefreshToken(AppUser user);
    
    /// <summary>
    /// 验证访问 Token
    /// </summary>
    /// <param name="token">JWT Token</param>
    /// <returns>Claims 主体，如果无效则返回 null</returns>
    ClaimsPrincipal? ValidateToken(string token);
    
    /// <summary>
    /// 验证刷新 Token
    /// </summary>
    /// <param name="refreshToken">刷新 Token</param>
    /// <returns>Claims 主体，如果无效则返回 null</returns>
    ClaimsPrincipal? ValidateRefreshToken(string refreshToken);
    
    /// <summary>
    /// 从访问 Token 中获取用户ID
    /// </summary>
    /// <param name="token">JWT Token</param>
    /// <returns>用户ID，如果无效则返回 null</returns>
    string? GetUserIdFromToken(string token);
    
    /// <summary>
    /// 从刷新 Token 中获取用户ID
    /// </summary>
    /// <param name="refreshToken">刷新 Token</param>
    /// <returns>用户ID，如果无效则返回 null</returns>
    string? GetUserIdFromRefreshToken(string refreshToken);
    
    /// <summary>
    /// 从访问 Token 中获取企业ID
    /// </summary>
    /// <param name="token">JWT Token</param>
    /// <returns>企业ID，如果无效则返回 null</returns>
    string? GetCompanyIdFromToken(string token);
}

/// <summary>
/// JWT 服务实现
/// </summary>
public class JwtService : IJwtService
{
    private readonly string _secretKey;
    private readonly string _refreshTokenSecret;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _expirationMinutes;
    private readonly int _refreshTokenExpirationDays;

    /// <summary>
    /// 初始化 JWT 服务
    /// </summary>
    /// <param name="configuration">配置对象</param>
    public JwtService(IConfiguration configuration)
    {
        // 🔒 安全修复：移除默认密钥fallback，强制配置
        var secretKey = configuration["Jwt:SecretKey"];
        if (string.IsNullOrWhiteSpace(secretKey))
        {
            throw new InvalidOperationException(
                "JWT SecretKey must be configured. Set it via User Secrets (dotnet user-secrets set 'Jwt:SecretKey' 'your-key'), " +
                "Environment Variables (Jwt__SecretKey), or Azure Key Vault. " +
                "Never commit secrets to source control!");
        }
        _secretKey = secretKey;

        // 🔒 安全修复：使用独立的 Refresh Token 密钥
        var refreshTokenSecret = configuration["Jwt:RefreshTokenSecret"];
        if (string.IsNullOrWhiteSpace(refreshTokenSecret))
        {
            // 如果未配置，使用 SecretKey 作为后备（向后兼容，但不推荐）
            refreshTokenSecret = secretKey;
        }
        _refreshTokenSecret = refreshTokenSecret;

        _issuer = configuration["Jwt:Issuer"] ?? "Platform.ApiService";
        _audience = configuration["Jwt:Audience"] ?? "Platform.Web";
        _expirationMinutes = int.Parse(configuration["Jwt:ExpirationMinutes"] ?? "1440");
        _refreshTokenExpirationDays = int.Parse(configuration["Jwt:RefreshTokenExpirationDays"] ?? "7");
    }

    /// <summary>
    /// 生成访问 Token
    /// </summary>
    /// <param name="user">用户信息</param>
    /// <returns>JWT Token</returns>
    public string GenerateToken(AppUser user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_secretKey);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id ?? string.Empty),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new("userId", user.Id ?? string.Empty),
            new("username", user.Username),
            new("companyId", user.CurrentCompanyId ?? string.Empty)
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(_expirationMinutes),
            Issuer = _issuer,
            Audience = _audience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    /// <summary>
    /// 验证访问 Token
    /// </summary>
    /// <param name="token">JWT Token</param>
    /// <returns>Claims 主体，如果无效则返回 null</returns>
    public ClaimsPrincipal? ValidateToken(string token)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var validationParameters = CreateTokenValidationParameters();

            var principal = tokenHandler.ValidateToken(token, validationParameters, out _);
            return principal;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// 生成刷新 Token
    /// </summary>
    /// <param name="user">用户信息</param>
    /// <returns>刷新 Token</returns>
    public string GenerateRefreshToken(AppUser user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_refreshTokenSecret);

        var claims = new List<Claim>
        {
            new("type", "refresh"),
            new("userId", user.Id ?? string.Empty),
            new("username", user.Username),
            // ⚠️ 已移除：不再在 RefreshToken 中包含 companyId
            // 企业ID应从数据库获取，而非 JWT token
            new("iat", DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddDays(_refreshTokenExpirationDays),
            Issuer = _issuer,
            Audience = _audience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    /// <summary>
    /// 验证刷新 Token
    /// </summary>
    /// <param name="refreshToken">刷新 Token</param>
    /// <returns>Claims 主体，如果无效则返回 null</returns>
    public ClaimsPrincipal? ValidateRefreshToken(string refreshToken)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var validationParameters = CreateRefreshTokenValidationParameters();

            var principal = tokenHandler.ValidateToken(refreshToken, validationParameters, out _);
            
            // 验证是否为刷新token
            var tokenType = principal.FindFirst("type")?.Value;
            if (tokenType != "refresh")
            {
                return null;
            }

            return principal;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// 从访问 Token 中获取用户ID
    /// </summary>
    /// <param name="token">JWT Token</param>
    /// <returns>用户ID，如果无效则返回 null</returns>
    public string? GetUserIdFromToken(string token)
    {
        var principal = ValidateToken(token);
        return JwtHelper.GetUserId(principal);
    }

    /// <summary>
    /// 从刷新 Token 中获取用户ID
    /// </summary>
    /// <param name="refreshToken">刷新 Token</param>
    /// <returns>用户ID，如果无效则返回 null</returns>
    public string? GetUserIdFromRefreshToken(string refreshToken)
    {
        var principal = ValidateRefreshToken(refreshToken);
        return JwtHelper.GetUserId(principal);
    }

    /// <summary>
    /// 创建 Token 验证参数（统一配置，避免重复代码）
    /// </summary>
    private TokenValidationParameters CreateTokenValidationParameters()
    {
        var key = Encoding.ASCII.GetBytes(_secretKey);
        return new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = true,
            ValidIssuer = _issuer,
            ValidateAudience = true,
            ValidAudience = _audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    }

    /// <summary>
    /// 创建 Refresh Token 验证参数（使用独立的密钥）
    /// </summary>
    private TokenValidationParameters CreateRefreshTokenValidationParameters()
    {
        var key = Encoding.ASCII.GetBytes(_refreshTokenSecret);
        return new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = true,
            ValidIssuer = _issuer,
            ValidateAudience = true,
            ValidAudience = _audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    }

    /// <summary>
    /// 从访问 Token 中获取企业ID
    /// </summary>
    /// <param name="token">JWT Token</param>
    /// <returns>企业ID，如果无效则返回 null</returns>
    public string? GetCompanyIdFromToken(string token)
    {
        var principal = ValidateToken(token);
        return JwtHelper.GetCompanyId(principal);
    }
}

/// <summary>
/// JWT Claims 解析辅助方法（静态）
/// </summary>
public static class JwtHelper
{
    /// <summary>
    /// 从 ClaimsPrincipal 获取企业ID
    /// </summary>
    public static string? GetCompanyId(ClaimsPrincipal? principal)
        => principal?.FindFirst("companyId")?.Value;

    /// <summary>
    /// 从 ClaimsPrincipal 获取用户ID
    /// </summary>
    public static string? GetUserId(ClaimsPrincipal? principal)
        => principal?.FindFirst("userId")?.Value;
}