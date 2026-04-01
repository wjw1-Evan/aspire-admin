using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 知识库管理控制器
/// </summary>
[ApiController]
[Route("api/workflow/knowledge-bases")]
public class KnowledgeBaseController : BaseApiController
{
    private readonly IKnowledgeService _knowledgeService;
    private readonly ILogger<KnowledgeBaseController> _logger;

    public KnowledgeBaseController(IKnowledgeService knowledgeService, ILogger<KnowledgeBaseController> logger)
    {
        _knowledgeService = knowledgeService;
        _logger = logger;
    }

    /// <summary>
    /// 获取知识库列表
    /// </summary>
    [HttpGet]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetKnowledgeBases([FromQuery] int current = 1, [FromQuery] int pageSize = 10, [FromQuery] string? keyword = null)
    {
        try
        {
            var pagedResult = await _knowledgeService.GetKnowledgeBasesAsync(current, pageSize, keyword);
            return Success(pagedResult);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取知识库列表失败");
            return Fail(ex.Message);
        }
    }

    /// <summary>
    /// 获取知识库详情
    /// </summary>
    [HttpGet("{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetKnowledgeBase(string id)
    {
        try
        {
            var kb = await _knowledgeService.GetByIdAsync(id);
            if (kb == null) return Fail("知识库 {id} 不存在");
            return Success(kb);
        }
        catch (Exception ex)
        {
            return Fail(ex.Message);
        }
    }

    /// <summary>
    /// 创建知识库
    /// </summary>
    [HttpPost]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> CreateKnowledgeBase([FromBody] KnowledgeBase knowledgeBase)
    {
        try
        {
            if (string.IsNullOrEmpty(knowledgeBase.Name)) return Fail("名称不能为空");
            
            var created = await _knowledgeService.CreateAsync(knowledgeBase);
            return Success(created);
        }
        catch (Exception ex)
        {
            return Fail(ex.Message);
        }
    }

    /// <summary>
    /// 更新知识库
    /// </summary>
    [HttpPut("{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> UpdateKnowledgeBase(string id, [FromBody] KnowledgeBase request)
    {
        try
        {
            var updated = await _knowledgeService.UpdateAsync(id, kb =>
            {
                if (!string.IsNullOrEmpty(request.Name)) kb.Name = request.Name;
                if (request.Description != null) kb.Description = request.Description;
                if (!string.IsNullOrEmpty(request.Category)) kb.Category = request.Category;
                kb.IsActive = request.IsActive;
            });

            if (updated == null) return Fail("知识库 {id} 不存在");
            return Success(updated);
        }
        catch (Exception ex)
        {
            return Fail(ex.Message);
        }
    }

    /// <summary>
    /// 删除知识库
    /// </summary>
    [HttpDelete("{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> DeleteKnowledgeBase(string id)
    {
        try
        {
            var result = await _knowledgeService.DeleteAsync(id);
            if (!result) return Fail("知识库 {id} 不存在");
            return Success(null, "删除成功");
        }
        catch (Exception ex)
        {
            return Fail(ex.Message);
        }
    }
}