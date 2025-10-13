using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Services;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api")]
public class AuthController : BaseApiController
{
    private readonly IAuthService _authService;
    private readonly ICaptchaService _captchaService;
    private readonly IPhoneValidationService _phoneValidationService;

    public AuthController(
        IAuthService authService, 
        ICaptchaService captchaService,
        IPhoneValidationService phoneValidationService)
    {
        _authService = authService;
        _captchaService = captchaService;
        _phoneValidationService = phoneValidationService;
    }

    /// <summary>
    /// 获取当前用户信息
    /// </summary>
    [HttpGet("currentUser")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        // 检查用户是否已认证
        if (!IsAuthenticated)
            throw new UnauthorizedAccessException("用户未认证");

        var user = await _authService.GetCurrentUserAsync();
        return Ok(ApiResponse<CurrentUser>.SuccessResult(user.EnsureFound("用户")));
    }

    /// <summary>
    /// 用户登录
    /// </summary>
    /// <param name="request">登录请求</param>
    [HttpPost("login/account")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        return Ok(result);
    }

    /// <summary>
    /// 用户登出
    /// </summary>
    [HttpPost("login/outLogin")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await _authService.LogoutAsync();
        return Ok(ApiResponse.SuccessResult("登出成功"));
    }

    /// <summary>
    /// 获取验证码
    /// </summary>
    /// <param name="phone">手机号</param>
    [HttpGet("login/captcha")]
    public async Task<IActionResult> GetCaptcha([FromQuery] string phone)
    {
        _phoneValidationService.ValidatePhone(phone);
        var result = await _captchaService.GenerateCaptchaAsync(phone);
        
        return Success(new
        {
            captcha = result.Code,
            expiresIn = result.ExpiresIn
        });
    }

    /// <summary>
    /// 验证验证码（可选 - 用于测试）
    /// </summary>
    [HttpPost("login/verify-captcha")]
    public async Task<IActionResult> VerifyCaptcha([FromBody] VerifyCaptchaRequest request)
    {
        _phoneValidationService.ValidatePhone(request.Phone);
        _phoneValidationService.ValidateCaptchaCode(request.Code);

        var isValid = await _captchaService.ValidateCaptchaAsync(request.Phone, request.Code);
        
        return Success(new { valid = isValid });
    }

    /// <summary>
    /// 用户注册
    /// </summary>
    /// <param name="request">注册请求</param>
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var result = await _authService.RegisterAsync(request);
        return Ok(result);
    }

    /// <summary>
    /// 修改密码
    /// </summary>
    /// <param name="request">修改密码请求</param>
    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var result = await _authService.ChangePasswordAsync(request);
        return Ok(result);
    }

    /// <summary>
    /// 刷新访问token
    /// </summary>
    /// <param name="request">刷新token请求</param>
    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        var result = await _authService.RefreshTokenAsync(request);
        return Ok(result);
    }
}
