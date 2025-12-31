using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Services;

namespace Platform.ApiService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QuotaController : ControllerBase
    {
        private readonly IStorageQuotaService _storageQuotaService;

        public QuotaController(IStorageQuotaService storageQuotaService)
        {
            _storageQuotaService = storageQuotaService;
        }

        [HttpPost("add")] // Endpoint to add quota
        public async Task<IActionResult> AddQuota(string userId, long amount)
        {
            var result = await _storageQuotaService.SetUserQuotaAsync(userId, amount);
            return Ok(result);
        }

        [HttpDelete("remove")] // Endpoint to remove quota
        public async Task<IActionResult> RemoveQuota(string userId, long amount)
        {
            // Logic to remove quota
            return Ok();
        }
    }
}