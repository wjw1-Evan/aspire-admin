using Platform.ApiService.Models;
using MongoDB.Driver;
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
    private readonly IDatabaseOperationFactory<VisitTask> _visitTaskFactory;
    private readonly IDatabaseOperationFactory<VisitAssessment> _assessmentFactory;
    private readonly IDatabaseOperationFactory<VisitQuestion> _questionFactory;
    private readonly IDatabaseOperationFactory<VisitQuestionnaire> _questionnaireFactory;
    private readonly IDatabaseOperationFactory<ParkTenant> _tenantFactory;
    private readonly OpenAIClient _openAiClient;
    private readonly AiCompletionOptions _aiOptions;

    /// <summary>
    /// 初始化走访管理服务
    /// </summary>
    public ParkVisitService(
        ILogger<ParkVisitService> logger,
        IDatabaseOperationFactory<VisitTask> visitTaskFactory,
        IDatabaseOperationFactory<VisitAssessment> assessmentFactory,
        IDatabaseOperationFactory<VisitQuestion> questionFactory,
        IDatabaseOperationFactory<VisitQuestionnaire> questionnaireFactory,
        IDatabaseOperationFactory<ParkTenant> tenantFactory,
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
        var filterBuilder = Builders<VisitTask>.Filter;
        var filter = filterBuilder.Empty;

        if (!string.IsNullOrEmpty(request.Search))
        {
            var search = request.Search.ToLower();
            filter &= filterBuilder.Or(
                filterBuilder.Regex(t => t.ManagerName, new MongoDB.Bson.BsonRegularExpression(search, "i")),
                filterBuilder.Regex(t => t.Phone, new MongoDB.Bson.BsonRegularExpression(search, "i"))
            );
        }

        if (!string.IsNullOrEmpty(request.Status))
        {
            filter &= filterBuilder.Eq(t => t.Status, request.Status);
        }

        var sortBuilder = _visitTaskFactory.CreateSortBuilder();
        var sort = sortBuilder.Descending(t => t.CreatedAt).Build();

        var (items, total) = await _visitTaskFactory.FindPagedAsync(filter, sort, request.Page, request.PageSize);

        var tasks = new List<VisitTaskDto>();
        foreach (var item in items)
        {
            var tenant = string.IsNullOrEmpty(item.TenantId) ? null : await _tenantFactory.GetByIdAsync(item.TenantId);
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
                CreatedAt = item.CreatedAt
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
            CreatedAt = item.CreatedAt
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
        var task = await _visitTaskFactory.GetByIdAsync(id);
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

        await _visitTaskFactory.FindOneAndReplaceAsync(_visitTaskFactory.CreateFilterBuilder().Equal(t => t.Id, id).Build(), task);

        return await GetVisitTaskByIdAsync(id);
    }

    /// <summary>
    /// 删除走访任务
    /// </summary>
    public async Task<bool> DeleteVisitTaskAsync(string id)
    {
        var deleted = await _visitTaskFactory.FindOneAndSoftDeleteAsync(_visitTaskFactory.CreateFilterBuilder().Equal(t => t.Id, id).Build());
        return deleted != null;
    }



    #endregion

    #region 走访考核

    /// <summary>
    /// 获取走访考核列表
    /// </summary>
    public async Task<VisitAssessmentListResponse> GetVisitAssessmentsAsync(VisitAssessmentListRequest request)
    {
        var filterBuilder = Builders<VisitAssessment>.Filter;
        var filter = filterBuilder.Empty;

        if (!string.IsNullOrEmpty(request.Search))
        {
            var search = request.Search.ToLower();
            filter &= filterBuilder.Or(
                filterBuilder.Regex(a => a.VisitorName, new MongoDB.Bson.BsonRegularExpression(search, "i")),
                filterBuilder.Regex(a => a.Phone, new MongoDB.Bson.BsonRegularExpression(search, "i")),
                filterBuilder.Regex(a => a.TaskDescription, new MongoDB.Bson.BsonRegularExpression(search, "i"))
            );
        }

        var sortBuilder = _assessmentFactory.CreateSortBuilder();
        var sort = sortBuilder.Descending(a => a.CreatedAt).Build();

        var (items, total) = await _assessmentFactory.FindPagedAsync(filter, sort, request.Page, request.PageSize);

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
        var filterBuilder = Builders<VisitQuestion>.Filter;
        var filter = filterBuilder.Empty;

        if (!string.IsNullOrEmpty(request.Search))
        {
            filter &= filterBuilder.Regex(q => q.Content, new MongoDB.Bson.BsonRegularExpression(request.Search, "i"));
        }

        if (!string.IsNullOrEmpty(request.Category))
        {
            filter &= filterBuilder.Eq(q => q.Category, request.Category);
        }

        var sortBuilder = _questionFactory.CreateSortBuilder();
        var sort = sortBuilder.Descending(q => q.CreatedAt).Build();

        var (items, total) = await _questionFactory.FindPagedAsync(filter, sort, request.Page, request.PageSize);

        return new VisitQuestionListResponse
        {
            Questions = items.Select(q => new VisitQuestionDto
            {
                Id = q.Id,
                Content = q.Content,
                Category = q.Category,
                Answer = q.Answer,
                IsFrequentlyUsed = q.IsFrequentlyUsed
            }).ToList(),
            Total = (int)total
        };
    }

    /// <summary>
    /// 获取对应分类下的知识库列表
    /// </summary>
    public async Task<List<VisitQuestionDto>> GetVisitQuestionsByCategoryAsync(string category)
    {
        var items = await _questionFactory.FindAsync(Builders<VisitQuestion>.Filter.Eq(q => q.Category, category));
        return items.Select(q => new VisitQuestionDto
        {
            Id = q.Id,
            Content = q.Content,
            Category = q.Category,
            Answer = q.Answer,
            IsFrequentlyUsed = q.IsFrequentlyUsed
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

        await _questionFactory.CreateAsync(question);
        return new VisitQuestionDto
        {
            Id = question.Id,
            Content = question.Content,
            Category = question.Category,
            Answer = question.Answer,
            IsFrequentlyUsed = question.IsFrequentlyUsed
        };
    }

    /// <summary>
    /// 更新走访问题
    /// </summary>
    public async Task<VisitQuestionDto?> UpdateVisitQuestionAsync(string id, VisitQuestionDto request)
    {
        var question = await _questionFactory.GetByIdAsync(id);
        if (question == null) return null;

        question.Content = request.Content;
        question.Category = request.Category;
        question.Answer = request.Answer;
        question.IsFrequentlyUsed = request.IsFrequentlyUsed;

        await _questionFactory.FindOneAndReplaceAsync(_questionFactory.CreateFilterBuilder().Equal(q => q.Id, id).Build(), question);
        return request;
    }

    /// <summary>
    /// 删除走访问题
    /// </summary>
    public async Task<bool> DeleteVisitQuestionAsync(string id)
    {
        var deleted = await _questionFactory.FindOneAndSoftDeleteAsync(_questionFactory.CreateFilterBuilder().Equal(q => q.Id, id).Build());
        return deleted != null;
    }

    /// <summary>
    /// 获取走访问卷列表
    /// </summary>
    public async Task<VisitQuestionnaireListResponse> GetVisitQuestionnairesAsync()
    {
        var items = await _questionnaireFactory.FindAsync();
        return new VisitQuestionnaireListResponse
        {
            Questionnaires = items.Select(q => new VisitQuestionnaireDto
            {
                Id = q.Id,
                Title = q.Title,
                Purpose = q.Purpose,
                QuestionIds = q.QuestionIds,
                CreatedAt = q.CreatedAt
            }).ToList(),
            Total = items.Count
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
            Notes = ""
        };

        await _questionnaireFactory.CreateAsync(questionnaire);
        return new VisitQuestionnaireDto
        {
            Id = questionnaire.Id,
            Title = questionnaire.Title,
            Purpose = questionnaire.Purpose,
            QuestionIds = questionnaire.QuestionIds,
            CreatedAt = questionnaire.CreatedAt
        };
    }

    /// <summary>
    /// 获取走访统计数据
    /// </summary>
    public async Task<VisitStatisticsDto> GetVisitStatisticsAsync(StatisticsPeriod period = StatisticsPeriod.Month, DateTime? startDate = null, DateTime? endDate = null)
    {
        // 1. 获取周期范围
        var now = DateTime.Now;
        var startOfPeriod = startDate ?? (period switch
        {
            StatisticsPeriod.Day => now.Date,
            StatisticsPeriod.Week => now.AddDays(-(int)now.DayOfWeek),
            StatisticsPeriod.Year => new DateTime(now.Year, 1, 1),
            _ => new DateTime(now.Year, now.Month, 1)
        });
        var endOfPeriod = endDate ?? now;

        // 基础指标使用的 Filter
        var periodFilter = _visitTaskFactory.CreateFilterBuilder()
            .GreaterThanOrEqual(t => t.VisitDate, startOfPeriod)
            .LessThanOrEqual(t => t.VisitDate, endOfPeriod)
            .Build();

        // 1. 基础指标
        var pendingFilter = _visitTaskFactory.CreateFilterBuilder()
            .Equal(t => t.Status, "Pending")
            .GreaterThanOrEqual(t => t.VisitDate, startOfPeriod)
            .LessThanOrEqual(t => t.VisitDate, endOfPeriod)
            .Build();
        var pendingTasks = await _visitTaskFactory.CountAsync(pendingFilter);

        var completedMonthFilter = _visitTaskFactory.CreateFilterBuilder()
            .Equal(t => t.Status, "Completed")
            .GreaterThanOrEqual(t => t.VisitDate, startOfPeriod)
            .LessThanOrEqual(t => t.VisitDate, endOfPeriod)
            .Build();
        var completedTasksThisMonth = await _visitTaskFactory.CountAsync(completedMonthFilter);

        var totalTasks = await _visitTaskFactory.CountAsync(periodFilter);
        var completedTasks = await _visitTaskFactory.CountAsync(completedMonthFilter);
        decimal completionRate = totalTasks > 0 ? (decimal)completedTasks * 100 / totalTasks : 0;

        var assessmentPeriodFilter = _assessmentFactory.CreateFilterBuilder()
            .GreaterThanOrEqual(a => a.CreatedAt, startOfPeriod)
            .LessThanOrEqual(a => a.CreatedAt, endOfPeriod)
            .Build();

        var totalAssessments = await _assessmentFactory.CountAsync(assessmentPeriodFilter);
        var averageScore = 0m;
        if (totalAssessments > 0)
        {
            var scorePipeline = PipelineDefinition<VisitAssessment, MongoDB.Bson.BsonDocument>.Create(new[]
            {
                new MongoDB.Bson.BsonDocument { { "$match", new MongoDB.Bson.BsonDocument("createdAt", new MongoDB.Bson.BsonDocument {
                    { "$gte", startOfPeriod },
                    { "$lte", endOfPeriod }
                }) } },
                new MongoDB.Bson.BsonDocument { { "$group", new MongoDB.Bson.BsonDocument {
                    { "_id", 1 },
                    { "average", new MongoDB.Bson.BsonDocument("$avg", "$score") }
                } } }
            });
            var scoreResult = await _assessmentFactory.AggregateAsync(scorePipeline);
            var avgValue = scoreResult.FirstOrDefault()?.GetValue("average", 0);
            if (avgValue != null) averageScore = (decimal)avgValue.ToDouble();
        }

        // 2. 按类型统计
        var tasksByType = new Dictionary<string, int>();
        var typePipeline = PipelineDefinition<VisitTask, MongoDB.Bson.BsonDocument>.Create(new[]
        {
            new MongoDB.Bson.BsonDocument { { "$match", new MongoDB.Bson.BsonDocument("visitDate", new MongoDB.Bson.BsonDocument {
                { "$gte", startOfPeriod },
                { "$lte", endOfPeriod }
            }) } },
            new MongoDB.Bson.BsonDocument {
                { "$group", new MongoDB.Bson.BsonDocument {
                    { "_id", "$visitType" },
                    { "count", new MongoDB.Bson.BsonDocument("$sum", 1) }
                }}
            }
        });
        var typeResults = await _visitTaskFactory.AggregateAsync(typePipeline);
        foreach (var doc in typeResults)
        {
            var type = doc.GetValue("_id", "其他").AsString;
            var count = doc.GetValue("count", 0).AsInt32;
            tasksByType[type] = count;
        }

        // 3. 按状态统计
        var tasksByStatus = new Dictionary<string, int>();
        var statusPipeline = PipelineDefinition<VisitTask, MongoDB.Bson.BsonDocument>.Create(new[]
        {
            new MongoDB.Bson.BsonDocument { { "$match", new MongoDB.Bson.BsonDocument("visitDate", new MongoDB.Bson.BsonDocument {
                { "$gte", startOfPeriod },
                { "$lte", endOfPeriod }
            }) } },
            new MongoDB.Bson.BsonDocument {
                { "$group", new MongoDB.Bson.BsonDocument {
                    { "_id", "$status" },
                    { "count", new MongoDB.Bson.BsonDocument("$sum", 1) }
                }}
            }
        });
        var statusResults = await _visitTaskFactory.AggregateAsync(statusPipeline);
        foreach (var doc in statusResults)
        {
            var status = doc.GetValue("_id", "Unknown").AsString;
            var count = doc.GetValue("count", 0).AsInt32;
            tasksByStatus[status] = count;
        }

        // 4. 企管员走访排行
        var managerRanking = new Dictionary<string, int>();
        var managerRankingPipeline = PipelineDefinition<VisitTask, MongoDB.Bson.BsonDocument>.Create(new[]
        {
            new MongoDB.Bson.BsonDocument { { "$match", new MongoDB.Bson.BsonDocument("visitDate", new MongoDB.Bson.BsonDocument {
                { "$gte", startOfPeriod },
                { "$lte", endOfPeriod }
            }) } },
            new MongoDB.Bson.BsonDocument {
                { "$group", new MongoDB.Bson.BsonDocument {
                    { "_id", "$managerName" },
                    { "count", new MongoDB.Bson.BsonDocument("$sum", 1) }
                }}
            },
            new MongoDB.Bson.BsonDocument { { "$sort", new MongoDB.Bson.BsonDocument("count", -1) } },
            new MongoDB.Bson.BsonDocument { { "$limit", 10 } }
        });
        var rankingResults = await _visitTaskFactory.AggregateAsync(managerRankingPipeline);
        foreach (var doc in rankingResults)
        {
            var name = doc.GetValue("_id", "未知").AsString;
            var count = doc.GetValue("count", 0).AsInt32;
            managerRanking[name] = count;
        }

        // 5. 趋势分析 (最近6个月)
        var monthlyTrends = new Dictionary<string, int>();
        var sixMonthsAgo = new DateTime(now.Year, now.Month, 1).AddMonths(-5);

        var trendPipeline = PipelineDefinition<VisitTask, MongoDB.Bson.BsonDocument>.Create(new[]
        {
            new MongoDB.Bson.BsonDocument { { "$match", new MongoDB.Bson.BsonDocument("visitDate", new MongoDB.Bson.BsonDocument("$gte", sixMonthsAgo)) } },
            new MongoDB.Bson.BsonDocument {
                { "$group", new MongoDB.Bson.BsonDocument {
                    { "_id", new MongoDB.Bson.BsonDocument("$dateToString", new MongoDB.Bson.BsonDocument {
                        { "format", "%Y-%m" },
                        { "date", "$visitDate" }
                    })},
                    { "count", new MongoDB.Bson.BsonDocument("$sum", 1) }
                }}
            },
            new MongoDB.Bson.BsonDocument { { "$sort", new MongoDB.Bson.BsonDocument("_id", 1) } }
        });
        var trendResults = await _visitTaskFactory.AggregateAsync(trendPipeline);
        foreach (var doc in trendResults)
        {
            var month = doc.GetValue("_id", "").AsString;
            if (!string.IsNullOrEmpty(month))
            {
                monthlyTrends[month] = doc.GetValue("count", 0).AsInt32;
            }
        }

        return new VisitStatisticsDto
        {
            PendingTasks = (int)pendingTasks,
            CompletedTasksThisMonth = (int)completedTasksThisMonth,
            ActiveManagers = managerRanking.Count,
            CompletionRate = Math.Round(completionRate, 1),
            TotalAssessments = (int)totalAssessments,
            AverageScore = Math.Round(averageScore, 1),
            TasksByType = tasksByType,
            TasksByStatus = tasksByStatus,
            ManagerRanking = managerRanking,
            MonthlyTrends = monthlyTrends
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
