using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Constants;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using System.Security.Cryptography;
using User = Platform.ApiService.Models.AppUser;

namespace Platform.ApiService.Services;

/// <summary>
/// 密码服务实现
/// </summary>
public class PasswordService : IPasswordService
{
    private readonly DbContext _context;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IUserService _userService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IFieldValidationService _validationService;
    private readonly IPasswordEncryptionService _encryptionService;
    private readonly IEmailService _emailService;
    private readonly IMemoryCache _memoryCache;
    private readonly ILogger<PasswordService> _logger;

    public PasswordService(
        DbContext context,
        IHttpContextAccessor httpContextAccessor,
        IUserService userService,
        IPasswordHasher passwordHasher,
        IFieldValidationService validationService,
        IPasswordEncryptionService encryptionService,
        IEmailService emailService,
        IMemoryCache memoryCache,
        ILogger<PasswordService> logger)
    {
        _context = context;
        _httpContextAccessor = httpContextAccessor;
        _userService = userService;
        _passwordHasher = passwordHasher;
        _validationService = validationService;
        _encryptionService = encryptionService;
        _emailService = emailService;
        _memoryCache = memoryCache;
        _logger = logger;
    }

    /// <inheritdoc/>
    public async Task<ServiceResult<bool>> ChangePasswordAsync(ChangePasswordRequest request)
    {
        try
        {
            var userId = _httpContextAccessor.HttpContext?.User?.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userId))
                return ServiceResult<bool>.Failure(ErrorCodes.UNAUTHORIZED, "未授权访问", 401);

            var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Id == userId && u.IsActive == true);
            if (user == null)
                return ServiceResult<bool>.Failure(ErrorCodes.USER_NOT_FOUND, "用户不存在或已被禁用", 404);

            var oldPassword = _encryptionService.TryDecryptPassword(request.CurrentPassword);
            var newPassword = _encryptionService.TryDecryptPassword(request.NewPassword);

            if (!_passwordHasher.VerifyPassword(oldPassword, user.PasswordHash))
                return ServiceResult<bool>.Failure(ErrorCodes.INVALID_OLD_PASSWORD, "旧密码不正确");

            _validationService.ValidatePassword(newPassword);

            user.PasswordHash = _passwordHasher.HashPassword(newPassword);
            await _context.SaveChangesAsync();

            var ipAddress = _httpContextAccessor.HttpContext?.Connection?.RemoteIpAddress?.ToString();
            var userAgent = _httpContextAccessor.HttpContext?.Request?.Headers["User-Agent"].ToString();
            await _userService.LogUserActivityAsync(userId, "change_password", "修改密码", ipAddress, userAgent);

            return ServiceResult<bool>.Success(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "修改密码失败");
            return ServiceResult<bool>.Failure(ErrorCodes.INTERNAL_ERROR, "修改密码失败", 500);
        }
    }

    /// <inheritdoc/>
    public async Task<ServiceResult<bool>> SendPasswordResetCodeAsync(SendResetCodeRequest request)
    {
        var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive == true);
        if (user == null)
            return ServiceResult<bool>.Failure(ErrorCodes.USER_NOT_FOUND, "该邮箱未绑定任何活动账户，或账户已被禁用", 404);

        var bytes = new byte[4];
        RandomNumberGenerator.Fill(bytes);
        var code = (BitConverter.ToUInt32(bytes, 0) % AuthConstants.PasswordResetCodeMax + AuthConstants.PasswordResetCodeMin).ToString();

        var cacheKey = $"PasswordResetCode_{request.Email}";
        _memoryCache.Set(cacheKey, code, TimeSpan.FromMinutes(AuthConstants.PasswordResetCodeExpiresMinutes));

        var htmlBody = $@"
<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;'>
    <h2 style='color: #1890ff;'>找回密码</h2>
    <p>您好，{user.Username}：</p>
    <p>您正在申请重置密码，您的验证码是：</p>
    <div style='background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; font-weight: bold; color: #333; border-radius: 4px; margin: 20px 0;'>
        {code}
    </div>
    <p>此验证码在 5 分钟内有效。如果这不是您的操作，请忽略此邮件。</p>
    <br/>
    <p style='color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 10px;'>此为系统自动发送的邮件，请勿直接回复。</p>
</div>";

        try
        {
            await _emailService.SendEmailAsync(request.Email, "找回密码验证码", htmlBody);
            _logger.LogInformation("【重置密码】为用户 {Username}({Email}) 发送了验证码邮件: {Code}", user.Username, request.Email, code);
            return ServiceResult<bool>.Success(true, "验证码已发送至您的邮箱");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "发送重置密码邮件失败: {Email}", request.Email);
            return ServiceResult<bool>.Failure(ErrorCodes.SEND_EMAIL_FAILED, "发送邮件失败，请稍后再试", 500);
        }
    }

    /// <inheritdoc/>
    public async Task<ServiceResult<bool>> ResetPasswordAsync(ResetPasswordRequest request)
    {
        var cacheKey = $"PasswordResetCode_{request.Email}";
        if (!_memoryCache.TryGetValue(cacheKey, out string? cachedCode))
            return ServiceResult<bool>.Failure(ErrorCodes.CODE_EXPIRED, "验证码已过期，请重新获取");

        if (cachedCode != request.Code)
            return ServiceResult<bool>.Failure(ErrorCodes.INVALID_CODE, "验证码不正确");

        var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive == true);
        if (user == null)
            return ServiceResult<bool>.Failure(ErrorCodes.USER_NOT_FOUND, "该邮箱未绑定任何活动账户", 404);

        var newPassword = _encryptionService.TryDecryptPassword(request.NewPassword);
        _validationService.ValidatePassword(newPassword);

        user.PasswordHash = _passwordHasher.HashPassword(newPassword);
        await _context.SaveChangesAsync();

        _memoryCache.Remove(cacheKey);

        _logger.LogInformation("用户 {Username} 通过邮箱找回密码成功", user.Username);

        return ServiceResult<bool>.Success(true, "密码重置成功");
    }
}
