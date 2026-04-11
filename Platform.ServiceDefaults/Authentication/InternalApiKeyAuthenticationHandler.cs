using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Platform.ServiceDefaults.Authentication;

/// <summary>
/// 校验 <c>X-Internal-Service-Key</c> 与配置 <c>InternalService:ApiKey</c> 是否一致。
/// </summary>
public sealed class InternalApiKeyAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public InternalApiKeyAuthenticationHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var expected = Context.RequestServices.GetRequiredService<IConfiguration>()["InternalService:ApiKey"];
        if (string.IsNullOrEmpty(expected))
            return Task.FromResult(AuthenticateResult.Fail("InternalService:ApiKey 未配置。"));

        if (!Request.Headers.TryGetValue("X-Internal-Service-Key", out var providedValues))
            return Task.FromResult(AuthenticateResult.Fail("缺少 X-Internal-Service-Key。"));

        var provided = providedValues.FirstOrDefault();
        if (!string.Equals(provided, expected, StringComparison.Ordinal))
            return Task.FromResult(AuthenticateResult.Fail("服务间密钥无效。"));

        var claims = new[] { new Claim(ClaimTypes.Name, "internal-service") };
        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
