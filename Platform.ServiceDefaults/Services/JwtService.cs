using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Platform.ServiceDefaults.Services;

public interface IJwtService
{
    string GenerateToken(string userId, string companyId);

    string GenerateRefreshToken(string userId, string companyId);

    ClaimsPrincipal? ValidateToken(string token);

    ClaimsPrincipal? ValidateRefreshToken(string refreshToken);

    string? GetUserIdFromToken(string token);

    string? GetUserIdFromRefreshToken(string refreshToken);

    string? GetCompanyIdFromToken(string token);
}

public class JwtService : IJwtService
{
    private readonly string _secretKey;
    private readonly string _refreshTokenSecret;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly int _expirationMinutes;
    private readonly int _refreshTokenExpirationDays;

    public JwtService(IConfiguration configuration)
    {
        var secretKey = configuration["Jwt:SecretKey"];
        if (string.IsNullOrWhiteSpace(secretKey))
        {
            throw new InvalidOperationException(
                "JWT SecretKey must be configured. Set it via User Secrets (dotnet user-secrets set 'Jwt:SecretKey' 'your-key'), " +
                "Environment Variables (Jwt__SecretKey), or Azure Key Vault. " +
                "Never commit secrets to source control!");
        }
        _secretKey = secretKey;

        var refreshTokenSecret = configuration["Jwt:RefreshTokenSecret"];
        if (string.IsNullOrWhiteSpace(refreshTokenSecret))
        {
            refreshTokenSecret = secretKey;
        }
        _refreshTokenSecret = refreshTokenSecret;

        _issuer = configuration["Jwt:Issuer"] ?? "Platform.ApiService";
        _audience = configuration["Jwt:Audience"] ?? "Platform.Web";
        _expirationMinutes = int.Parse(configuration["Jwt:ExpirationMinutes"] ?? "1440");
        _refreshTokenExpirationDays = int.Parse(configuration["Jwt:RefreshTokenExpirationDays"] ?? "7");
    }

    public string GenerateToken(string userId, string companyId)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_secretKey);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new("userId", userId),
            new("companyId", companyId)
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

    public string GenerateRefreshToken(string userId, string companyId)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_refreshTokenSecret);

        var claims = new List<Claim>
        {
            new("type", "refresh"),
            new("userId", userId),
            new("companyId", companyId),
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

    public ClaimsPrincipal? ValidateRefreshToken(string refreshToken)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var validationParameters = CreateRefreshTokenValidationParameters();

            var principal = tokenHandler.ValidateToken(refreshToken, validationParameters, out _);

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

    public string? GetUserIdFromToken(string token)
    {
        var principal = ValidateToken(token);
        return JwtHelper.GetUserId(principal);
    }

    public string? GetUserIdFromRefreshToken(string refreshToken)
    {
        var principal = ValidateRefreshToken(refreshToken);
        return JwtHelper.GetUserId(principal);
    }

    public string? GetCompanyIdFromToken(string token)
    {
        var principal = ValidateToken(token);
        return JwtHelper.GetCompanyId(principal);
    }

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
}

public static class JwtHelper
{
    public static string? GetCompanyId(ClaimsPrincipal? principal)
        => principal?.FindFirst("companyId")?.Value;

    public static string? GetUserId(ClaimsPrincipal? principal)
        => principal?.FindFirst("userId")?.Value;
}
