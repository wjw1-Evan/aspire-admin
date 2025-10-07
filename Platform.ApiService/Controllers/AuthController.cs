using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    /// <summary>
    /// 获取当前用户信息
    /// </summary>
    [HttpGet("currentUser")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        try
        {
            // 检查用户是否已认证
            if (!User.Identity?.IsAuthenticated ?? true)
            {
                return Ok(new ApiResponse<CurrentUser>
                {
                    Success = true,
                    Data = new CurrentUser { IsLogin = false },
                    ErrorCode = "401",
                    ErrorMessage = "用户未认证"
                });
            }

            var user = await _authService.GetCurrentUserAsync();
            if (user == null || !user.IsLogin)
            {
                return Ok(new ApiResponse<CurrentUser>
                {
                    Success = true,
                    Data = new CurrentUser { IsLogin = false },
                    ErrorCode = "401",
                    ErrorMessage = "请先登录！"
                });
            }
            
            return Ok(new ApiResponse<CurrentUser>
            {
                Success = true,
                Data = user
            });
        }
        catch (Exception ex)
        {
            return Ok(new ApiResponse<CurrentUser>
            {
                Success = false,
                Data = new CurrentUser { IsLogin = false },
                ErrorCode = "500",
                ErrorMessage = $"获取用户信息失败: {ex.Message}"
            });
        }
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
        return Ok(new { data = new { }, success = true });
    }

    /// <summary>
    /// 获取验证码
    /// </summary>
    [HttpGet("login/captcha")]
    public async Task<IActionResult> GetCaptcha()
    {
        var captcha = await AuthService.GetCaptchaAsync();
        return Ok(captcha);
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
