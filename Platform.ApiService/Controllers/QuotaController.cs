using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Services;

namespace Platform.ApiService.Controllers
{
    /// <summary>
    /// 存储配额管理控制器。
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class QuotaController : ControllerBase
    {
        private readonly IStorageQuotaService _storageQuotaService;

        /// <summary>
        /// 初始化存储配额控制器。
        /// </summary>
        /// <param name="storageQuotaService">存储配额服务。</param>
        public QuotaController(IStorageQuotaService storageQuotaService)
        {
            _storageQuotaService = storageQuotaService;
        }

        /// <summary>
        /// 为指定用户设置（或增加）存储配额。
        /// </summary>
        /// <param name="userId">用户标识。</param>
        /// <param name="amount">目标配额（字节）。</param>
        /// <returns>设置结果。</returns>
        [HttpPost("add")] // Endpoint to add quota
        public async Task<IActionResult> AddQuota([FromQuery] string userId, [FromQuery] long amount)
        {
            var result = await _storageQuotaService.SetUserQuotaAsync(userId, amount);
            return Ok(result);
        }

        /// <summary>
        /// 为指定用户减少存储配额。
        /// </summary>
        /// <param name="userId">用户标识。</param>
        /// <param name="amount">要减少的配额值（字节）。</param>
        /// <returns>操作结果。</returns>
        [HttpDelete("remove")] // Endpoint to remove quota
        public async Task<IActionResult> RemoveQuota([FromQuery] string userId, [FromQuery] long amount)
        {
            // Logic to remove quota
            return Ok();
        }
    }
}
