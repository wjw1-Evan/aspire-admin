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
    /// <remarks>
    /// 获取当前登录用户的详细信息，包括用户基本信息、权限、企业信息等。
    /// 
    /// 示例请求：
    /// ```
    /// GET /api/currentUser
    /// Authorization: Bearer {token}
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "data": {
    ///     "id": "user123",
    ///     "username": "admin",
    ///     "displayName": "管理员",
    ///     "email": "admin@example.com",
    ///     "isLogin": true,
    ///     "currentCompanyId": "company123"
    ///   }
    /// }
    /// ```
    /// </remarks>
    /// <returns>当前用户信息</returns>
    /// <response code="200">成功返回用户信息</response>
    /// <response code="401">未授权，需要登录</response>
    [HttpGet("currentUser")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        // 检查用户是否已认证
        if (!IsAuthenticated)
            throw new UnauthorizedAccessException("用户未认证");

        var user = await _authService.GetCurrentUserAsync();
        return Success(user.EnsureFound("用户"));
    }

    /// <summary>
    /// 用户登录
    /// </summary>
    /// <param name="request">登录请求</param>
    /// <remarks>
    /// 用户通过用户名和密码进行登录，成功后返回访问令牌和刷新令牌。
    /// 
    /// 示例请求：
    /// ```json
    /// POST /api/login/account
    /// Content-Type: application/json
    /// 
    /// {
    ///   "username": "admin",
    ///   "password": "admin123",
    ///   "autoLogin": true
    /// }
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "data": {
    ///     "type": "account",
    ///     "currentAuthority": "admin",
    ///     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    ///     "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    ///     "expiresAt": "2024-01-01T12:00:00Z"
    ///   }
    /// }
    /// ```
    /// </remarks>
    /// <returns>登录结果，包含访问令牌</returns>
    /// <response code="200">登录成功</response>
    /// <response code="400">用户名或密码错误</response>
    [HttpPost("login/account")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var result = await _authService.LoginAsync(request);
        return Ok(result);
    }

    /// <summary>
    /// 用户登出
    /// </summary>
    /// <remarks>
    /// 用户登出，清除服务器端的会话信息。
    /// 
    /// 示例请求：
    /// ```
    /// POST /api/login/outLogin
    /// Authorization: Bearer {token}
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "message": "登出成功"
    /// }
    /// ```
    /// </remarks>
    /// <returns>登出结果</returns>
    /// <response code="200">登出成功</response>
    /// <response code="401">未授权，需要登录</response>
    [HttpPost("login/outLogin")]
    [Authorize]
    public async Task<IActionResult> Logout()
    {
        await _authService.LogoutAsync();
        return Success("登出成功");
    }

    /// <summary>
    /// 获取验证码
    /// </summary>
    /// <param name="phone">手机号</param>
    /// <remarks>
    /// 为指定手机号生成验证码，用于登录验证。
    /// 
    /// 示例请求：
    /// ```
    /// GET /api/login/captcha?phone=13800138000
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "data": {
    ///     "captcha": "123456",
    ///     "expiresIn": 300
    ///   }
    /// }
    /// ```
    /// </remarks>
    /// <returns>验证码信息</returns>
    /// <response code="200">验证码生成成功</response>
    /// <response code="400">手机号格式不正确</response>
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
    /// <param name="request">验证码验证请求</param>
    /// <remarks>
    /// 验证手机号和验证码是否匹配，主要用于测试环境。
    /// 
    /// 示例请求：
    /// ```json
    /// POST /api/login/verify-captcha
    /// Content-Type: application/json
    /// 
    /// {
    ///   "phone": "13800138000",
    ///   "code": "123456"
    /// }
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "data": {
    ///     "valid": true
    ///   }
    /// }
    /// ```
    /// </remarks>
    /// <returns>验证结果</returns>
    /// <response code="200">验证完成</response>
    /// <response code="400">手机号或验证码格式不正确</response>
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
    /// <remarks>
    /// 注册新用户账户，系统会自动创建个人企业。
    /// 
    /// 示例请求：
    /// ```json
    /// POST /api/register
    /// Content-Type: application/json
    /// 
    /// {
    ///   "username": "newuser",
    ///   "password": "password123",
    ///   "email": "newuser@example.com"
    /// }
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "data": {
    ///     "id": "user123",
    ///     "username": "newuser",
    ///     "email": "newuser@example.com",
    ///     "isActive": true
    ///   }
    /// }
    /// ```
    /// </remarks>
    /// <returns>注册结果</returns>
    /// <response code="200">注册成功</response>
    /// <response code="400">用户名或邮箱已存在</response>
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
    /// <remarks>
    /// 修改当前用户的登录密码，需要提供当前密码进行验证。
    /// 
    /// 示例请求：
    /// ```json
    /// POST /api/change-password
    /// Authorization: Bearer {token}
    /// Content-Type: application/json
    /// 
    /// {
    ///   "currentPassword": "oldpassword",
    ///   "newPassword": "newpassword123",
    ///   "confirmPassword": "newpassword123"
    /// }
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "message": "密码修改成功"
    /// }
    /// ```
    /// </remarks>
    /// <returns>修改结果</returns>
    /// <response code="200">密码修改成功</response>
    /// <response code="400">当前密码错误或新密码格式不正确</response>
    /// <response code="401">未授权，需要登录</response>
    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var result = await _authService.ChangePasswordAsync(request);
        return Ok(result);
    }

    /// <summary>
    /// 刷新访问令牌
    /// </summary>
    /// <param name="request">刷新令牌请求</param>
    /// <remarks>
    /// 使用刷新令牌获取新的访问令牌，延长会话时间。
    /// 
    /// 示例请求：
    /// ```json
    /// POST /api/refresh-token
    /// Content-Type: application/json
    /// 
    /// {
    ///   "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    /// }
    /// ```
    /// 
    /// 示例响应：
    /// ```json
    /// {
    ///   "success": true,
    ///   "data": {
    ///     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    ///     "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    ///     "expiresAt": "2024-01-01T12:00:00Z"
    ///   }
    /// }
    /// ```
    /// </remarks>
    /// <returns>新的访问令牌</returns>
    /// <response code="200">令牌刷新成功</response>
    /// <response code="400">刷新令牌无效或已过期</response>
    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        var result = await _authService.RefreshTokenAsync(request);
        return Ok(result);
    }
}
