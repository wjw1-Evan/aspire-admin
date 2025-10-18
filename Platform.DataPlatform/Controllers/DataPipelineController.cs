using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.DataPlatform.Models;
using Platform.DataPlatform.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.DataPlatform.Controllers;

/// <summary>
/// 数据管道控制器
/// </summary>
[ApiController]
[Route("dataplatform/[controller]")]
[Authorize]
public class DataPipelineController : BaseApiController
{
    private readonly IDataPipelineService _pipelineService;

    public DataPipelineController(IDataPipelineService pipelineService)
    {
        _pipelineService = pipelineService;
    }

    /// <summary>
    /// 获取数据管道列表
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        try
        {
            var pipelines = await _pipelineService.GetAllAsync();
            return Ok(new { success = true, data = pipelines });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 根据ID获取数据管道
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        try
        {
            var pipeline = await _pipelineService.GetByIdAsync(id);
            if (pipeline == null)
            {
                return NotFound(new { success = false, message = "数据管道不存在" });
            }

            return Ok(new { success = true, data = pipeline });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 创建数据管道
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDataPipelineRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "请求参数无效", errors = ModelState });
            }

            // 验证配置
            var isValid = await _pipelineService.ValidateConfigurationAsync(request);
            if (!isValid)
            {
                return BadRequest(new { success = false, message = "管道配置无效" });
            }

            var pipeline = await _pipelineService.CreateAsync(request);
            return Ok(new { success = true, data = pipeline, message = "创建成功" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 更新数据管道
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateDataPipelineRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "请求参数无效", errors = ModelState });
            }

            request.Id = id;

            // 验证配置
            var isValid = await _pipelineService.ValidateConfigurationAsync(request);
            if (!isValid)
            {
                return BadRequest(new { success = false, message = "管道配置无效" });
            }

            var success = await _pipelineService.UpdateAsync(id, request);
            if (!success)
            {
                return NotFound(new { success = false, message = "数据管道不存在或更新失败" });
            }

            return Ok(new { success = true, message = "更新成功" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 删除数据管道
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        try
        {
            var success = await _pipelineService.DeleteAsync(id);
            if (!success)
            {
                return NotFound(new { success = false, message = "数据管道不存在或删除失败" });
            }

            return Ok(new { success = true, message = "删除成功" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 执行数据管道
    /// </summary>
    [HttpPost("{id}/execute")]
    public async Task<IActionResult> Execute(string id, [FromBody] ExecutePipelineRequest? request = null)
    {
        try
        {
            if (request == null)
            {
                request = new ExecutePipelineRequest { PipelineId = id };
            }
            else
            {
                request.PipelineId = id;
            }

            var result = await _pipelineService.ExecuteAsync(id, request);
            return Ok(new { success = true, data = result, message = "执行完成" });
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
    /// 暂停数据管道
    /// </summary>
    [HttpPost("{id}/pause")]
    public async Task<IActionResult> Pause(string id)
    {
        try
        {
            var success = await _pipelineService.PauseAsync(id);
            if (!success)
            {
                return NotFound(new { success = false, message = "数据管道不存在或暂停失败" });
            }

            return Ok(new { success = true, message = "暂停成功" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 恢复数据管道
    /// </summary>
    [HttpPost("{id}/resume")]
    public async Task<IActionResult> Resume(string id)
    {
        try
        {
            var success = await _pipelineService.ResumeAsync(id);
            if (!success)
            {
                return NotFound(new { success = false, message = "数据管道不存在或恢复失败" });
            }

            return Ok(new { success = true, message = "恢复成功" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 获取管道执行历史
    /// </summary>
    [HttpGet("{id}/executions")]
    public async Task<IActionResult> GetExecutionHistory(string id, [FromQuery] int limit = 10)
    {
        try
        {
            var history = await _pipelineService.GetExecutionHistoryAsync(id, limit);
            return Ok(new { success = true, data = history });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 获取管道统计信息
    /// </summary>
    [HttpGet("{id}/statistics")]
    public async Task<IActionResult> GetStatistics(string id)
    {
        try
        {
            var statistics = await _pipelineService.GetStatisticsAsync(id);
            return Ok(new { success = true, data = statistics });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 验证管道配置
    /// </summary>
    [HttpPost("validate")]
    public async Task<IActionResult> ValidateConfiguration([FromBody] CreateDataPipelineRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new { success = false, message = "请求参数无效", errors = ModelState });
            }

            var isValid = await _pipelineService.ValidateConfigurationAsync(request);
            return Ok(new { success = true, data = new { isValid }, message = isValid ? "配置有效" : "配置无效" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}