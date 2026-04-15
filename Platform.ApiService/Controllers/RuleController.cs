using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

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
    /// <param name="request">分页参数</param>
    /// <returns>规则列表</returns>
    [HttpGet]
    public async Task<IActionResult> GetRules([FromQuery] PageParams request)
    {
        var result = await _ruleService.GetRulesAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 根据ID获取规则
    /// </summary>
    /// <param name="id">规则ID</param>
    /// <returns>规则详情</returns>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetRuleById(string id)
    {
        var rule = await _ruleService.GetRuleByIdAsync(id);
        return Success(rule);
    }

    /// <summary>
    /// 创建规则
    /// </summary>
    /// <param name="request">创建规则请求</param>
    /// <returns>创建的规则</returns>
    [HttpPost]
    public async Task<IActionResult> CreateRule([FromBody] CreateRuleRequest request)
    {
        var newRule = await _ruleService.CreateRuleAsync(request);
        return Success(newRule);
    }

    /// <summary>
    /// 更新规则
    /// </summary>
    /// <param name="request">更新规则请求</param>
    /// <returns>更新后的规则</returns>
    [HttpPut]
    public async Task<IActionResult> UpdateRule([FromBody] UpdateRuleRequest request)
    {
        if (!request.Key.HasValue)
            throw new ArgumentException("Key不能为空");

        var id = request.Key.Value.ToString();
        var rule = await _ruleService.UpdateRuleAsync(id, request);
        return Success(rule);
    }

    /// <summary>
    /// 删除规则
    /// </summary>
    /// <param name="request">删除规则请求</param>
    /// <returns>删除结果</returns>
    [HttpDelete]
    public async Task<IActionResult> DeleteRule([FromBody] DeleteRuleRequest request)
    {
        if (!request.Key.HasValue)
            throw new ArgumentException("Key不能为空");

        var deleted = await _ruleService.DeleteRulesAsync(new List<int> { request.Key.Value });
        return Success(true);
    }
}