using System.ComponentModel.DataAnnotations;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 图形验证码实体（全局资源，不属于任何企业）
/// 使用 MongoDB TTL 索引自动清理过期验证码
/// v6.1: 使用自定义集合名称修复命名规范问题
/// </summary>
[BsonCollectionName("captcha_images")]
public class CaptchaImage : BaseEntity
{
    /// <summary>
    /// 验证码ID（用作唯一标识）
    /// </summary>
    [BsonElement("captchaId")]
    public string CaptchaId { get; set; } = string.Empty;

    /// <summary>
    /// 验证码答案（加密存储）
    /// </summary>
    [BsonElement("answer")]
    public string Answer { get; set; } = string.Empty;

    /// <summary>
    /// 过期时间（用于 TTL 索引）
    /// </summary>
    [BsonElement("expiresAt")]
    public DateTime ExpiresAt { get; set; }

    /// <summary>
    /// 是否已使用
    /// </summary>
    [BsonElement("isUsed")]
    public bool IsUsed { get; set; } = false;

    /// <summary>
    /// 验证码类型（login, register）
    /// </summary>
    [BsonElement("type")]
    public string Type { get; set; } = "login";

    /// <summary>
    /// 客户端IP（用于防刷）
    /// </summary>
    [BsonElement("clientIp")]
    public string? ClientIp { get; set; }

}

/// <summary>
/// 图形验证码生成结果
/// </summary>
public class CaptchaImageResult
{
    /// <summary>
    /// 验证码ID
    /// </summary>
    public string CaptchaId { get; set; } = string.Empty;

    /// <summary>
    /// 验证码图片（Base64 编码）
    /// </summary>
    public string ImageData { get; set; } = string.Empty;

    /// <summary>
    /// 过期时间（秒）
    /// </summary>
    public int ExpiresIn { get; set; }
}

/// <summary>
/// 图形验证码验证请求
/// </summary>
public class VerifyCaptchaImageRequest
{
    /// <summary>
    /// 验证码ID
    /// </summary>
    [Required(ErrorMessage = "验证码ID不能为空")]
    public string CaptchaId { get; set; } = string.Empty;

    /// <summary>
    /// 用户输入的答案
    /// </summary>
    [Required(ErrorMessage = "验证码答案不能为空")]
    [StringLength(10, MinimumLength = 1, ErrorMessage = "验证码答案长度必须在1-10个字符之间")]
    public string Answer { get; set; } = string.Empty;

    /// <summary>
    /// 验证码类型（login, register）
    /// </summary>
    public string Type { get; set; } = "login";
}
