using System.ComponentModel.DataAnnotations;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

public class CaptchaImageResult
{
    public string CaptchaId { get; set; } = string.Empty;

    public string ImageData { get; set; } = string.Empty;

    public int ExpiresIn { get; set; }
}

public class VerifyCaptchaImageRequest
{
    [Required(ErrorMessage = ErrorCode.ValidationCaptchaIdRequired)]
    public string CaptchaId { get; set; } = string.Empty;

    [Required(ErrorMessage = ErrorCode.ValidationCaptchaRequired)]
    [StringLength(10, MinimumLength = 1, ErrorMessage = ErrorCode.ValidationCaptchaAnswerLengthRange)]
    public string Answer { get; set; } = string.Empty;

    public string Type { get; set; } = "login";
}
