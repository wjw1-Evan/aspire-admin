using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Platform.ApiService.Attributes;
using Platform.ApiService.Options;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Middleware;

/// <summary>
/// 全局身份验证中间件
/// 提供统一的JWT token验证和路由保护机制
/// </summary>
public class GlobalAuthenticationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalAuthenticationMiddleware> _logger;
    private readonly IConfiguration _configuration;
    private readonly JwtSecurityTokenHandler _tokenHandler;
    private readonly string _secretKey;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly JsonSerializerOptions _jsonOptions;

    // 无需认证的公共路径列表
    private readonly GlobalAuthenticationOptions _options;

    /// <summary>
    /// 构造函数
    /// </summary>
    public GlobalAuthenticationMiddleware(
        RequestDelegate next,
        ILogger<GlobalAuthenticationMiddleware> logger,
        IConfiguration configuration,
        IOptions<GlobalAuthenticationOptions> options)
    {
        _next = next ?? throw new ArgumentNullException(nameof(next));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _options = options?.Value ?? new GlobalAuthenticationOptions();
        _tokenHandler = new JwtSecurityTokenHandler();

        // 初始化默认配置
        _options.InitializeDefaults();

        // 从配置获取JWT参数
        _secretKey = _configuration["Jwt:SecretKey"]
            ?? throw new InvalidOperationException("JWT SecretKey is not configured");
        _issuer = _configuration["Jwt:Issuer"] ?? "Platform.ApiService";
        _audience = _configuration["Jwt:Audience"] ?? "Platform.Web";

        // 配置JSON序列化选项
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };
    }

    /// <summary>
    /// 执行中间件逻辑
    /// </summary>  
    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLowerInvariant();

        // 检查端点是否标记为跳过认证
        var endpoint = context.GetEndpoint();
        if (endpoint != null)
        {
            // 检查SkipGlobalAuthentication属性
            var skipAuthAttribute = endpoint.Metadata.GetMetadata<SkipGlobalAuthenticationAttribute>();
            if (skipAuthAttribute != null)
            {
                _logger.LogDebug("跳过全局身份验证: {Reason}", skipAuthAttribute.Reason ?? "未指定原因");
                await _next(context);
                return;
            }

            // 检查 IAllowAnonymous 属性 (对应 [AllowAnonymous])
            var allowAnonymous = endpoint.Metadata.GetMetadata<IAllowAnonymous>();
            if (allowAnonymous != null)
            {
                _logger.LogDebug("跳过全局身份验证: 端点标记为 [AllowAnonymous]");
                await _next(context);
                return;
            }
        }

        // 检查是否为公共路径
        if (IsPublicPath(path))
        {
            await _next(context);
            return;
        }

        // 检查是否已经有认证结果（来自UseAuthentication）
        if (context.User?.Identity?.IsAuthenticated == true)
        {
            await _next(context);
            return;
        }

        // 检查Authorization头
        var authHeader = context.Request.Headers.Authorization.FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            await WriteUnauthorizedResponse(context, "缺少Authorization头或格式错误");
            return;
        }

        var token = authHeader.Substring("Bearer ".Length).Trim();

        if (string.IsNullOrEmpty(token))
        {
            await WriteUnauthorizedResponse(context, "Token不能为空");
            return;
        }

        // 验证JWT token
        var validationResult = ValidateToken(token, context);

        if (!validationResult.IsValid)
        {
            await WriteUnauthorizedResponse(context, validationResult.ErrorMessage!);
            return;
        }

        // 设置用户身份
        context.User = validationResult.Principal!;

        await _next(context);
    }

    /// <summary>
    /// 检查是否为公共路径
    /// </summary>
    private bool IsPublicPath(string? path)
    {
        if (string.IsNullOrEmpty(path))
            return false;

        return _options.PublicPaths.Any(publicPath =>
            path.StartsWith(publicPath, StringComparison.OrdinalIgnoreCase));
    }

    /// <summary>
    /// 验证JWT token
    /// </summary>
    private TokenValidationResult ValidateToken(string token, HttpContext context)
    {
        try
        {
            // 检查token格式
            if (!_tokenHandler.CanReadToken(token))
            {
                return new TokenValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "Token格式无效"
                };
            }

            var tokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(_secretKey)),
                ValidateIssuer = true,
                ValidIssuer = _issuer,
                ValidateAudience = true,
                ValidAudience = _audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero,
                RequireExpirationTime = true,
                RequireSignedTokens = true
            };

            // 验证token
            var principal = _tokenHandler.ValidateToken(
                token,
                tokenValidationParameters,
                out var validatedToken);

            // 检查token是否为JWT
            if (validatedToken is not JwtSecurityToken jwtToken)
            {
                return new TokenValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "Token格式无效"
                };
            }

            // 检查token是否过期
            if (jwtToken.ValidTo < DateTime.UtcNow)
            {
                return new TokenValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "Token已过期"
                };
            }

            // 检查token是否在有效期前
            if (jwtToken.ValidFrom > DateTime.UtcNow)
            {
                return new TokenValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "Token尚未生效"
                };
            }

            // 验证必要的claims
            var userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var userName = principal.FindFirst(ClaimTypes.Name)?.Value;

            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(userName))
            {
                return new TokenValidationResult
                {
                    IsValid = false,
                    ErrorMessage = "Token缺少必要的用户信息"
                };
            }

            return new TokenValidationResult
            {
                IsValid = true,
                Principal = principal,
                Token = jwtToken
            };
        }
        catch (SecurityTokenExpiredException)
        {
            return new TokenValidationResult
            {
                IsValid = false,
                ErrorMessage = "Token已过期"
            };
        }
        catch (SecurityTokenInvalidSignatureException)
        {
            return new TokenValidationResult
            {
                IsValid = false,
                ErrorMessage = "Token签名无效"
            };
        }
        catch (SecurityTokenInvalidIssuerException)
        {
            return new TokenValidationResult
            {
                IsValid = false,
                ErrorMessage = "Token发行者无效"
            };
        }
        catch (SecurityTokenInvalidAudienceException)
        {
            return new TokenValidationResult
            {
                IsValid = false,
                ErrorMessage = "Token受众无效"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Token验证过程中发生错误");
            return new TokenValidationResult
            {
                IsValid = false,
                ErrorMessage = "Token验证失败"
            };
        }
    }

    /// <summary>
    /// 写入未授权响应
    /// </summary>
    private async Task WriteUnauthorizedResponse(HttpContext context, string errorMessage)
    {
        context.Response.StatusCode = 401;
        context.Response.ContentType = "application/json";

        var response = new ApiResponse(
            success: false,
            code: "UNAUTHORIZED",
            message: errorMessage,
            traceId: context.TraceIdentifier
        );

        var jsonResponse = JsonSerializer.Serialize(response, _jsonOptions);
        await context.Response.WriteAsync(jsonResponse);
    }

    /// <summary>
    /// Token验证结果
    /// </summary>
    private class TokenValidationResult
    {
        public bool IsValid { get; set; }
        public string? ErrorMessage { get; set; }
        public ClaimsPrincipal? Principal { get; set; }
        public JwtSecurityToken? Token { get; set; }
    }
}