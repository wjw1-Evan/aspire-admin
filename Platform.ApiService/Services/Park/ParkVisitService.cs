using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Extensions;
using System.Linq.Dynamic.Core;
using System.Text.Json;
using OpenAI;
using OpenAI.Chat;

namespace Platform.ApiService.Services;

/// <summary>
/// 园区走访管理服务实现
/// </summary>
public class ParkVisitService : IParkVisitService
{
    private readonly DbContext _context;

    private readonly ILogger<ParkVisitService> _logger;
    private readonly OpenAIClient _openAiClient;

    /// <summary>
    /// 初始化走访管理服务
    /// </summary>
    public ParkVisitService(
        DbContext context,
        ILogger<ParkVisitService> logger,
        OpenAIClient openAiClient
    )
    {
        _context = context;

        _logger = logger;
        _openAiClient = openAiClient;
    }

    #region 走访任务

    /// <summary>
    /// 获取走访任务列表
    /// </summary>
    public async Task<System.Linq.Dynamic.Core.PagedResult<VisitTaskDto>> GetVisitTasksAsync(Platform.ServiceDefaults.Models.PageParams request)
    {
        var pagedResult = _context.Set<VisitTask>().ToPagedList(request);
        var items = await pagedResult.Queryable.ToListAsync();

        var tasks = new List<VisitTaskDto>();
        foreach (var item in items)
        {
            var tenant = string.IsNullOrEmpty(item.TenantId) ? null : await _context.Set<ParkTenant>().FirstOrDefaultAsync(t => t.Id == item.TenantId);
            var assessment = (await _context.Set<VisitAssessment>().Where(a => a.TaskId == item.Id).ToListAsync()).FirstOrDefault();
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
                AssessmentId = assessment?.Id,
                AssessmentScore = assessment?.Score
            });
        }

        return new System.Linq.Dynamic.Core.PagedResult<VisitTaskDto> { Queryable = tasks.AsQueryable(), CurrentPage = pagedResult.CurrentPage, PageSize = pagedResult.PageSize, RowCount = pagedResult.RowCount, PageCount = pagedResult.PageCount };
    }

    /// <summary>
    /// 获取走访任务详情
    /// </summary>
    public async Task<VisitTaskDto?> GetVisitTaskByIdAsync(string id)
    {
        var item = await _context.Set<VisitTask>().FirstOrDefaultAsync(x => x.Id == id);
        if (item == null) return null;

        var tenant = string.IsNullOrEmpty(item.TenantId) ? null : await _context.Set<ParkTenant>().FirstOrDefaultAsync(t => t.Id == item.TenantId);
        var assessment = await _context.Set<VisitAssessment>().FirstOrDefaultAsync(a => a.TaskId == item.Id);
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

        await _context.Set<VisitTask>().AddAsync(task);
        await _context.SaveChangesAsync();
        _logger.LogInformation("创建走访任务: {ManagerName}, ID: {Id}", task.ManagerName, task.Id);

        return (await GetVisitTaskByIdAsync(task.Id))!;
    }

    /// <summary>
    /// 更新走访任务
    /// </summary>
    public async Task<VisitTaskDto?> UpdateVisitTaskAsync(string id, CreateVisitTaskRequest request)
    {
        var task = await _context.Set<VisitTask>().FirstOrDefaultAsync(x => x.Id == id);
        if (task == null) return null;

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
        await _context.SaveChangesAsync();

        return await GetVisitTaskByIdAsync(id);
    }

    /// <summary>
    /// 删除走访任务
    /// </summary>
    public async Task<bool> DeleteVisitTaskAsync(string id)
    {
        var task = await _context.Set<VisitTask>().FirstOrDefaultAsync(x => x.Id == id);
        if (task == null)
            return false;

        _context.Set<VisitTask>().Remove(task);
        await _context.SaveChangesAsync();
        return true;
    }

    #endregion

    #region 走访考核

    /// <summary>
    /// 获取走访考核列表
    /// </summary>
    public async Task<System.Linq.Dynamic.Core.PagedResult<VisitAssessmentDto>> GetVisitAssessmentsAsync(Platform.ServiceDefaults.Models.PageParams request)
    {
        var pagedResult = _context.Set<VisitAssessment>().ToPagedList(request);
        var items = await pagedResult.Queryable.ToListAsync();

        var dtos = items.Select(a => new VisitAssessmentDto
        {
            Id = a.Id,
            TaskId = a.TaskId,
            VisitorName = a.VisitorName,
            Phone = a.Phone,
            Location = a.Location,
            TaskDescription = a.TaskDescription,
            Score = a.Score,
            Comments = a.Comments
        }).ToList();

        return new System.Linq.Dynamic.Core.PagedResult<VisitAssessmentDto> { Queryable = dtos.AsQueryable(), CurrentPage = pagedResult.CurrentPage, PageSize = pagedResult.PageSize, RowCount = pagedResult.RowCount, PageCount = pagedResult.PageCount };
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
            var task = await _context.Set<VisitTask>().FirstOrDefaultAsync(t => t.Id == assessment.TaskId);
            if (task != null && !string.IsNullOrEmpty(task.Visitor))
            {
                assessment.VisitorName = task.Visitor;
            }
        }

        await _context.Set<VisitAssessment>().AddAsync(assessment);
        await _context.SaveChangesAsync();
        return new VisitAssessmentDto
        {
            Id = assessment.Id,
            TaskId = assessment.TaskId,
            VisitorName = assessment.VisitorName,
            Phone = assessment.Phone,
            Location = assessment.Location,
            TaskDescription = assessment.TaskDescription,
            Score = assessment.Score,
            Comments = assessment.Comments
        };
    }

    #endregion

    #region 走访知识库

    /// <summary>
    /// 获取知识库问题列表
    /// </summary>
    public async Task<System.Linq.Dynamic.Core.PagedResult<VisitQuestionDto>> GetVisitQuestionsAsync(Platform.ServiceDefaults.Models.PageParams request, string? category = null)
    {
        var search = request.Search?.ToLower();

        var query = _context.Set<VisitQuestion>().Where(
            q => (string.IsNullOrEmpty(search) || (q.Content != null && q.Content.ToLower().Contains(search))) &&
                 (string.IsNullOrEmpty(category) || q.Category == category));

        var pagedResult = query.OrderByDescending(q => q.CreatedAt).ToPagedList(request);
        var items = await pagedResult.Queryable.ToListAsync();

        var dtos = items.Select(q => new VisitQuestionDto
        {
            Id = q.Id,
            Content = q.Content,
            Category = q.Category,
            Answer = q.Answer ?? string.Empty,
            IsFrequentlyUsed = q.IsFrequentlyUsed ?? false
        }).ToList();

        return new System.Linq.Dynamic.Core.PagedResult<VisitQuestionDto>
        {
            Queryable = dtos.AsQueryable(),
            CurrentPage = pagedResult.CurrentPage,
            PageSize = pagedResult.PageSize,
            RowCount = pagedResult.RowCount,
            PageCount = pagedResult.PageCount
        };
    }

    /// <summary>
    /// 获取对应分类下的知识库列表
    /// </summary>
    public async Task<List<VisitQuestionDto>> GetVisitQuestionsByCategoryAsync(string category)
    {
        var items = await _context.Set<VisitQuestion>().Where(q => q.Category == category).ToListAsync();
        return items.OrderByDescending(q => q.IsFrequentlyUsed ?? false).Select(q => new VisitQuestionDto
        {
            Id = q.Id,
            Content = q.Content,
            Category = q.Category,
            Answer = q.Answer ?? string.Empty,
            IsFrequentlyUsed = q.IsFrequentlyUsed ?? false
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
            IsFrequentlyUsed = request.IsFrequentlyUsed
        };

        await _context.Set<VisitQuestion>().AddAsync(question);
        await _context.SaveChangesAsync();
        return new VisitQuestionDto
        {
            Id = question.Id,
            Content = question.Content,
            Category = question.Category,
            Answer = question.Answer ?? string.Empty,
            IsFrequentlyUsed = question.IsFrequentlyUsed ?? false
        };
    }

    /// <summary>
    /// 更新走访问题
    /// </summary>
    public async Task<VisitQuestionDto?> UpdateVisitQuestionAsync(string id, VisitQuestionDto request)
    {
        var question = await _context.Set<VisitQuestion>().FirstOrDefaultAsync(x => x.Id == id);
        if (question == null) return null;

        question.Content = request.Content;
        question.Category = request.Category;
        question.Answer = request.Answer;
        question.IsFrequentlyUsed = request.IsFrequentlyUsed;
        await _context.SaveChangesAsync();

        return request;
    }

    /// <summary>
    /// 删除走访问题
    /// </summary>
    public async Task<bool> DeleteVisitQuestionAsync(string id)
    {
        var question = await _context.Set<VisitQuestion>().FirstOrDefaultAsync(x => x.Id == id);
        if (question == null)
            return false;

        _context.Set<VisitQuestion>().Remove(question);
        await _context.SaveChangesAsync();
        return true;
    }

    /// <summary>
    /// AI 生成问题答案
    /// </summary>
    public async Task<string> GenerateQuestionAnswerAsync(string content, string? category)
    {
        var chatClient = _openAiClient.GetChatClient("gpt-4o-mini");

        var categoryText = string.IsNullOrWhiteSpace(category) ? "通用" : category;
        var systemPrompt = @"你是一位专业的园区服务顾问。请根据用户提出的问题，生成一个专业、实用、友好的标准回答。

要求：
1. 回答要简洁明了，适合走访场景使用
2. 语气友好、专业
3. 150-300字左右
4. 直接给出回答，不需要额外解释";

        var userMessage = $"问题分类：{categoryText}\n问题内容：{content}";

        var messages = new List<OpenAI.Chat.ChatMessage>
        {
            new SystemChatMessage(systemPrompt),
            new UserChatMessage(userMessage)
        };

        var completion = await chatClient.CompleteChatAsync(messages);
        return completion.Value.Content[0].Text;

    }

    /// <summary>
    /// 获取走访问卷列表
    /// </summary>
    public async Task<System.Linq.Dynamic.Core.PagedResult<VisitQuestionnaireDto>> GetVisitQuestionnairesAsync()
    {
        var items = await _context.Set<VisitQuestionnaire>().OrderBy(q => q.SortOrder).ToListAsync();
        var dtos = items.Select(q => new VisitQuestionnaireDto
        {
            Id = q.Id,
            Title = q.Title,
            Purpose = q.Purpose,
            QuestionIds = q.QuestionIds,
            SortOrder = q.SortOrder ?? 0
        }).ToList();
        return new System.Linq.Dynamic.Core.PagedResult<VisitQuestionnaireDto>
        {
            Queryable = dtos.AsQueryable(),
            CurrentPage = 1,
            PageSize = 1000,
            RowCount = dtos.Count,
            PageCount = 1
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

        await _context.Set<VisitQuestionnaire>().AddAsync(questionnaire);
        await _context.SaveChangesAsync();
        return new VisitQuestionnaireDto
        {
            Id = questionnaire.Id,
            Title = questionnaire.Title,
            Purpose = questionnaire.Purpose,
            QuestionIds = questionnaire.QuestionIds,
            SortOrder = questionnaire.SortOrder ?? 0
        };
    }

    /// <summary>
    /// 更新走访问卷模板
    /// </summary>
    public async Task<VisitQuestionnaireDto?> UpdateVisitQuestionnaireAsync(string id, VisitQuestionnaireDto request)
    {
        var questionnaire = await _context.Set<VisitQuestionnaire>().FirstOrDefaultAsync(x => x.Id == id);
        if (questionnaire == null) return null;

        questionnaire.Title = request.Title;
        questionnaire.Purpose = request.Purpose;
        questionnaire.QuestionIds = request.QuestionIds;
        questionnaire.SortOrder = request.SortOrder;
        await _context.SaveChangesAsync();

        return new VisitQuestionnaireDto
        {
            Id = questionnaire.Id,
            Title = questionnaire.Title,
            Purpose = questionnaire.Purpose,
            QuestionIds = questionnaire.QuestionIds,
            SortOrder = questionnaire.SortOrder ?? 0
        };
    }

    /// <summary>
    /// 删除走访问卷模板
    /// </summary>
    public async Task<bool> DeleteVisitQuestionnaireAsync(string id)
    {
        var questionnaire = await _context.Set<VisitQuestionnaire>().FirstOrDefaultAsync(x => x.Id == id);
        if (questionnaire == null)
            return false;

        _context.Set<VisitQuestionnaire>().Remove(questionnaire);
        await _context.SaveChangesAsync();
        return true;
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
        var pendingTasks = await _context.Set<VisitTask>().LongCountAsync(t => t.Status == "Pending" && t.VisitDate >= startOfPeriod && t.VisitDate <= endOfPeriod);
        var completedTasksInPeriod = await _context.Set<VisitTask>().LongCountAsync(t => t.Status == "Completed" && t.VisitDate >= startOfPeriod && t.VisitDate <= endOfPeriod);
        var totalTasks = await _context.Set<VisitTask>().LongCountAsync(t => t.VisitDate >= startOfPeriod && t.VisitDate <= endOfPeriod);
        decimal completionRate = totalTasks > 0 ? (decimal)completedTasksInPeriod * 100 / totalTasks : 0;

        var assessments = await _context.Set<VisitAssessment>().Where(a => a.CreatedAt >= startOfPeriod && a.CreatedAt <= endOfPeriod).ToListAsync();
        var totalAssessments = assessments.Count;
        var averageScore = totalAssessments > 0 ? (decimal)assessments.Average(a => a.Score) : 0m;

        // 2-4. 按类型、状态、企管员排行统计（从基础数据加载后再分组，因为 IDataFactory 暂不支持直接复杂的聚合）
        var tasks = await _context.Set<VisitTask>().Where(t => t.VisitDate >= startOfPeriod && t.VisitDate <= endOfPeriod).ToListAsync();

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
        var trendTasks = await _context.Set<VisitTask>().Where(t => t.VisitDate >= sixMonthsAgo).ToListAsync();

        monthlyTrends = trendTasks.GroupBy(t => new { t.VisitDate.Year, t.VisitDate.Month })
                                   .OrderBy(g => g.Key.Year)
                                   .ThenBy(g => g.Key.Month)
                                   .ToDictionary(
                                       g => $"{g.Key.Year:D4}-{g.Key.Month:D2}",
                                       g => g.Count());

        // 6. 知识库统计
        var totalQuestions = await _context.Set<VisitQuestion>().LongCountAsync();
        var frequentlyUsedQuestions = await _context.Set<VisitQuestion>().LongCountAsync(q => q.IsFrequentlyUsed == true);

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
            Period = startDate.HasValue && endDate.HasValue ? $"{startDate:yyyy-MM-dd} 至 {endDate.Value.AddDays(-1):yyyy-MM-dd}" : "本月",
            TotalQuestions = (int)totalQuestions,
            FrequentlyUsedQuestions = (int)frequentlyUsedQuestions
        };
    }

    /// <summary>
    /// 生成走访 AI 分析报告
    /// </summary>
    public async Task<string> GenerateAiReportAsync(VisitStatisticsDto stats)
    {
        var statsJson = JsonSerializer.Serialize(stats, new JsonSerializerOptions { WriteIndented = true });

        var systemPrompt = @"你是一位资深的园区运营数据分析师，专门为园区管理者撰写专业的数据分析报告。

## 报告风格要求
- 语言风格：专业、简洁、数据驱动
- 输出格式：精美且结构化的 Markdown
- 报告长度：800-1500字左右

## 排版规范
1. **标题层级**：使用 # ## ### 三级标题
2. **数据展示**：优先使用表格，其次是列表
3. **关键指标**：使用 🔢 或 📊 前缀突出显示
4. **数据对比**：使用 | 分隔对比列，确保表格对齐
5. **亮点强调**：使用 > 引用块突出关键发现
6. **Emoji 使用**：每个章节标题前添加1个相关 Emoji";

        var userPrompt = $@"请基于以下园区走访运营数据，生成一份专业的分析报告：

## 数据来源
```json
{statsJson}
```

## 报告结构要求

### 标题
第一行必须是：# 🏢 园区走访运营分析报告

### 一、执行概况（100字左右）
用一句话总结本月/本周期整体情况，包含：
- 任务完成率（用百分比和进度条图形表示）
- 参与企管员数量
- 知识库规模

### 二、📊 任务执行分析
使用 Markdown 表格展示：
| 指标 | 数值 | 环比 |
|------|------|------|
| 待处理任务 | {stats.PendingTasks} | - |
| 本月完成 | {stats.CompletedTasksThisMonth} | - |
| 完成率 | {stats.CompletionRate}% | - |
| 活跃企管员 | {stats.ActiveManagers} | - |

### 三、⭐ 服务质量评估
- 满意度评分：{stats.AverageScore}/5（用 ⭐⭐⭐⭐⭐ 图形化展示）
- 评价总数：{stats.TotalAssessments} 条

### 四、📚 知识库运营
- 问题总数：{stats.TotalQuestions} 个
- 常用问题：{stats.FrequentlyUsedQuestions} 个
- 分析知识库的覆盖程度

### 五、🔍 趋势洞察
- 简述最近几个月的变化趋势
- 识别一个关键亮点

### 六、💡 改进建议
列出3条具体、可执行的建议

---

请严格按照上述格式输出，确保每个部分都有实质性内容。";

        try
        {
            _logger.LogInformation("开始生成走访 AI 报告");
            var chatClient = _openAiClient.GetChatClient("gpt-4o-mini");

            var messages = new List<OpenAI.Chat.ChatMessage>
            {
                new SystemChatMessage(systemPrompt),
                new UserChatMessage(userPrompt)
            };

            var options = new ChatCompletionOptions
            {

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
