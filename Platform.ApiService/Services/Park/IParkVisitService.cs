using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

/// <summary>
/// 园区走访管理服务接口
/// </summary>
public interface IParkVisitService
{
    #region 走访任务

    /// <summary>
    /// 获取走访任务列表
    /// </summary>
    Task<VisitTaskListResponse> GetVisitTasksAsync(VisitTaskListRequest request);

    /// <summary>
    /// 根据ID获取走访任务详情
    /// </summary>
    Task<VisitTaskDto?> GetVisitTaskByIdAsync(string id);

    /// <summary>
    /// 创建走访任务
    /// </summary>
    Task<VisitTaskDto> CreateVisitTaskAsync(CreateVisitTaskRequest request);

    /// <summary>
    /// 更新走访任务
    /// </summary>
    Task<VisitTaskDto?> UpdateVisitTaskAsync(string id, CreateVisitTaskRequest request);

    /// <summary>
    /// 删除走访任务
    /// </summary>
    Task<bool> DeleteVisitTaskAsync(string id);



    #endregion

    #region 走访考核

    /// <summary>
    /// 获取走访考核列表
    /// </summary>
    Task<VisitAssessmentListResponse> GetVisitAssessmentsAsync(VisitAssessmentListRequest request);

    /// <summary>
    /// 创建走访考核
    /// </summary>
    Task<VisitAssessmentDto> CreateVisitAssessmentAsync(VisitAssessmentDto request);

    #endregion

    #region 走访知识库

    /// <summary>
    /// 获取走访知识库问题列表
    /// </summary>
    Task<VisitQuestionListResponse> GetVisitQuestionsAsync(VisitQuestionListRequest request);

    /// <summary>
    /// 根据分类获取走访问题
    /// </summary>
    Task<List<VisitQuestionDto>> GetVisitQuestionsByCategoryAsync(string category);

    /// <summary>
    /// 创建走访问题
    /// </summary>
    Task<VisitQuestionDto> CreateVisitQuestionAsync(VisitQuestionDto request);

    /// <summary>
    /// 更新走访问题
    /// </summary>
    Task<VisitQuestionDto?> UpdateVisitQuestionAsync(string id, VisitQuestionDto request);

    /// <summary>
    /// 删除走访问题
    /// </summary>
    Task<bool> DeleteVisitQuestionAsync(string id);

    /// <summary>
    /// 获取走访问卷模板
    /// </summary>
    Task<VisitQuestionnaireListResponse> GetVisitQuestionnairesAsync();

    /// <summary>
    /// 创建走访问卷模板
    /// </summary>
    Task<VisitQuestionnaireDto> CreateVisitQuestionnaireAsync(VisitQuestionnaireDto request);

    /// <summary>
    /// 获取走访统计数据
    /// </summary>
    Task<VisitStatisticsDto> GetVisitStatisticsAsync(StatisticsPeriod period = StatisticsPeriod.Month, DateTime? startDate = null, DateTime? endDate = null);

    /// <summary>
    /// 生成走访 AI 分析报告
    /// </summary>
    Task<string> GenerateAiReportAsync(VisitStatisticsDto stats);

    #endregion
}
