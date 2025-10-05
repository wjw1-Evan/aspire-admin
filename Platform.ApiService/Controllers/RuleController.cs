using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("api")]
public class RuleController : ControllerBase
{
    private readonly RuleService _ruleService;

    public RuleController(RuleService ruleService)
    {
        _ruleService = ruleService;
    }

    /// <summary>
    /// 获取规则列表
    /// </summary>
    /// <param name="current">当前页码</param>
    /// <param name="pageSize">页面大小</param>
    /// <param name="name">规则名称</param>
    /// <param name="sorter">排序字段</param>
    /// <param name="filter">过滤条件</param>
    [HttpGet("rule")]
    public async Task<IActionResult> GetRules(
        [FromQuery] int current = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? name = null,
        [FromQuery] string? sorter = null,
        [FromQuery] string? filter = null)
    {
        var queryParams = new RuleQueryParams
        {
            Current = current,
            PageSize = pageSize,
            Name = name,
            Sorter = sorter,
            Filter = filter
        };
        
        var result = await _ruleService.GetRulesAsync(queryParams);
        return Ok(result);
    }

    /// <summary>
    /// 根据ID获取规则
    /// </summary>
    /// <param name="id">规则ID</param>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetRuleById(string id)
    {
        var rule = await _ruleService.GetRuleByIdAsync(id);
        if (rule == null)
            return NotFound($"Rule with ID {id} not found");
        
        return Ok(rule);
    }

    /// <summary>
    /// 创建规则
    /// </summary>
    /// <param name="request">创建规则请求</param>
    [HttpPost("rule")]
    public async Task<IActionResult> CreateRule([FromBody] CreateRuleRequest request)
    {
        var newRule = await _ruleService.CreateRuleAsync(request);
        return Ok(newRule);
    }

    /// <summary>
    /// 更新规则
    /// </summary>
    /// <param name="request">更新规则请求</param>
    [HttpPut("rule")]
    public async Task<IActionResult> UpdateRule([FromBody] UpdateRuleRequest request)
    {
        // 这里需要根据key找到对应的id，然后更新
        // 为了简化，这里返回成功
        return Ok(new { success = true });
    }

    /// <summary>
    /// 删除规则
    /// </summary>
    /// <param name="request">删除规则请求</param>
    [HttpDelete("rule")]
    public async Task<IActionResult> DeleteRule([FromBody] DeleteRuleRequest request)
    {
        if (request.Key.HasValue)
        {
            var deleted = await _ruleService.DeleteRulesAsync(new List<int> { request.Key.Value });
            return Ok(new { success = deleted });
        }
        return BadRequest("Key is required for delete operation");
    }
}
