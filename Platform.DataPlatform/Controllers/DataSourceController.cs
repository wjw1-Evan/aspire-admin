using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.DataPlatform.Models;
using Platform.DataPlatform.Services;

namespace Platform.DataPlatform.Controllers;

/// <summary>
/// 数据源管理控制器
/// </summary>
[ApiController]
[Route("dataplatform/[controller]")]
[Authorize]
public class DataSourceController : ControllerBase
{
    private readonly IDataSourceService _dataSourceService;

    public DataSourceController(IDataSourceService dataSourceService)
    {
        _dataSourceService = dataSourceService;
    }

    /// <summary>
    /// 获取所有数据源
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var dataSources = await _dataSourceService.GetAllAsync();
        return Ok(new { success = true, data = dataSources });
    }

    /// <summary>
    /// 根据ID获取数据源
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var dataSource = await _dataSourceService.GetByIdAsync(id);
        if (dataSource == null)
        {
            return NotFound(new { success = false, message = "数据源不存在" });
        }

        return Ok(new { success = true, data = dataSource });
    }

    /// <summary>
    /// 创建数据源
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDataSourceRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, message = "请求参数无效", errors = ModelState });
        }

        try
        {
            var dataSource = await _dataSourceService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = dataSource.Id }, 
                new { success = true, data = dataSource, message = "创建成功" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 更新数据源
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] CreateDataSourceRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, message = "请求参数无效", errors = ModelState });
        }

        try
        {
            var success = await _dataSourceService.UpdateAsync(id, request);
            if (!success)
            {
                return NotFound(new { success = false, message = "数据源不存在" });
            }

            return Ok(new { success = true, message = "更新成功" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 删除数据源
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        try
        {
            var success = await _dataSourceService.DeleteAsync(id);
            if (!success)
            {
                return NotFound(new { success = false, message = "数据源不存在" });
            }

            return Ok(new { success = true, message = "删除成功" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 测试数据源连接
    /// </summary>
    [HttpPost("test")]
    public async Task<IActionResult> TestConnection([FromBody] TestDataSourceRequest request)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(new { success = false, message = "请求参数无效", errors = ModelState });
        }

        try
        {
            var result = await _dataSourceService.TestConnectionAsync(request);
            return Ok(new { success = true, data = result });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 测试指定数据源连接
    /// </summary>
    [HttpPost("{id}/test")]
    public async Task<IActionResult> TestConnection(string id)
    {
        try
        {
            var result = await _dataSourceService.TestConnectionAsync(id);
            return Ok(new { success = true, data = result });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    /// <summary>
    /// 获取数据源的表列表
    /// </summary>
    [HttpGet("{id}/tables")]
    public async Task<IActionResult> GetTables(string id)
    {
        try
        {
            var tables = await _dataSourceService.GetTablesAsync(id);
            return Ok(new { success = true, data = tables });
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
    /// 获取表的架构信息
    /// </summary>
    [HttpGet("{id}/tables/{tableName}/schema")]
    public async Task<IActionResult> GetSchema(string id, string tableName)
    {
        try
        {
            var schema = await _dataSourceService.GetSchemaAsync(id, tableName);
            return Ok(new { success = true, data = schema });
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
    /// 获取表的数据
    /// </summary>
    [HttpGet("{id}/tables/{tableName}/data")]
    public async Task<IActionResult> GetData(string id, string tableName, [FromQuery] int limit = 1000)
    {
        try
        {
            var data = await _dataSourceService.GetDataAsync(id, tableName, limit);
            return Ok(new { success = true, data = data, count = data.Count });
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
}