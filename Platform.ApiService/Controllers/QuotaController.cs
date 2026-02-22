using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;

namespace Platform.ApiService.Controllers
{
    /// <summary>
    /// 存储配额管理控制器。
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class QuotaController(IStorageQuotaService storageQuotaService) : BaseApiController
    {
        /// <summary>
        /// 为指定用户设置（或增加）存储配额。
        /// </summary>
        /// <param name="userId">用户标识。</param>
        /// <param name="amount">目标配额（字节）。</param>
        /// <returns>设置结果。</returns>
        [HttpPost("add")]
        public async Task<IActionResult> AddQuota([FromQuery] string userId, [FromQuery] long amount)
        {
            var result = await storageQuotaService.SetUserQuotaAsync(userId, amount);
            return Success(result);
        }

        /// <summary>
        /// 为指定用户减少存储配额。
        /// </summary>
        /// <param name="userId">用户标识。</param>
        /// <param name="amount">要减少的配额值（字节）。</param>
        /// <returns>操作结果。</returns>
        [HttpDelete("remove")]
        public async Task<IActionResult> RemoveQuota([FromQuery] string userId, [FromQuery] long amount)
        {
            if (amount <= 0)
                return ValidationError("减少的配额量必须大于 0");

            var current = await storageQuotaService.GetUserQuotaAsync(userId);
            var newQuota = Math.Max(0, current.TotalQuota - amount);
            var result = await storageQuotaService.SetUserQuotaAsync(userId, newQuota);
            return Success(result);
        }
    }
}
