using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Models.Response;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api/chat/sessions")]
public class ChatSessionsController : BaseApiController
{
    private readonly IChatService _chatService;
    private readonly ILogger<ChatSessionsController> _logger;

    public ChatSessionsController(
        IChatService chatService,
        ILogger<ChatSessionsController> logger
    )
    {
        _chatService = chatService ?? throw new ArgumentNullException(nameof(chatService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    [HttpGet]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSessions([FromQuery] ChatSessionListRequest request)
    {
        var result = await _chatService.GetSessionsAsync(request);
        return SuccessPaged(result.Queryable.ToList(), result.RowCount, result.CurrentPage, result.PageSize);
    }
}
