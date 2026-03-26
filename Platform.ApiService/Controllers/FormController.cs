using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Services;
using System.Linq.Expressions;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 表单管理控制器
/// </summary>
[ApiController]
[Route("api/forms")]
public class FormController : BaseApiController
{
    private readonly DbContext _context;

    /// <summary>
    /// 初始化表单管理控制器
    /// </summary>
    public FormController(DbContext context)
    {
        _context = context;
        
    }

    /// <summary>
    /// 获取表单列表（支持分页、关键词和状态筛选）
    /// </summary>
    /// <param name="current">页码</param>
    /// <param name="pageSize">每页大小</param>
    /// <param name="keyword">搜索关键词</param>
    /// <param name="isActive">是否启用</param>
    /// <returns>分页列表结果</returns>
    [HttpGet]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetForms([FromQuery] int current = 1, [FromQuery] int pageSize = 10, [FromQuery] string? keyword = null, [FromQuery] bool? isActive = null)
    {
        try
        {
            Expression<Func<FormDefinition, bool>>? filter = null;

            if (!string.IsNullOrEmpty(keyword))
            {
                filter = f => f.Name != null && f.Name.Contains(keyword);
            }

            if (isActive.HasValue)
            {
                var isActiveValue = isActive.Value;
                filter = filter == null 
                    ? f => f.IsActive == isActiveValue 
                    : f => (filter.Compile()(f) && f.IsActive == isActiveValue);
            }

            var orderBy = (IQueryable<FormDefinition> query) => query.OrderByDescending(f => f.CreatedAt);

            var __fpQ = filter == null ? _context.Set<FormDefinition>() : _context.Set<FormDefinition>().Where(filter);
        var total = await __fpQ.LongCountAsync();
        var items = await orderBy(__fpQ).Skip((current - 1) * pageSize).Take(pageSize).ToListAsync();
            return SuccessPaged(items, total, current, pageSize);
        }
        catch (Exception ex)
        {
            return Error("GET_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 获取指定 IDs 的表单详情
    /// </summary>
    /// <param name="id">对象标识</param>
    /// <returns>表单对象</returns>
    [HttpGet("{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetForm(string id)
    {
        try
        {
            var form = await _context.Set<FormDefinition>().FirstOrDefaultAsync(x => x.Id == id);
            if (form == null)
            {
                return NotFoundError("表单定义", id);
            }

            return Success(form);
        }
        catch (Exception ex)
        {
            return Error("GET_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 创建表单定义
    /// </summary>
    /// <param name="form">表单对象主体</param>
    /// <returns>创建后的对象</returns>
    [HttpPost]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> CreateForm([FromBody] FormDefinition form)
    {
        try
        {
            if (string.IsNullOrEmpty(form.Name))
            {
                return ValidationError("表单名称不能为空");
            }

            form.Key = string.IsNullOrWhiteSpace(form.Key) ? $"form_{Guid.NewGuid():N}" : form.Key;

            await _context.Set<FormDefinition>().AddAsync(form);
        await _context.SaveChangesAsync();
            return Success(form);
        }
        catch (Exception ex)
        {
            return Error("CREATE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 更新表单定义
    /// </summary>
    /// <param name="id">对象标识</param>
    /// <param name="form">带有更新内容的表单对象</param>
    /// <returns>更新后的对象</returns>
    [HttpPut("{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> UpdateForm(string id, [FromBody] FormDefinition form)
    {
        try
        {
            var existing = await _context.Set<FormDefinition>().FirstOrDefaultAsync(x => x.Id == id);
            if (existing == null)
            {
                return NotFoundError("表单定义", id);
            }

            var __entity = await _context.Set<FormDefinition>().FirstOrDefaultAsync(x => x.Id == id);
        if (__entity != null)
        {
    
                __entity.Name = form.Name;
                __entity.Description = form.Description;
                __entity.Fields = form.Fields;
                __entity.IsActive = form.IsActive;
                __entity.Version = form.Version;
            await _context.SaveChangesAsync();
        }


            var updated = await _context.Set<FormDefinition>().FirstOrDefaultAsync(x => x.Id == id);
            return Success(updated);
        }
        catch (Exception ex)
        {
            return Error("UPDATE_FAILED", ex.Message);
        }
    }

    /// <summary>
    /// 删除表单定义
    /// </summary>
    /// <param name="id">对象标识</param>
    /// <returns>操作结果</returns>
    [HttpDelete("{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> DeleteForm(string id)
    {
        try
        {
            var __sdE = await _context.Set<FormDefinition>().FirstOrDefaultAsync(x => x.Id == id);
        if (__sdE != null) { __sdE.IsDeleted = true; await _context.SaveChangesAsync(); }
        var result = __sdE != null;
            if (!result)
            {
                return NotFoundError("表单定义", id);
            }

            return Success("表单定义已删除");
        }
        catch (Exception ex)
        {
            return Error("DELETE_FAILED", ex.Message);
        }
    }
}