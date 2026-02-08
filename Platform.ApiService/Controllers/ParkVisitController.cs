using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 园区走访管理控制器
/// </summary>
[Authorize]
[ApiController]
[Route("api/park-management/visit")]
public class ParkVisitController : BaseApiController
{
    private readonly IParkVisitService _visitService;

    /// <summary>
    /// 初始化走访管理控制器
    /// </summary>
    public ParkVisitController(IParkVisitService visitService)
    {
        _visitService = visitService;
    }

    #region 走访任务

    /// <summary>
    /// 获取走访任务列表
    /// </summary>
    [HttpGet("tasks")]
    [RequireMenu("park-management-visit-task")]
    public async Task<IActionResult> GetTasks([FromQuery] VisitTaskListRequest request)
    {
        var result = await _visitService.GetVisitTasksAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 获取走访任务详情
    /// </summary>
    [HttpGet("task/{id}")]
    [RequireMenu("park-management-visit-task")]
    public async Task<IActionResult> GetTask(string id)
    {
        var result = await _visitService.GetVisitTaskByIdAsync(id);
        return result != null ? Success(result) : NotFound();
    }

    /// <summary>
    /// 创建走访任务
    /// </summary>
    [HttpPost("task")]
    [RequireMenu("park-management-visit-task")]
    public async Task<IActionResult> CreateTask([FromBody] CreateVisitTaskRequest request)
    {
        var result = await _visitService.CreateVisitTaskAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 更新走访任务
    /// </summary>
    [HttpPut("task/{id}")]
    [RequireMenu("park-management-visit-task")]
    public async Task<IActionResult> UpdateTask(string id, [FromBody] CreateVisitTaskRequest request)
    {
        var result = await _visitService.UpdateVisitTaskAsync(id, request);
        return result != null ? Success(result) : NotFound();
    }

    /// <summary>
    /// 删除走访任务
    /// </summary>
    [HttpDelete("task/{id}")]
    [RequireMenu("park-management-visit-task")]
    public async Task<IActionResult> DeleteTask(string id)
    {
        var result = await _visitService.DeleteVisitTaskAsync(id);
        return Success(result);
    }

    /// <summary>
    /// 派发走访任务
    /// </summary>
    [HttpPost("task/{id}/dispatch")]
    [RequireMenu("park-management-visit-task")]
    public async Task<IActionResult> DispatchTask(string id)
    {
        var result = await _visitService.DispatchVisitTaskAsync(id);
        return result != null ? Success(result) : NotFound();
    }

    #endregion

    #region 走访考核

    /// <summary>
    /// 获取走访考核列表
    /// </summary>
    [HttpGet("assessments")]
    [RequireMenu("park-management-visit-assessment")]
    public async Task<IActionResult> GetAssessments([FromQuery] VisitAssessmentListRequest request)
    {
        var result = await _visitService.GetVisitAssessmentsAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 创建走访考核
    /// </summary>
    [HttpPost("assessment")]
    [RequireMenu("park-management-visit-assessment")]
    public async Task<IActionResult> CreateAssessment([FromBody] VisitAssessmentDto request)
    {
        var result = await _visitService.CreateVisitAssessmentAsync(request);
        return Success(result);
    }

    #endregion

    #region 走访知识库

    /// <summary>
    /// 获取走访知识库问题列表
    /// </summary>
    [HttpGet("questions")]
    [RequireMenu("park-management-visit-knowledge-base")]
    public async Task<IActionResult> GetQuestions([FromQuery] VisitQuestionListRequest request)
    {
        var result = await _visitService.GetVisitQuestionsAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 创建问题
    /// </summary>
    [HttpPost("question")]
    [RequireMenu("park-management-visit-knowledge-base")]
    public async Task<IActionResult> CreateQuestion([FromBody] VisitQuestionDto request)
    {
        var result = await _visitService.CreateVisitQuestionAsync(request);
        return Success(result);
    }

    /// <summary>
    /// 更新问题
    /// </summary>
    [HttpPut("question/{id}")]
    [RequireMenu("park-management-visit-knowledge-base")]
    public async Task<IActionResult> UpdateQuestion(string id, [FromBody] VisitQuestionDto request)
    {
        var result = await _visitService.UpdateVisitQuestionAsync(id, request);
        return result != null ? Success(result) : NotFound();
    }

    /// <summary>
    /// 删除问题
    /// </summary>
    [HttpDelete("question/{id}")]
    [RequireMenu("park-management-visit-knowledge-base")]
    public async Task<IActionResult> DeleteQuestion(string id)
    {
        var result = await _visitService.DeleteVisitQuestionAsync(id);
        return Success(result);
    }

    /// <summary>
    /// 获取问卷列表
    /// </summary>
    [HttpGet("questionnaires")]
    [RequireMenu("park-management-visit-knowledge-base")]
    public async Task<IActionResult> GetQuestionnaires()
    {
        var result = await _visitService.GetVisitQuestionnairesAsync();
        return Success(result);
    }

    /// <summary>
    /// 创建问卷
    /// </summary>
    [HttpPost("questionnaire")]
    [RequireMenu("park-management-visit-knowledge-base")]
    public async Task<IActionResult> CreateQuestionnaire([FromBody] VisitQuestionnaireDto request)
    {
        var result = await _visitService.CreateVisitQuestionnaireAsync(request);
        return Success(result);
    }

    #endregion

    #region 统计

    /// <summary>
    /// 获取走访管理统计数据
    /// 只要拥有走访任务、考核或知识库中任意一个菜单权限即可访问
    /// </summary>
    [HttpGet("statistics")]
    [RequireMenu("park-management-visit-task", "park-management-visit-assessment", "park-management-visit-knowledge-base")]
    public async Task<IActionResult> GetStatistics()
    {
        var result = await _visitService.GetVisitStatisticsAsync();
        return Success(result);
    }

    #endregion
}
