using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

public class CaptchaImageResult
{
    public string CaptchaId { get; set; } = string.Empty;

    public string ImageData { get; set; } = string.Empty;

    public int ExpiresIn { get; set; }
}

public class VerifyCaptchaImageRequest
{
    [Required(ErrorMessage = "验证码ID不能为空")]
    public string CaptchaId { get; set; } = string.Empty;

    [Required(ErrorMessage = "验证码答案不能为空")]
    [StringLength(10, MinimumLength = 1, ErrorMessage = "验证码答案长度必须在1-10个字符之间")]
    public string Answer { get; set; } = string.Empty;

    public string Type { get; set; } = "login";
}