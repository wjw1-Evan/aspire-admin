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
    public const int AccessTokenExpirationMinutes = 60;
    public const int RefreshTokenExpirationDays = 7;
    public const string Issuer = "Platform.ApiService";
    public const string Audience = "Platform.Web";

    private readonly byte[] _secretKey;
    private readonly byte[] _refreshTokenSecret;

    public JwtService(IConfiguration configuration)
    {
        var secretKey = configuration["Jwt:SecretKey"];
        if (string.IsNullOrWhiteSpace(secretKey))
        {
            throw new InvalidOperationException(
                "JWT SecretKey must be configured. Set it via User Secrets (dotnet user-secrets set 'Jwt:SecretKey' 'your-key'), " +
                "Environment Variables (Jwt__SecretKey), or Azure Key Vault. " +
                "Never commit secrets to source code!");
        }
        _secretKey = Encoding.ASCII.GetBytes(secretKey);

        var refreshTokenSecret = configuration["Jwt:RefreshTokenSecret"];
        _refreshTokenSecret = Encoding.ASCII.GetBytes(string.IsNullOrWhiteSpace(refreshTokenSecret) ? secretKey : refreshTokenSecret);
    }

    public string GenerateToken(string userId, string companyId) =>
        GenerateJwt(_secretKey, DateTime.UtcNow.AddMinutes(AccessTokenExpirationMinutes), claims =>
        {
            claims.Add(new(ClaimTypes.NameIdentifier, userId));
            claims.Add(new("userId", userId));
            claims.Add(new("companyId", companyId));
        });

    public string GenerateRefreshToken(string userId, string companyId) =>
        GenerateJwt(_refreshTokenSecret, DateTime.UtcNow.AddDays(RefreshTokenExpirationDays), claims =>
        {
            claims.Add(new("type", "refresh"));
            claims.Add(new("userId", userId));
            claims.Add(new("companyId", companyId));
            claims.Add(new("iat", DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64));
        });

    public ClaimsPrincipal? ValidateToken(string token) => Validate(_secretKey, token);

    public ClaimsPrincipal? ValidateRefreshToken(string refreshToken)
    {
        var principal = Validate(_refreshTokenSecret, refreshToken);
        if (principal?.FindFirst("type")?.Value != "refresh") return null;
        return principal;
    }

    public string? GetUserIdFromToken(string token) => JwtHelper.GetUserId(ValidateToken(token));

    public string? GetUserIdFromRefreshToken(string refreshToken) => JwtHelper.GetUserId(ValidateRefreshToken(refreshToken));

    public string? GetCompanyIdFromToken(string token) => JwtHelper.GetCompanyId(ValidateToken(token));

    private string GenerateJwt(byte[] key, DateTime expires, Action<List<Claim>> addClaims)
    {
        var handler = new JwtSecurityTokenHandler();
        var claims = new List<Claim>();
        addClaims(claims);
        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = expires,
            Issuer = Issuer,
            Audience = Audience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };
        return handler.WriteToken(handler.CreateToken(descriptor));
    }

    private static ClaimsPrincipal? Validate(byte[] key, string token)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            return handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = Issuer,
                ValidateAudience = true,
                ValidAudience = Audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            }, out _);
        }
        catch
        {
            return null;
        }
    }
}

public static class JwtHelper
{
    public static string? GetCompanyId(ClaimsPrincipal? principal)
        => principal?.FindFirst("companyId")?.Value;

    public static string? GetUserId(ClaimsPrincipal? principal)
        => principal?.FindFirst("userId")?.Value;
}
