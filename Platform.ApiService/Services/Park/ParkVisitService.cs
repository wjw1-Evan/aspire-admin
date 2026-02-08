using Platform.ApiService.Models;
using MongoDB.Driver;
using Platform.ServiceDefaults.Services;

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

    /// <summary>
    /// 初始化走访管理服务
    /// </summary>
    public ParkVisitService(
        ILogger<ParkVisitService> logger,
        IDatabaseOperationFactory<VisitTask> visitTaskFactory,
        IDatabaseOperationFactory<VisitAssessment> assessmentFactory,
        IDatabaseOperationFactory<VisitQuestion> questionFactory,
        IDatabaseOperationFactory<VisitQuestionnaire> questionnaireFactory,
        IDatabaseOperationFactory<ParkTenant> tenantFactory)
    {
        _logger = logger;
        _visitTaskFactory = visitTaskFactory;
        _assessmentFactory = assessmentFactory;
        _questionFactory = questionFactory;
        _questionnaireFactory = questionnaireFactory;
        _tenantFactory = tenantFactory;
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
                ManagerName = item.ManagerName,
                Phone = item.Phone,
                Jurisdiction = item.Jurisdiction,
                Details = item.Details,
                TenantId = item.TenantId,
                TenantName = tenant?.TenantName,
                VisitLocation = item.VisitLocation,
                VisitDate = item.VisitDate,
                Status = item.Status,
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
            ManagerName = item.ManagerName,
            Phone = item.Phone,
            Jurisdiction = item.Jurisdiction,
            Details = item.Details,
            TenantId = item.TenantId,
            TenantName = tenant?.TenantName,
            VisitLocation = item.VisitLocation,
            VisitDate = item.VisitDate,
            Status = item.Status,
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
            ManagerName = request.ManagerName,
            Phone = request.Phone,
            Jurisdiction = request.Jurisdiction,
            Details = request.Details,
            TenantId = request.TenantId,
            VisitLocation = request.VisitLocation,
            VisitDate = request.VisitDate,
            QuestionnaireId = request.QuestionnaireId,
            Status = "Pending"
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

        task.ManagerName = request.ManagerName;
        task.Phone = request.Phone;
        task.Jurisdiction = request.Jurisdiction;
        task.Details = request.Details;
        task.TenantId = request.TenantId;
        task.VisitLocation = request.VisitLocation;
        task.VisitDate = request.VisitDate;
        task.QuestionnaireId = request.QuestionnaireId;

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

    /// <summary>
    /// 派发走访任务
    /// </summary>
    public async Task<VisitTaskDto?> DispatchVisitTaskAsync(string id)
    {
        var task = await _visitTaskFactory.GetByIdAsync(id);
        if (task == null || task.Status != "Pending") return null;

        task.Status = "InProgress";
        await _visitTaskFactory.FindOneAndReplaceAsync(_visitTaskFactory.CreateFilterBuilder().Equal(t => t.Id, id).Build(), task);

        return await GetVisitTaskByIdAsync(id);
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
    public async Task<VisitStatisticsDto> GetVisitStatisticsAsync()
    {
        // 1. 待处理任务 (Pending)
        var pendingFilter = _visitTaskFactory.CreateFilterBuilder()
            .Equal(t => t.Status, "Pending")
            .Build();
        var pendingTasks = await _visitTaskFactory.CountAsync(pendingFilter);

        // 2. 本月已完成走访
        var firstDayOfMonth = new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1);
        var completedMonthFilter = _visitTaskFactory.CreateFilterBuilder()
            .Equal(t => t.Status, "Completed")
            .GreaterThanOrEqual(t => t.VisitDate, firstDayOfMonth)
            .Build();
        var completedTasksThisMonth = await _visitTaskFactory.CountAsync(completedMonthFilter);

        // 3. 活跃企管员 (使用聚合进行去重计数)
        // 注意：AggregateAsync 会自动添加多租户和软删除过滤的 $match 阶段
        var managersPipeline = PipelineDefinition<VisitTask, MongoDB.Bson.BsonDocument>.Create(new[]
        {
            new MongoDB.Bson.BsonDocument("$group", new MongoDB.Bson.BsonDocument("_id", "$managerName")),
            new MongoDB.Bson.BsonDocument("$count", "count")
        });
        var managerResult = await _visitTaskFactory.AggregateAsync(managersPipeline);
        var activeManagers = managerResult.FirstOrDefault()?.GetValue("count", 0).AsInt32 ?? 0;

        // 4. 完成率
        var totalTasks = await _visitTaskFactory.CountAsync();
        var completedFilter = _visitTaskFactory.CreateFilterBuilder().Equal(t => t.Status, "Completed").Build();
        var completedTasks = await _visitTaskFactory.CountAsync(completedFilter);
        decimal completionRate = totalTasks > 0 ? (decimal)completedTasks * 100 / totalTasks : 0;

        // 5. 累计评价数
        var totalAssessments = await _assessmentFactory.CountAsync();

        // 6. 平均评分 (使用聚合)
        var averageScore = 0m;
        if (totalAssessments > 0)
        {
            var scorePipeline = PipelineDefinition<VisitAssessment, MongoDB.Bson.BsonDocument>.Create(new[]
            {
                new MongoDB.Bson.BsonDocument("$group", new MongoDB.Bson.BsonDocument {
                    { "_id", 1 },
                    { "average", new MongoDB.Bson.BsonDocument("$avg", "$score") }
                })
            });
            var scoreResult = await _assessmentFactory.AggregateAsync(scorePipeline);
            var avgValue = scoreResult.FirstOrDefault()?.GetValue("average", 0);
            if (avgValue != null)
            {
                averageScore = (decimal)avgValue.ToDouble();
            }
        }

        return new VisitStatisticsDto
        {
            PendingTasks = (int)pendingTasks,
            CompletedTasksThisMonth = (int)completedTasksThisMonth,
            ActiveManagers = activeManagers,
            CompletionRate = Math.Round(completionRate, 1),
            TotalAssessments = (int)totalAssessments,
            AverageScore = Math.Round(averageScore, 1)
        };
    }

    #endregion
}
