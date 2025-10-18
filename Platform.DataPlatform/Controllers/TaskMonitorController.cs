using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.DataPlatform.Models;
using Platform.DataPlatform.Services;

namespace Platform.DataPlatform.Controllers;

/// <summary>
/// 任务监控控制器
/// </summary>
[ApiController]
[Route("dataplatform/[controller]")]
[Authorize]
public class TaskMonitorController : ControllerBase
{
    private readonly ITaskMonitorService _monitorService;

    public TaskMonitorController(ITaskMonitorService monitorService)
    {
        _monitorService = monitorService;
    }

    /// <summary>
    /// 获取任务执行列表
    /// </summary>
    [HttpGet("tasks")]
    public async Task<IActionResult> GetTaskExecutions([FromQuery] int limit = 50)
    {
        try
        {
            var tasks = await _monitorService.GetTaskExecutionsAsync(limit);
            return Ok(new { success = true, data = tasks });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 根据ID获取任务执行记录
    /// </summary>
    [HttpGet("tasks/{id}")]
    public async Task<IActionResult> GetTaskExecutionById(string id)
    {
        try
        {
            var task = await _monitorService.GetTaskExecutionByIdAsync(id);
            if (task == null)
            {
                return NotFound(new { success = false, message = "任务执行记录不存在" });
            }

            return Ok(new { success = true, data = task });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 创建任务执行记录
    /// </summary>
    [HttpPost("tasks")]
    public async Task<IActionResult> CreateTaskExecution([FromBody] TaskExecution taskExecution)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "请求参数无效", errors = ModelState });
            }

            var createdTask = await _monitorService.CreateTaskExecutionAsync(taskExecution);
            return Ok(new { success = true, data = createdTask, message = "创建成功" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 更新任务执行状态
    /// </summary>
    [HttpPut("tasks/{id}/status")]
    public async Task<IActionResult> UpdateTaskStatus(
        string id, 
        [FromBody] UpdateTaskStatusRequest request)
    {
        try
        {
            var success = await _monitorService.UpdateTaskStatusAsync(
                id, 
                request.Status, 
                request.Progress, 
                request.ErrorMessage);

            if (!success)
            {
                return NotFound(new { success = false, message = "任务执行记录不存在或更新失败" });
            }

            return Ok(new { success = true, message = "状态更新成功" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 完成任务执行
    /// </summary>
    [HttpPost("tasks/{id}/complete")]
    public async Task<IActionResult> CompleteTaskExecution(
        string id, 
        [FromBody] CompleteTaskRequest? request = null)
    {
        try
        {
            var success = await _monitorService.CompleteTaskExecutionAsync(id, request?.Result);
            if (!success)
            {
                return NotFound(new { success = false, message = "任务执行记录不存在或完成失败" });
            }

            return Ok(new { success = true, message = "任务完成成功" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 获取系统监控指标
    /// </summary>
    [HttpGet("metrics")]
    public async Task<IActionResult> GetSystemMetrics()
    {
        try
        {
            var metrics = await _monitorService.GetSystemMetricsAsync();
            return Ok(new { success = true, data = metrics });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 获取监控指标历史
    /// </summary>
    [HttpGet("metrics/history")]
    public async Task<IActionResult> GetMetricsHistory(
        [FromQuery] DateTime from, 
        [FromQuery] DateTime to)
    {
        try
        {
            if (from >= to)
            {
                return BadRequest(new { success = false, message = "开始时间必须小于结束时间" });
            }

            var history = await _monitorService.GetMetricsHistoryAsync(from, to);
            return Ok(new { success = true, data = history });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 获取任务统计信息
    /// </summary>
    [HttpGet("statistics")]
    public async Task<IActionResult> GetTaskStatistics()
    {
        try
        {
            var statistics = await _monitorService.GetTaskStatisticsAsync();
            return Ok(new { success = true, data = statistics });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 获取告警规则列表
    /// </summary>
    [HttpGet("alert-rules")]
    public async Task<IActionResult> GetAlertRules()
    {
        try
        {
            var rules = await _monitorService.GetAlertRulesAsync();
            return Ok(new { success = true, data = rules });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 创建告警规则
    /// </summary>
    [HttpPost("alert-rules")]
    public async Task<IActionResult> CreateAlertRule([FromBody] AlertRule rule)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "请求参数无效", errors = ModelState });
            }

            var createdRule = await _monitorService.CreateAlertRuleAsync(rule);
            return Ok(new { success = true, data = createdRule, message = "创建成功" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 更新告警规则
    /// </summary>
    [HttpPut("alert-rules/{id}")]
    public async Task<IActionResult> UpdateAlertRule(string id, [FromBody] AlertRule rule)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "请求参数无效", errors = ModelState });
            }

            var success = await _monitorService.UpdateAlertRuleAsync(id, rule);
            if (!success)
            {
                return NotFound(new { success = false, message = "告警规则不存在或更新失败" });
            }

            return Ok(new { success = true, message = "更新成功" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 删除告警规则
    /// </summary>
    [HttpDelete("alert-rules/{id}")]
    public async Task<IActionResult> DeleteAlertRule(string id)
    {
        try
        {
            var success = await _monitorService.DeleteAlertRuleAsync(id);
            if (!success)
            {
                return NotFound(new { success = false, message = "告警规则不存在或删除失败" });
            }

            return Ok(new { success = true, message = "删除成功" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 获取活跃告警
    /// </summary>
    [HttpGet("alerts/active")]
    public async Task<IActionResult> GetActiveAlerts()
    {
        try
        {
            var alerts = await _monitorService.GetActiveAlertsAsync();
            return Ok(new { success = true, data = alerts });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 获取告警历史
    /// </summary>
    [HttpGet("alerts/history")]
    public async Task<IActionResult> GetAlertHistory(
        [FromQuery] DateTime from, 
        [FromQuery] DateTime to)
    {
        try
        {
            if (from >= to)
            {
                return BadRequest(new { success = false, message = "开始时间必须小于结束时间" });
            }

            var history = await _monitorService.GetAlertHistoryAsync(from, to);
            return Ok(new { success = true, data = history });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 确认告警
    /// </summary>
    [HttpPost("alerts/{id}/acknowledge")]
    public async Task<IActionResult> AcknowledgeAlert(string id, [FromBody] AcknowledgeAlertRequest request)
    {
        try
        {
            var success = await _monitorService.AcknowledgeAlertAsync(id, request.AcknowledgedBy);
            if (!success)
            {
                return NotFound(new { success = false, message = "告警不存在或确认失败" });
            }

            return Ok(new { success = true, message = "告警确认成功" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 解决告警
    /// </summary>
    [HttpPost("alerts/{id}/resolve")]
    public async Task<IActionResult> ResolveAlert(string id, [FromBody] ResolveAlertRequest request)
    {
        try
        {
            var success = await _monitorService.ResolveAlertAsync(id, request.ResolvedBy);
            if (!success)
            {
                return NotFound(new { success = false, message = "告警不存在或解决失败" });
            }

            return Ok(new { success = true, message = "告警解决成功" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 检查告警条件
    /// </summary>
    [HttpPost("alerts/check")]
    public async Task<IActionResult> CheckAlertConditions()
    {
        try
        {
            await _monitorService.CheckAlertConditionsAsync();
            return Ok(new { success = true, message = "告警检查完成" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}

/// <summary>
/// 更新任务状态请求
/// </summary>
public class UpdateTaskStatusRequest
{
    public Models.TaskStatus Status { get; set; }
    public double? Progress { get; set; }
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// 完成任务请求
/// </summary>
public class CompleteTaskRequest
{
    public Dictionary<string, object>? Result { get; set; }
}

/// <summary>
/// 确认告警请求
/// </summary>
public class AcknowledgeAlertRequest
{
    [System.ComponentModel.DataAnnotations.Required]
    public string AcknowledgedBy { get; set; } = string.Empty;
}

/// <summary>
/// 解决告警请求
/// </summary>
public class ResolveAlertRequest
{
    [System.ComponentModel.DataAnnotations.Required]
    public string ResolvedBy { get; set; } = string.Empty;
}
