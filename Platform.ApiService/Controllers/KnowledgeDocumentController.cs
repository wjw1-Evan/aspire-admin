using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models.Workflow;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using System;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 知识库文档管理控制器
/// </summary>
[ApiController]
[Route("api/workflow/knowledge-bases/{knowledgeBaseId}/documents")]
public class KnowledgeDocumentController : BaseApiController
{
    private readonly IKnowledgeDocumentService _documentService;
    private readonly IKnowledgeService _knowledgeService;
    private readonly ILogger<KnowledgeDocumentController> _logger;

    public KnowledgeDocumentController(
        IKnowledgeDocumentService documentService,
        IKnowledgeService knowledgeService,
        ILogger<KnowledgeDocumentController> logger)
    {
        _documentService = documentService;
        _knowledgeService = knowledgeService;
        _logger = logger;
    }

    /// <summary>
    /// 分页获取知识库文档列表
    /// </summary>
    [HttpGet]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetDocuments(
        string knowledgeBaseId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? keyword = null)
    {
        try
        {
            if (page < 1 || page > 10000) return Fail("page 必须在 1-10000 之间");
            if (pageSize < 1 || pageSize > 100) return Fail("pageSize 必须在 1-100 之间");

            var kb = await _knowledgeService.GetByIdAsync(knowledgeBaseId);
            if (kb == null) return Fail("知识库 {knowledgeBaseId} 不存在");

            var pagedResult = await _documentService.GetDocumentsAsync(knowledgeBaseId, page, pageSize, keyword);
            return Success(pagedResult);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取知识库文档列表失败");
            return Fail(ex.Message);
        }
    }

    /// <summary>
    /// 获取文档详情
    /// </summary>
    [HttpGet("{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> GetDocument(string knowledgeBaseId, string id)
    {
        try
        {
            var doc = await _documentService.GetByIdAsync(id);
            if (doc == null) return Fail("文档 {id} 不存在");
            if (doc.KnowledgeBaseId != knowledgeBaseId) return Fail("文档 {id} 不存在");
            return Success(doc);
        }
        catch (Exception ex)
        {
            return Fail(ex.Message);
        }
    }

    /// <summary>
    /// 创建文档
    /// </summary>
    [HttpPost]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> CreateDocument(string knowledgeBaseId, [FromBody] KnowledgeDocumentCreateRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Title)) return Fail("标题不能为空");
            if (string.IsNullOrWhiteSpace(request.Content)) return Fail("内容不能为空");

            var kb = await _knowledgeService.GetByIdAsync(knowledgeBaseId);
            if (kb == null) return Fail("知识库 {knowledgeBaseId} 不存在");

            var doc = new KnowledgeDocument
            {
                KnowledgeBaseId = knowledgeBaseId,
                Title = request.Title.Trim(),
                Content = request.Content.Trim(),
                Summary = string.IsNullOrWhiteSpace(request.Summary) ? null : request.Summary.Trim(),
                SortOrder = request.SortOrder ?? 0,
            };

            var created = await _documentService.CreateAsync(doc);
            return Success(created);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建知识库文档失败");
            return Fail(ex.Message);
        }
    }

    /// <summary>
    /// 更新文档
    /// </summary>
    [HttpPut("{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> UpdateDocument(string knowledgeBaseId, string id, [FromBody] KnowledgeDocumentUpdateRequest request)
    {
        try
        {
            var doc = await _documentService.GetByIdAsync(id);
            if (doc == null) return Fail("文档 {id} 不存在");
            if (doc.KnowledgeBaseId != knowledgeBaseId) return Fail("文档 {id} 不存在");

            var updated = await _documentService.UpdateAsync(id, d =>
            {
                if (!string.IsNullOrWhiteSpace(request.Title)) d.Title = request.Title.Trim();
                if (request.Content != null) d.Content = request.Content.Trim();
                if (request.Summary != null) d.Summary = string.IsNullOrWhiteSpace(request.Summary) ? null : request.Summary.Trim();
                if (request.SortOrder.HasValue) d.SortOrder = request.SortOrder.Value;
            });

            if (updated == null) return Fail("文档 {id} 不存在");
            return Success(updated);
        }
        catch (Exception ex)
        {
            return Fail(ex.Message);
        }
    }

    /// <summary>
    /// 删除文档
    /// </summary>
    [HttpDelete("{id}")]
    [RequireMenu("workflow-list")]
    public async Task<IActionResult> DeleteDocument(string knowledgeBaseId, string id)
    {
        try
        {
            var doc = await _documentService.GetByIdAsync(id);
            if (doc == null) return Fail("文档 {id} 不存在");
            if (doc.KnowledgeBaseId != knowledgeBaseId) return Fail("文档 {id} 不存在");

            var result = await _documentService.DeleteAsync(id);
            if (!result) return Fail("文档 {id} 不存在");
            return Success(null, "删除成功");
        }
        catch (Exception ex)
        {
            return Fail(ex.Message);
        }
    }
}
