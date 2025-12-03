using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 规则管理控制器 - 处理规则相关的 CRUD 操作
/// </summary>
[ApiController]
[Route("api/rule")]
public class RuleController : BaseApiController
{
    private readonly IRuleService _ruleService;

    /// <summary>
    /// 初始化规则控制器
    /// </summary>
    /// <param name="ruleService">规则服务</param>
    public RuleController(IRuleService ruleService)
    {
        _ruleService = ruleService ?? throw new ArgumentNullException(nameof(ruleService));
    }

    /// <summary>
    /// 获取规则列表
    /// </summary>
    /// <param name="current">当前页码</param>
    /// <param name="pageSize">页面大小</param>
    /// <param name="name">规则名称</param>
    /// <param name="sorter">排序字段</param>
    /// <param name="filter">过滤条件</param>
    [HttpGet]
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
        return Success(rule.EnsureFound("规则", id));
    }

    /// <summary>
    /// 创建规则
    /// </summary>
    /// <param name="request">创建规则请求</param>
    [HttpPost]
    public async Task<IActionResult> CreateRule([FromBody] CreateRuleRequest request)
    {
        var newRule = await _ruleService.CreateRuleAsync(request);
        return Ok(newRule);
    }

    /// <summary>
    /// 更新规则
    /// </summary>
    /// <param name="request">更新规则请求</param>
    [HttpPut]
    public async Task<IActionResult> UpdateRule([FromBody] UpdateRuleRequest request)
    {
        if (!request.Key.HasValue)
            throw new ArgumentException("Key不能为空");
        
        var id = request.Key.Value.ToString();
        var rule = await _ruleService.UpdateRuleAsync(id, request);
        return Success(rule.EnsureFound("规则", id), "更新成功");
    }

    /// <summary>
    /// 删除规则
    /// </summary>
    /// <param name="request">删除规则请求</param>
    [HttpDelete]
    public async Task<IActionResult> DeleteRule([FromBody] DeleteRuleRequest request)
    {
        if (!request.Key.HasValue)
            throw new ArgumentException("Key不能为空");
        
        var deleted = await _ruleService.DeleteRulesAsync(new List<int> { request.Key.Value });
        deleted.EnsureSuccess("规则", request.Key.Value.ToString());
        return Success("删除成功");
    }
}
