using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Controllers;

#pragma warning disable CS1591
namespace Platform.ApiService.Controllers;

/// <summary>
/// AI 智能体管理与执行控制器
/// </summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AiAgentController : BaseApiController
{
    private readonly IAiAgentService _agentService;

    /// <summary>
    /// 初始化智能体控制器
    /// </summary>
    public AiAgentController(IAiAgentService agentService)
    {
        _agentService = agentService;
    }

    /// <summary>
    /// 获取所有智能体列表
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<AiAgent>>> GetAgents()
    {
        var agents = await _agentService.GetAgentsAsync();
        return Ok(agents);
    }

    /// <summary>
    /// 获取指定的智能体详情
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<AiAgent>> GetAgent(string id)
    {
        var agent = await _agentService.GetAgentByIdAsync(id);
        if (agent == null) return NotFound("未找到智能体");
        return Ok(agent);
    }

    /// <summary>
    /// 创建新的智能体
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<AiAgent>> CreateAgent(AiAgent agent)
    {
        var created = await _agentService.CreateAgentAsync(agent);
        return CreatedAtAction(nameof(GetAgent), new { id = created.Id }, created);
    }

    /// <summary>
    /// 更新现有的智能体配置
    /// </summary>
    [HttpPut("{id}")]
    public async Task<ActionResult<AiAgent>> UpdateAgent(string id, AiAgent agent)
    {
        if (id != agent.Id) return BadRequest("ID 不匹配");
        var updated = await _agentService.UpdateAgentAsync(agent);
        return Ok(updated);
    }

    /// <summary>
    /// 删除智能体
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAgent(string id)
    {
        await _agentService.DeleteAgentAsync(id);
        return NoContent();
    }

    /// <summary>
    /// 为指定智能体启动一个异步执行任务
    /// </summary>
    /// <param name="id">智能体 ID</param>
    /// <param name="goal">执行目标/指令</param>
    [HttpPost("{id}/run")]
    public async Task<ActionResult<AiAgentRun>> StartRun(string id, [FromBody] string goal)
    {
        var run = await _agentService.CreateRunAsync(id, goal);
        await _agentService.StartAgentRunAsync(run.Id);
        return Ok(run);
    }

    /// <summary>
    /// 获取特定的执行运行记录详情
    /// </summary>
    [HttpGet("runs/{runId}")]
    public async Task<ActionResult<AiAgentRun>> GetRun(string runId)
    {
        var run = await _agentService.GetRunByIdAsync(runId);
        if (run == null) return NotFound("未找到运行记录");
        return Ok(run);
    }

    /// <summary>
    /// 获取指定智能体的所有执行历史
    /// </summary>
    [HttpGet("{id}/runs")]
    public async Task<ActionResult<List<AiAgentRun>>> GetAgentRuns(string id)
    {
        var runs = await _agentService.GetAgentRunsAsync(id);
        return Ok(runs);
    }
}

