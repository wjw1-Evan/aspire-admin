using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Platform.ServiceDefaults.Models;

namespace Platform.ServiceDefaults.Authentication;

/// <summary>
/// 为 Storage、SystemMonitor 等卫星服务注册与 ApiService 一致的 JWT 校验，并支持服务间密钥。
/// </summary>
public static class SatelliteAuthenticationExtensions
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public static WebApplicationBuilder AddSatelliteJwtAndInternalKeyAuthentication(this WebApplicationBuilder builder)
    {
        var jwtSecretKey = builder.Configuration["Jwt:SecretKey"];
        if (string.IsNullOrWhiteSpace(jwtSecretKey))
            throw new InvalidOperationException("卫星服务需要配置 Jwt:SecretKey（须与 ApiService 一致，通常由 AppHost 注入）。");

        var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "Platform.ApiService";
        var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "Platform.Web";

        builder.Services.AddAuthentication(options =>
            {
                options.DefaultScheme = SatelliteAuthDefaults.ForwardingScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddPolicyScheme(SatelliteAuthDefaults.ForwardingScheme, "Satellite", options =>
            {
                options.ForwardDefaultSelector = context =>
                {
                    var expected = context.RequestServices.GetRequiredService<IConfiguration>()["InternalService:ApiKey"];
                    if (!string.IsNullOrEmpty(expected) &&
                        context.Request.Headers.ContainsKey("X-Internal-Service-Key"))
                        return SatelliteAuthDefaults.InternalApiKeyScheme;
                    return JwtBearerDefaults.AuthenticationScheme;
                };
            })
            .AddScheme<AuthenticationSchemeOptions, InternalApiKeyAuthenticationHandler>(
                SatelliteAuthDefaults.InternalApiKeyScheme,
                _ => { })
            .AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtSecretKey)),
                    ValidateIssuer = true,
                    ValidIssuer = jwtIssuer,
                    ValidateAudience = true,
                    ValidAudience = jwtAudience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero,
                    RequireExpirationTime = true,
                    RequireSignedTokens = true
                };

                options.Events = new JwtBearerEvents
                {
                    OnAuthenticationFailed = _ => Task.CompletedTask,
                    OnChallenge = context =>
                    {
                        context.HandleResponse();
                        context.Response.StatusCode = 401;
                        context.Response.ContentType = "application/json";
                        var errorResponse = new ApiResponse(
                            success: false,
                            message: "未提供有效的认证令牌或令牌已过期。请重新登录。",
                            traceId: context.HttpContext.TraceIdentifier);
                        return context.Response.WriteAsync(JsonSerializer.Serialize(errorResponse, JsonOptions));
                    },
                    OnForbidden = context =>
                    {
                        context.Response.StatusCode = 403;
                        context.Response.ContentType = "application/json";
                        var errorResponse = new ApiResponse(
                            success: false,
                            message: "您只是此资源的访问者，无权进行操作 (403 Forbidden)",
                            traceId: context.HttpContext.TraceIdentifier);
                        return context.Response.WriteAsync(JsonSerializer.Serialize(errorResponse, JsonOptions));
                    }
                };
            });

        builder.Services.AddAuthorization();
        JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();
        return builder;
    }
}
