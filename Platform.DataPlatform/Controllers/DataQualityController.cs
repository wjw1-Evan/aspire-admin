using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.DataPlatform.Models;
using Platform.DataPlatform.Services;
using System.ComponentModel.DataAnnotations;

namespace Platform.DataPlatform.Controllers;

/// <summary>
/// 数据质量控制器
/// </summary>
[ApiController]
[Route("dataplatform/[controller]")]
[Authorize]
public class DataQualityController : ControllerBase
{
    private readonly IDataQualityService _qualityService;

    public DataQualityController(IDataQualityService qualityService)
    {
        _qualityService = qualityService;
    }

    /// <summary>
    /// 获取数据质量规则列表
    /// </summary>
    [HttpGet("rules")]
    public async Task<IActionResult> GetAllRules()
    {
        try
        {
            var rules = await _qualityService.GetAllRulesAsync();
            return Ok(new { success = true, data = rules });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 根据ID获取数据质量规则
    /// </summary>
    [HttpGet("rules/{id}")]
    public async Task<IActionResult> GetRuleById(string id)
    {
        try
        {
            var rule = await _qualityService.GetRuleByIdAsync(id);
            if (rule == null)
            {
                return NotFound(new { success = false, message = "质量规则不存在" });
            }

            return Ok(new { success = true, data = rule });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 创建数据质量规则
    /// </summary>
    [HttpPost("rules")]
    public async Task<IActionResult> CreateRule([FromBody] DataQualityRule rule)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "请求参数无效", errors = ModelState });
            }

            var createdRule = await _qualityService.CreateRuleAsync(rule);
            return Ok(new { success = true, data = createdRule, message = "创建成功" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 更新数据质量规则
    /// </summary>
    [HttpPut("rules/{id}")]
    public async Task<IActionResult> UpdateRule(string id, [FromBody] DataQualityRule rule)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "请求参数无效", errors = ModelState });
            }

            var success = await _qualityService.UpdateRuleAsync(id, rule);
            if (!success)
            {
                return NotFound(new { success = false, message = "质量规则不存在或更新失败" });
            }

            return Ok(new { success = true, message = "更新成功" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 删除数据质量规则
    /// </summary>
    [HttpDelete("rules/{id}")]
    public async Task<IActionResult> DeleteRule(string id)
    {
        try
        {
            var success = await _qualityService.DeleteRuleAsync(id);
            if (!success)
            {
                return NotFound(new { success = false, message = "质量规则不存在或删除失败" });
            }

            return Ok(new { success = true, message = "删除成功" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 执行数据质量检查
    /// </summary>
    [HttpPost("rules/{id}/check")]
    public async Task<IActionResult> ExecuteQualityCheck(string id)
    {
        try
        {
            var result = await _qualityService.ExecuteQualityCheckAsync(id);
            return Ok(new { success = true, data = result, message = "质量检查完成" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 批量执行数据质量检查
    /// </summary>
    [HttpPost("rules/batch-check")]
    public async Task<IActionResult> ExecuteBatchQualityCheck([FromBody] List<string> ruleIds)
    {
        try
        {
            if (ruleIds == null || !ruleIds.Any())
            {
                return BadRequest(new { success = false, message = "规则ID列表不能为空" });
            }

            var results = await _qualityService.ExecuteBatchQualityCheckAsync(ruleIds);
            return Ok(new { success = true, data = results, message = "批量质量检查完成" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 获取数据源的质量规则
    /// </summary>
    [HttpGet("datasource/{dataSourceId}/rules")]
    public async Task<IActionResult> GetRulesByDataSource(string dataSourceId)
    {
        try
        {
            var rules = await _qualityService.GetRulesByDataSourceAsync(dataSourceId);
            return Ok(new { success = true, data = rules });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 获取质量检查历史
    /// </summary>
    [HttpGet("rules/{id}/history")]
    public async Task<IActionResult> GetQualityCheckHistory(string id, [FromQuery] int limit = 10)
    {
        try
        {
            var history = await _qualityService.GetQualityCheckHistoryAsync(id, limit);
            return Ok(new { success = true, data = history });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 获取数据源质量统计
    /// </summary>
    [HttpGet("datasource/{dataSourceId}/statistics")]
    public async Task<IActionResult> GetDataSourceQualityStatistics(string dataSourceId)
    {
        try
        {
            var statistics = await _qualityService.GetDataSourceQualityStatisticsAsync(dataSourceId);
            return Ok(new { success = true, data = statistics });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 获取整体质量概览
    /// </summary>
    [HttpGet("overview")]
    public async Task<IActionResult> GetOverallQualityOverview()
    {
        try
        {
            var overview = await _qualityService.GetOverallQualityOverviewAsync();
            return Ok(new { success = true, data = overview });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
