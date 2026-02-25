using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using System.Text.Json;
using Microsoft.Extensions.Options;
using OpenAI;
using OpenAI.Chat;

namespace Platform.ApiService.Services;

/// <summary>
/// 园区走访管理服务实现
/// </summary>
public class ParkVisitService : IParkVisitService
{
    private readonly ILogger<ParkVisitService> _logger;
    private readonly IDataFactory<VisitTask> _visitTaskFactory;
    private readonly IDataFactory<VisitAssessment> _assessmentFactory;
    private readonly IDataFactory<VisitQuestion> _questionFactory;
    private readonly IDataFactory<VisitQuestionnaire> _questionnaireFactory;
    private readonly IDataFactory<ParkTenant> _tenantFactory;
    private readonly OpenAIClient _openAiClient;
    private readonly AiCompletionOptions _aiOptions;

    /// <summary>
    /// 初始化走访管理服务
    /// </summary>
    public ParkVisitService(
        ILogger<ParkVisitService> logger,
        IDataFactory<VisitTask> visitTaskFactory,
        IDataFactory<VisitAssessment> assessmentFactory,
        IDataFactory<VisitQuestion> questionFactory,
        IDataFactory<VisitQuestionnaire> questionnaireFactory,
        IDataFactory<ParkTenant> tenantFactory,
        OpenAIClient openAiClient,
        IOptions<AiCompletionOptions> aiOptions)
    {
        _logger = logger;
        _visitTaskFactory = visitTaskFactory;
        _assessmentFactory = assessmentFactory;
        _questionFactory = questionFactory;
        _questionnaireFactory = questionnaireFactory;
        _tenantFactory = tenantFactory;
        _openAiClient = openAiClient;
        _aiOptions = aiOptions.Value;
    }

    #region 走访任务

    /// <summary>
    /// 获取走访任务列表
    /// </summary>
    public async Task<VisitTaskListResponse> GetVisitTasksAsync(VisitTaskListRequest request)
    {
        var search = request.Search?.ToLower();
        var status = request.Status;

        var (items, total) = await _visitTaskFactory.FindPagedAsync(
            t => (string.IsNullOrEmpty(search) || (t.ManagerName != null && t.ManagerName.ToLower().Contains(search)) || (t.Phone != null && t.Phone.ToLower().Contains(search))) &&
                 (string.IsNullOrEmpty(status) || t.Status == status),
            q => q.OrderByDescending(t => t.CreatedAt),
            request.Page,
            request.PageSize);

        var tasks = new List<VisitTaskDto>();
        foreach (var item in items)
        {
            var tenant = string.IsNullOrEmpty(item.TenantId) ? null : await _tenantFactory.GetByIdAsync(item.TenantId);
            var assessment = (await _assessmentFactory.FindAsync(a => a.TaskId == item.Id)).FirstOrDefault();
            tasks.Add(new VisitTaskDto
            {
                Id = item.Id,
                Title = item.Title,
                ManagerName = item.ManagerName,
                Phone = item.Phone,
                VisitType = item.VisitType,
                VisitMethod = item.VisitMethod,
                Details = item.Details,
                TenantId = item.TenantId,
                TenantName = tenant?.TenantName ?? item.TenantName,
                VisitLocation = item.VisitLocation,
                VisitDate = item.VisitDate,
                Status = item.Status,
                Visitor = item.Visitor,
                IntervieweeName = item.IntervieweeName,
                IntervieweePosition = item.IntervieweePosition,
                Content = item.Content,
                Photos = item.Photos,
                Feedback = item.Feedback,
                CreatedAt = item.CreatedAt,
                AssessmentId = assessment?.Id,
                AssessmentScore = assessment?.Score
            });
        }

        return new VisitTaskListResponse
        {
            Tasks = tasks,
            Total = (int)total
        };
    }

    /// <summary>
    /// 获取走访任务详情
    /// </summary>
    public async Task<VisitTaskDto?> GetVisitTaskByIdAsync(string id)
    {
        var item = await _visitTaskFactory.GetByIdAsync(id);
        if (item == null) return null;

        var tenant = string.IsNullOrEmpty(item.TenantId) ? null : await _tenantFactory.GetByIdAsync(item.TenantId);
        var assessment = (await _assessmentFactory.FindAsync(a => a.TaskId == item.Id)).FirstOrDefault();
        return new VisitTaskDto
        {
            Id = item.Id,
            Title = item.Title,
            ManagerName = item.ManagerName,
            Phone = item.Phone,
            VisitType = item.VisitType,
            VisitMethod = item.VisitMethod,
            Details = item.Details,
            TenantId = item.TenantId,
            TenantName = tenant?.TenantName ?? item.TenantName,
            VisitLocation = item.VisitLocation,
            VisitDate = item.VisitDate,
            Status = item.Status,
            Visitor = item.Visitor,
            IntervieweeName = item.IntervieweeName,
            IntervieweePosition = item.IntervieweePosition,
            Content = item.Content,
            Photos = item.Photos,
            Feedback = item.Feedback,
            CreatedAt = item.CreatedAt,
            AssessmentId = assessment?.Id,
            AssessmentScore = assessment?.Score
        };
    }

    /// <summary>
    /// 创建走访任务
    /// </summary>
    public async Task<VisitTaskDto> CreateVisitTaskAsync(CreateVisitTaskRequest request)
    {
        var task = new VisitTask
        {
            Title = request.Title,
            ManagerName = request.ManagerName,
            Phone = request.Phone,
            VisitType = request.VisitType,
            VisitMethod = request.VisitMethod,
            Details = request.Details,
            TenantId = request.TenantId,
            TenantName = request.TenantName,
            VisitLocation = request.VisitLocation,
            VisitDate = request.VisitDate,
            QuestionnaireId = request.QuestionnaireId,
            Visitor = request.Visitor,
            Status = request.Status ?? "Pending",
            IntervieweeName = request.IntervieweeName,
            IntervieweePosition = request.IntervieweePosition,
            IntervieweePhone = request.IntervieweePhone,
            Content = request.Content,
            Photos = request.Photos ?? new List<string>(),
            Attachments = request.Attachments ?? new List<string>(),
            Feedback = request.Feedback
        };

        await _visitTaskFactory.CreateAsync(task);
        _logger.LogInformation("创建走访任务: {ManagerName}, ID: {Id}", task.ManagerName, task.Id);

        return (await GetVisitTaskByIdAsync(task.Id))!;
    }

    /// <summary>
    /// 更新走访任务
    /// </summary>
    public async Task<VisitTaskDto?> UpdateVisitTaskAsync(string id, CreateVisitTaskRequest request)
    {
        var updatedTask = await _visitTaskFactory.UpdateAsync(id, task =>
        {
            task.Title = request.Title;
            task.ManagerName = request.ManagerName;
            task.Phone = request.Phone;
            task.VisitType = request.VisitType;
            task.VisitMethod = request.VisitMethod;
            task.Details = request.Details;
            task.TenantId = request.TenantId;
            task.TenantName = request.TenantName;
            task.VisitLocation = request.VisitLocation;
            task.VisitDate = request.VisitDate;
            task.QuestionnaireId = request.QuestionnaireId;
            task.Visitor = request.Visitor;
            task.IntervieweeName = request.IntervieweeName;
            task.IntervieweePosition = request.IntervieweePosition;
            task.IntervieweePhone = request.IntervieweePhone;
            task.Content = request.Content;
            if (request.Photos != null) task.Photos = request.Photos;
            if (request.Attachments != null) task.Attachments = request.Attachments;
            task.Feedback = request.Feedback;

            if (!string.IsNullOrEmpty(request.Status))
            {
                task.Status = request.Status;
            }
        });

        return updatedTask != null ? await GetVisitTaskByIdAsync(id) : null;
    }

    /// <summary>
    /// 删除走访任务
    /// </summary>
    public async Task<bool> DeleteVisitTaskAsync(string id)
    {
        return await _visitTaskFactory.SoftDeleteAsync(id);
    }



    #endregion

    #region 走访考核

    /// <summary>
    /// 获取走访考核列表
    /// </summary>
    public async Task<VisitAssessmentListResponse> GetVisitAssessmentsAsync(VisitAssessmentListRequest request)
    {
        var search = request.Search?.ToLower();

        var (items, total) = await _assessmentFactory.FindPagedAsync(
            a => string.IsNullOrEmpty(search) ||
                 (a.VisitorName != null && a.VisitorName.ToLower().Contains(search)) ||
                 (a.Phone != null && a.Phone.ToLower().Contains(search)) ||
                 (a.TaskDescription != null && a.TaskDescription.ToLower().Contains(search)),
            q => q.OrderByDescending(a => a.CreatedAt),
            request.Page,
            request.PageSize);

        return new VisitAssessmentListResponse
        {
            Assessments = items.Select(a => new VisitAssessmentDto
            {
                Id = a.Id,
                TaskId = a.TaskId,
                VisitorName = a.VisitorName,
                Phone = a.Phone,
                Location = a.Location,
                TaskDescription = a.TaskDescription,
                Score = a.Score,
                Comments = a.Comments,
                CreatedAt = a.CreatedAt
            }).ToList(),
            Total = (int)total
        };
    }

    /// <summary>
    /// 创建走访考核
    /// </summary>
    public async Task<VisitAssessmentDto> CreateVisitAssessmentAsync(VisitAssessmentDto request)
    {
        var assessment = new VisitAssessment
        {
            TaskId = request.TaskId,
            VisitorName = request.VisitorName,
            Phone = request.Phone,
            Location = request.Location,
            TaskDescription = request.TaskDescription,
            Score = request.Score,
            Comments = request.Comments
        };

        // 如果关联了任务，且没有指定走访人（受访者），尝试从任务中获取
        if (!string.IsNullOrEmpty(assessment.TaskId) && string.IsNullOrEmpty(assessment.VisitorName))
        {
            var task = await _visitTaskFactory.GetByIdAsync(assessment.TaskId);
            if (task != null && !string.IsNullOrEmpty(task.Visitor))
            {
                assessment.VisitorName = task.Visitor;
            }
        }

        await _assessmentFactory.CreateAsync(assessment);
        return new VisitAssessmentDto
        {
            Id = assessment.Id,
            TaskId = assessment.TaskId,
            VisitorName = assessment.VisitorName,
            Phone = assessment.Phone,
            Location = assessment.Location,
            TaskDescription = assessment.TaskDescription,
            Score = assessment.Score,
            Comments = assessment.Comments,
            CreatedAt = assessment.CreatedAt
        };
    }

    #endregion

    #region 走访知识库

    /// <summary>
    /// 获取知识库问题列表
    /// </summary>
    public async Task<VisitQuestionListResponse> GetVisitQuestionsAsync(VisitQuestionListRequest request)
    {
        var search = request.Search?.ToLower();
        var category = request.Category;

        var (items, total) = await _questionFactory.FindPagedAsync(
            q => (string.IsNullOrEmpty(search) || (q.Content != null && q.Content.ToLower().Contains(search))) &&
                 (string.IsNullOrEmpty(category) || q.Category == category),
            q => q.OrderByDescending(q => q.CreatedAt),
            request.Page,
            request.PageSize);

        return new VisitQuestionListResponse
        {
            Questions = items.Select(q => new VisitQuestionDto
            {
                Id = q.Id,
                Content = q.Content,
                Category = q.Category,
                Answer = q.Answer,
                IsFrequentlyUsed = q.IsFrequentlyUsed ?? false,
                SortOrder = q.SortOrder ?? 0
            }).ToList(),
            Total = (int)total
        };
    }

    /// <summary>
    /// 获取对应分类下的知识库列表
    /// </summary>
    public async Task<List<VisitQuestionDto>> GetVisitQuestionsByCategoryAsync(string category)
    {
        var items = await _questionFactory.FindAsync(q => q.Category == category);
        return items.OrderByDescending(q => q.IsFrequentlyUsed ?? false).ThenBy(q => q.SortOrder).Select(q => new VisitQuestionDto
        {
            Id = q.Id,
            Content = q.Content,
            Category = q.Category,
            Answer = q.Answer,
            IsFrequentlyUsed = q.IsFrequentlyUsed ?? false,
            SortOrder = q.SortOrder ?? 0
        }).ToList();
    }

    /// <summary>
    /// 创建走访问题
    /// </summary>
    public async Task<VisitQuestionDto> CreateVisitQuestionAsync(VisitQuestionDto request)
    {
        var question = new VisitQuestion
        {
            Content = request.Content,
            Category = request.Category,
            Answer = request.Answer,
            IsFrequentlyUsed = request.IsFrequentlyUsed,
            SortOrder = request.SortOrder
        };

        await _questionFactory.CreateAsync(question);
        return new VisitQuestionDto
        {
            Id = question.Id,
            Content = question.Content,
            Category = question.Category,
            Answer = question.Answer,
            IsFrequentlyUsed = question.IsFrequentlyUsed ?? false,
            SortOrder = question.SortOrder ?? 0
        };
    }

    /// <summary>
    /// 更新走访问题
    /// </summary>
    public async Task<VisitQuestionDto?> UpdateVisitQuestionAsync(string id, VisitQuestionDto request)
    {
        var updatedQuestion = await _questionFactory.UpdateAsync(id, question =>
        {
            question.Content = request.Content;
            question.Category = request.Category;
            question.Answer = request.Answer;
            question.IsFrequentlyUsed = request.IsFrequentlyUsed;
            question.SortOrder = request.SortOrder;
        });

        return updatedQuestion != null ? request : null;
    }

    /// <summary>
    /// 删除走访问题
    /// </summary>
    public async Task<bool> DeleteVisitQuestionAsync(string id)
    {
        return await _questionFactory.SoftDeleteAsync(id);
    }

    /// <summary>
    /// 获取走访问卷列表
    /// </summary>
    public async Task<VisitQuestionnaireListResponse> GetVisitQuestionnairesAsync()
    {
        var items = await _questionnaireFactory.FindAsync();
        return new VisitQuestionnaireListResponse
        {
            Questionnaires = items.OrderBy(q => q.SortOrder).Select(q => new VisitQuestionnaireDto
            {
                Id = q.Id,
                Title = q.Title,
                Purpose = q.Purpose,
                QuestionIds = q.QuestionIds,
                CreatedAt = q.CreatedAt,
                SortOrder = q.SortOrder ?? 0
            }).ToList(),
            Total = (int)await _questionnaireFactory.CountAsync()
        };
    }

    /// <summary>
    /// 创建走访问卷模板
    /// </summary>
    public async Task<VisitQuestionnaireDto> CreateVisitQuestionnaireAsync(VisitQuestionnaireDto request)
    {
        var questionnaire = new VisitQuestionnaire
        {
            Title = request.Title,
            Purpose = request.Purpose,
            QuestionIds = request.QuestionIds,
            Notes = "",
            SortOrder = request.SortOrder
        };

        await _questionnaireFactory.CreateAsync(questionnaire);
        return new VisitQuestionnaireDto
        {
            Id = questionnaire.Id,
            Title = questionnaire.Title,
            Purpose = questionnaire.Purpose,
            QuestionIds = questionnaire.QuestionIds,
            CreatedAt = questionnaire.CreatedAt,
            SortOrder = questionnaire.SortOrder ?? 0
        };
    }

    /// <summary>
    /// 更新走访问卷模板
    /// </summary>
    public async Task<VisitQuestionnaireDto?> UpdateVisitQuestionnaireAsync(string id, VisitQuestionnaireDto request)
    {
        var updated = await _questionnaireFactory.UpdateAsync(id, q =>
        {
            q.Title = request.Title;
            q.Purpose = request.Purpose;
            q.QuestionIds = request.QuestionIds;
            q.SortOrder = request.SortOrder;
        });

        if (updated == null) return null;

        return new VisitQuestionnaireDto
        {
            Id = updated.Id,
            Title = updated.Title,
            Purpose = updated.Purpose,
            QuestionIds = updated.QuestionIds,
            CreatedAt = updated.CreatedAt,
            SortOrder = updated.SortOrder ?? 0
        };
    }

    /// <summary>
    /// 删除走访问卷模板
    /// </summary>
    public async Task<bool> DeleteVisitQuestionnaireAsync(string id)
    {
        return await _questionnaireFactory.SoftDeleteAsync(id);
    }

    /// <summary>
    /// 获取走访统计数据
    /// </summary>
    public async Task<VisitStatisticsDto> GetVisitStatisticsAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        // 1. 获取周期范围
        var now = DateTime.Now;
        var startOfPeriod = startDate ?? new DateTime(now.Year, now.Month, 1);
        var endOfPeriod = endDate ?? now;

        // 1. 基础指标
        var pendingTasks = await _visitTaskFactory.CountAsync(t => t.Status == "Pending" && t.VisitDate >= startOfPeriod && t.VisitDate <= endOfPeriod);
        var completedTasksInPeriod = await _visitTaskFactory.CountAsync(t => t.Status == "Completed" && t.VisitDate >= startOfPeriod && t.VisitDate <= endOfPeriod);
        var totalTasks = await _visitTaskFactory.CountAsync(t => t.VisitDate >= startOfPeriod && t.VisitDate <= endOfPeriod);
        decimal completionRate = totalTasks > 0 ? (decimal)completedTasksInPeriod * 100 / totalTasks : 0;

        var assessments = await _assessmentFactory.FindAsync(a => a.CreatedAt >= startOfPeriod && a.CreatedAt <= endOfPeriod);
        var totalAssessments = assessments.Count;
        var averageScore = totalAssessments > 0 ? (decimal)assessments.Average(a => a.Score) : 0m;

        // 2-4. 按类型、状态、企管员排行统计（从基础数据加载后再分组，因为 IDataFactory 暂不支持直接复杂的聚合）
        var tasks = await _visitTaskFactory.FindAsync(t => t.VisitDate >= startOfPeriod && t.VisitDate <= endOfPeriod);

        // 修复：活跃企管员数计算（有完成走访任务的企管员）
        var activeManagers = tasks.Where(t =>
            !string.IsNullOrEmpty(t.ManagerName) && t.Status == "Completed"
        ).Select(t => t.ManagerName!).Distinct().Count();

        var tasksByType = tasks.GroupBy(t => t.VisitType ?? "其他")
                               .ToDictionary(g => g.Key, g => g.Count());

        var tasksByStatus = tasks.GroupBy(t => t.Status ?? "Unknown")
                                 .ToDictionary(g => g.Key, g => g.Count());

        var managerRanking = tasks.GroupBy(t => t.ManagerName ?? "未知")
                                  .OrderByDescending(g => g.Count())
                                  .Take(10)
                                  .ToDictionary(g => g.Key, g => g.Count());

        // 5. 趋势分析 (最近6个月) - 修复边界问题
        var monthlyTrends = new Dictionary<string, int>();
        var sixMonthsAgo = startOfPeriod.AddMonths(-5).Date;
        var trendTasks = await _visitTaskFactory.FindAsync(t => t.VisitDate >= sixMonthsAgo);

        monthlyTrends = trendTasks.GroupBy(t => new { t.VisitDate.Year, t.VisitDate.Month })
                                   .OrderBy(g => g.Key.Year)
                                   .ThenBy(g => g.Key.Month)
                                   .ToDictionary(
                                       g => $"{g.Key.Year:D4}-{g.Key.Month:D2}",
                                       g => g.Count());

        return new VisitStatisticsDto
        {
            PendingTasks = (int)pendingTasks,
            CompletedTasksThisMonth = (int)completedTasksInPeriod,
            ActiveManagers = activeManagers,
            CompletionRate = Math.Round(completionRate, 1),
            TotalAssessments = (int)totalAssessments,
            AverageScore = Math.Round((decimal)averageScore, 1),
            TasksByType = tasksByType,
            TasksByStatus = tasksByStatus,
            ManagerRanking = managerRanking,
            MonthlyTrends = monthlyTrends,
            Period = startDate.HasValue && endDate.HasValue ? $"{startDate:yyyy-MM-dd} 至 {endDate.Value.AddDays(-1):yyyy-MM-dd}" : "本月"
        };
    }

    /// <summary>
    /// 生成走访 AI 分析报告
    /// </summary>
    public async Task<string> GenerateAiReportAsync(VisitStatisticsDto stats)
    {
        var statsJson = JsonSerializer.Serialize(stats, new JsonSerializerOptions { WriteIndented = true });
        // 3. 构建 Prompt
        var systemPrompt = "你是一个专业的高级园区企管运营专家。请根据提供的园区企业走访运营数据，通过 markdown 格式生成一份深度走访调研分析报告。报告应不仅包含现状分析，还应提供洞察与改进建议。";
        var userPrompt = $@"请基于以下走访统计数据生成分析报告：

{statsJson}

报告要求：
0. **报告标题**：报告第一行必须是：# 🏢 园区走访调研报告 ({stats.Period ?? "本月"})
1. **📊 走访执行概览**：
   - 总结本阶段走访任务的完成情况（完成数、平均完成率）。
   - 分析企管员的活跃度（活跃企管员数量）。
   - 使用表格对比各类走访任务的数量占比。

2. **⭐ 走访满意度与质量分析**：
   - 分析企业对园区走访服务的平均满意度评分。
   - 评估走访评价的总量与走访任务完成量的匹配度。
   - 使用 ⬆️ ⬇️ 表示满意度趋势。

3. **🔍 关键洞察与发现**：
   - 识别走访过程中发现的核心问题或亮点。
   - 分析不同月份的走访趋势变化。

4. **🏆 效能评估 (企管员排行)**：
   - 识别表现突出的企管员及其贡献。
   - 引用优秀案例或高频次走访的行为价值。

5. **💡 改进建议与行动计划**：
   - 基于现有数据，提出至少 3 条具体的运营改进建议。
   - 建议如何提升低频次月份的走访覆盖率。

请使用 Markdown 格式输出，排版需精美：
- **使用 Emoji 图标**：在标题和关键指标前使用合适的 Emoji 增强可读性。
- **使用表格**：务必使用标准的 Markdown 表格语法展示数据对比。
- **高亮关键数据**：使用 **加粗** 或 `代码块` 突出核心指标。
- **引用块**：使用 > 引用块展示核心洞察。

语气需专业、严谨且富有洞察力。";

        try
        {
            var model = string.IsNullOrWhiteSpace(_aiOptions.Model) ? "gpt-4o-mini" : _aiOptions.Model;
            _logger.LogInformation("开始生成走访 AI 报告，使用的模型：{Model}", model);
            var chatClient = _openAiClient.GetChatClient(model);

            var messages = new List<OpenAI.Chat.ChatMessage>
            {
                new SystemChatMessage(systemPrompt),
                new UserChatMessage(userPrompt)
            };

            var options = new ChatCompletionOptions
            {
                Temperature = 0.7f,
                MaxOutputTokenCount = 2000
            };

            var completion = await chatClient.CompleteChatAsync(messages, options);
            var result = completion.Value.Content[0].Text;
            _logger.LogInformation("走访 AI 报告生成成功，内容长度：{Length}", result.Length);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "生成走访 AI 报告失败");
            return $"生成分析报告时发生错误：{ex.Message}。";
        }
    }

    #endregion
}
