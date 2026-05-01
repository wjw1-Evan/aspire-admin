using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 翻译服务控制器，提供自动翻译能力。
/// </summary>
[ApiController]
[Route("api/translation")]
[RequireMenu("translation")]
public class TranslationController : BaseApiController
{
    private readonly IChatAiService _chatAiService;
    private readonly ILogger<TranslationController> _logger;

    public TranslationController(IChatAiService chatAiService, ILogger<TranslationController> logger)
    {
        _chatAiService = chatAiService ?? throw new ArgumentNullException(nameof(chatAiService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// 翻译文本到目标语言。
    /// </summary>
    /// <param name="request">翻译请求。</param>
    /// <param name="cancellationToken">取消标识。</param>
    /// <returns>翻译结果。</returns>
    [HttpPost("translate")]
    public async Task<IActionResult> Translate([FromBody] TranslateRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
            throw new ArgumentException("翻译文本不能为空", nameof(request.Text));
        if (string.IsNullOrWhiteSpace(request.TargetLocale))
            throw new ArgumentException("目标语言不能为空", nameof(request.TargetLocale));

        var userId = RequiredUserId;
        var result = await _chatAiService.TranslateTextAsync(request.Text, request.TargetLocale, request.SourceText, userId, cancellationToken);
        return Success(new TranslateResponse { TranslatedText = result });
    }
}

/// <summary>
/// 翻译请求。
/// </summary>
public class TranslateRequest
{
    public string Text { get; set; } = string.Empty;
    public string TargetLocale { get; set; } = string.Empty;
    public string? SourceText { get; set; }
}

/// <summary>
/// 翻译响应。
/// </summary>
public class TranslateResponse
{
    public string TranslatedText { get; set; } = string.Empty;
}
