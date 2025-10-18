using MongoDB.Driver;
using Platform.DataPlatform.Models;
using Platform.DataPlatform.Connectors;

namespace Platform.DataPlatform.Services;

/// <summary>
/// 数据质量服务实现
/// </summary>
public class DataQualityService : IDataQualityService
{
    private readonly IMongoCollection<DataQualityRule> _qualityRules;
    private readonly IMongoCollection<QualityCheckResult> _qualityResults;
    private readonly IMongoCollection<DataSource> _dataSources;
    private readonly string _companyId;
    private readonly IDataConnectorFactory _connectorFactory;

    public DataQualityService(
        IMongoDatabase database,
        IHttpContextAccessor httpContextAccessor,
        IDataConnectorFactory connectorFactory)
    {
        _qualityRules = database.GetCollection<DataQualityRule>("qualityRules");
        _qualityResults = database.GetCollection<QualityCheckResult>("qualityResults");
        _dataSources = database.GetCollection<DataSource>("dataSources");
        _companyId = httpContextAccessor.HttpContext?.User?.FindFirst("companyId")?.Value ?? "default";
        _connectorFactory = connectorFactory;
    }

    public async Task<List<DataQualityRule>> GetAllRulesAsync()
    {
        var filter = Builders<DataQualityRule>.Filter.And(
            Builders<DataQualityRule>.Filter.Eq(r => r.CompanyId, _companyId),
            Builders<DataQualityRule>.Filter.Eq(r => r.IsDeleted, false)
        );

        return await _qualityRules.Find(filter).ToListAsync();
    }

    public async Task<DataQualityRule?> GetRuleByIdAsync(string id)
    {
        var filter = Builders<DataQualityRule>.Filter.And(
            Builders<DataQualityRule>.Filter.Eq(r => r.Id, id),
            Builders<DataQualityRule>.Filter.Eq(r => r.CompanyId, _companyId),
            Builders<DataQualityRule>.Filter.Eq(r => r.IsDeleted, false)
        );

        return await _qualityRules.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<DataQualityRule> CreateRuleAsync(DataQualityRule rule)
    {
        rule.CompanyId = _companyId;
        rule.CreatedAt = DateTime.UtcNow;
        rule.UpdatedAt = DateTime.UtcNow;

        await _qualityRules.InsertOneAsync(rule);
        return rule;
    }

    public async Task<bool> UpdateRuleAsync(string id, DataQualityRule rule)
    {
        var filter = Builders<DataQualityRule>.Filter.And(
            Builders<DataQualityRule>.Filter.Eq(r => r.Id, id),
            Builders<DataQualityRule>.Filter.Eq(r => r.CompanyId, _companyId),
            Builders<DataQualityRule>.Filter.Eq(r => r.IsDeleted, false)
        );

        rule.Id = id;
        rule.CompanyId = _companyId;
        rule.UpdatedAt = DateTime.UtcNow;

        var result = await _qualityRules.ReplaceOneAsync(filter, rule);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> DeleteRuleAsync(string id)
    {
        var filter = Builders<DataQualityRule>.Filter.And(
            Builders<DataQualityRule>.Filter.Eq(r => r.Id, id),
            Builders<DataQualityRule>.Filter.Eq(r => r.CompanyId, _companyId),
            Builders<DataQualityRule>.Filter.Eq(r => r.IsDeleted, false)
        );

        var update = Builders<DataQualityRule>.Update
            .Set(r => r.IsDeleted, true)
            .Set(r => r.UpdatedAt, DateTime.UtcNow);

        var result = await _qualityRules.UpdateOneAsync(filter, update);
        return result.ModifiedCount > 0;
    }

    public async Task<QualityCheckResult> ExecuteQualityCheckAsync(string ruleId)
    {
        var rule = await GetRuleByIdAsync(ruleId);
        if (rule == null)
        {
            throw new KeyNotFoundException($"质量规则 {ruleId} 不存在");
        }

        if (!rule.IsEnabled)
        {
            throw new InvalidOperationException("质量规则未启用");
        }

        var startTime = DateTime.UtcNow;
        var result = new QualityCheckResult
        {
            RuleId = ruleId,
            CheckTime = startTime,
            Status = QualityCheckStatus.Passed
        };

        try
        {
            // 获取数据源
            var dataSource = await GetDataSourceAsync(rule.DataSourceId);
            if (dataSource == null)
            {
                throw new KeyNotFoundException($"数据源 {rule.DataSourceId} 不存在");
            }

            // 执行质量检查
            result = await ExecuteQualityCheckLogicAsync(rule, dataSource, startTime);

            // 更新规则的最后检查信息
            await UpdateRuleLastCheckAsync(ruleId, result);

        }
        catch (Exception ex)
        {
            result.Status = QualityCheckStatus.Failed;
            result.ErrorMessage = ex.Message;
            result.EndTime = DateTime.UtcNow;
            result.ExecutionTime = (result.EndTime ?? DateTime.UtcNow) - startTime;
        }

        // 保存检查结果
        await _qualityResults.InsertOneAsync(result);

        return result;
    }

    public async Task<List<QualityCheckResult>> ExecuteBatchQualityCheckAsync(List<string> ruleIds)
    {
        var results = new List<QualityCheckResult>();

        foreach (var ruleId in ruleIds)
        {
            try
            {
                var result = await ExecuteQualityCheckAsync(ruleId);
                results.Add(result);
            }
            catch (Exception ex)
            {
                // 记录错误但继续执行其他规则
                results.Add(new QualityCheckResult
                {
                    RuleId = ruleId,
                    CheckTime = DateTime.UtcNow,
                    Status = QualityCheckStatus.Failed,
                    ErrorMessage = ex.Message
                });
            }
        }

        return results;
    }

    public async Task<List<DataQualityRule>> GetRulesByDataSourceAsync(string dataSourceId)
    {
        var filter = Builders<DataQualityRule>.Filter.And(
            Builders<DataQualityRule>.Filter.Eq(r => r.DataSourceId, dataSourceId),
            Builders<DataQualityRule>.Filter.Eq(r => r.CompanyId, _companyId),
            Builders<DataQualityRule>.Filter.Eq(r => r.IsDeleted, false)
        );

        return await _qualityRules.Find(filter).ToListAsync();
    }

    public async Task<List<QualityCheckResult>> GetQualityCheckHistoryAsync(string ruleId, int limit = 10)
    {
        var filter = Builders<QualityCheckResult>.Filter.Eq(r => r.RuleId, ruleId);
        var sort = Builders<QualityCheckResult>.Sort.Descending(r => r.CheckTime);

        return await _qualityResults.Find(filter)
            .Sort(sort)
            .Limit(limit)
            .ToListAsync();
    }

    public async Task<Dictionary<string, object>> GetDataSourceQualityStatisticsAsync(string dataSourceId)
    {
        var rules = await GetRulesByDataSourceAsync(dataSourceId);
        var ruleIds = rules.Select(r => r.Id).ToList();

        if (!ruleIds.Any())
        {
            return new Dictionary<string, object>
            {
                ["totalRules"] = 0,
                ["enabledRules"] = 0,
                ["lastCheckTime"] = null,
                ["overallPassRate"] = 0
            };
        }

        var ruleFilter = Builders<QualityCheckResult>.Filter.In(r => r.RuleId, ruleIds);
        var totalChecks = await _qualityResults.CountDocumentsAsync(ruleFilter);

        var passedFilter = Builders<QualityCheckResult>.Filter.And(
            ruleFilter,
            Builders<QualityCheckResult>.Filter.Eq(r => r.Status, QualityCheckStatus.Passed)
        );
        var passedChecks = await _qualityResults.CountDocumentsAsync(passedFilter);

        var passRate = totalChecks > 0 ? (double)passedChecks / totalChecks * 100 : 0;

        var lastCheck = await _qualityResults.Find(ruleFilter)
            .Sort(Builders<QualityCheckResult>.Sort.Descending(r => r.CheckTime))
            .FirstOrDefaultAsync();

        return new Dictionary<string, object>
        {
            ["totalRules"] = rules.Count,
            ["enabledRules"] = rules.Count(r => r.IsEnabled),
            ["totalChecks"] = totalChecks,
            ["passedChecks"] = passedChecks,
            ["failedChecks"] = totalChecks - passedChecks,
            ["overallPassRate"] = Math.Round(passRate, 2),
            ["lastCheckTime"] = lastCheck?.CheckTime
        };
    }

    public async Task<Dictionary<string, object>> GetOverallQualityOverviewAsync()
    {
        var companyFilter = Builders<DataQualityRule>.Filter.And(
            Builders<DataQualityRule>.Filter.Eq(r => r.CompanyId, _companyId),
            Builders<DataQualityRule>.Filter.Eq(r => r.IsDeleted, false)
        );

        var totalRules = await _qualityRules.CountDocumentsAsync(companyFilter);
        var enabledRules = await _qualityRules.CountDocumentsAsync(
            Builders<DataQualityRule>.Filter.And(
                companyFilter,
                Builders<DataQualityRule>.Filter.Eq(r => r.IsEnabled, true)
            )
        );

        var companyResultFilter = Builders<QualityCheckResult>.Filter.Eq(r => r.CompanyId, _companyId);
        var totalChecks = await _qualityResults.CountDocumentsAsync(companyResultFilter);

        var passedChecks = await _qualityResults.CountDocumentsAsync(
            Builders<QualityCheckResult>.Filter.And(
                companyResultFilter,
                Builders<QualityCheckResult>.Filter.Eq(r => r.Status, QualityCheckStatus.Passed)
            )
        );

        var passRate = totalChecks > 0 ? (double)passedChecks / totalChecks * 100 : 0;

        return new Dictionary<string, object>
        {
            ["totalRules"] = totalRules,
            ["enabledRules"] = enabledRules,
            ["totalChecks"] = totalChecks,
            ["passedChecks"] = passedChecks,
            ["failedChecks"] = totalChecks - passedChecks,
            ["overallPassRate"] = Math.Round(passRate, 2)
        };
    }

    private async Task<DataSource?> GetDataSourceAsync(string dataSourceId)
    {
        var filter = Builders<DataSource>.Filter.And(
            Builders<DataSource>.Filter.Eq(d => d.Id, dataSourceId),
            Builders<DataSource>.Filter.Eq(d => d.CompanyId, _companyId),
            Builders<DataSource>.Filter.Eq(d => d.IsDeleted, false)
        );

        return await _dataSources.Find(filter).FirstOrDefaultAsync();
    }

    private async Task<QualityCheckResult> ExecuteQualityCheckLogicAsync(
        DataQualityRule rule, 
        DataSource dataSource, 
        DateTime startTime)
    {
        var result = new QualityCheckResult
        {
            RuleId = rule.Id,
            CheckTime = startTime,
            TotalRecords = 0,
            PassedRecords = 0,
            FailedRecords = 0,
            Status = QualityCheckStatus.Passed
        };

        try
        {
            // 创建数据连接器
            var connector = _connectorFactory.CreateConnector(
                dataSource.DataSourceType,
                dataSource.ConnectionString ?? "",
                dataSource.ConnectionConfig
            );

            // 根据规则类型执行不同的质量检查
            switch (rule.RuleType)
            {
                case QualityRuleType.Completeness:
                    result = await CheckCompletenessAsync(rule, connector, startTime);
                    break;
                case QualityRuleType.Uniqueness:
                    result = await CheckUniquenessAsync(rule, connector, startTime);
                    break;
                case QualityRuleType.Validity:
                    result = await CheckValidityAsync(rule, connector, startTime);
                    break;
                case QualityRuleType.Consistency:
                    result = await CheckConsistencyAsync(rule, connector, startTime);
                    break;
                case QualityRuleType.Timeliness:
                    result = await CheckTimelinessAsync(rule, connector, startTime);
                    break;
                case QualityRuleType.Accuracy:
                    result = await CheckAccuracyAsync(rule, connector, startTime);
                    break;
                default:
                    throw new NotSupportedException($"不支持的质量规则类型: {rule.RuleType}");
            }

        }
        catch (Exception ex)
        {
            result.Status = QualityCheckStatus.Failed;
            result.ErrorMessage = ex.Message;
        }

        result.EndTime = DateTime.UtcNow;
        result.ExecutionTime = (result.EndTime ?? DateTime.UtcNow) - startTime;
        result.PassRate = result.TotalRecords > 0 ? (double)result.PassedRecords / result.TotalRecords * 100 : 0;

        return result;
    }

    private async Task<QualityCheckResult> CheckCompletenessAsync(
        DataQualityRule rule, 
        IDataConnector connector, 
        DateTime startTime)
    {
        // 模拟完整性检查
        var result = new QualityCheckResult
        {
            RuleId = rule.Id,
            CheckTime = startTime,
            TotalRecords = 1000,
            PassedRecords = 950,
            FailedRecords = 50,
            Status = QualityCheckStatus.Passed,
            Metadata = new Dictionary<string, object>
            {
                ["nullCount"] = 50,
                ["emptyStringCount"] = 0
            }
        };

        return await Task.FromResult(result);
    }

    private async Task<QualityCheckResult> CheckUniquenessAsync(
        DataQualityRule rule, 
        IDataConnector connector, 
        DateTime startTime)
    {
        // 模拟唯一性检查
        var result = new QualityCheckResult
        {
            RuleId = rule.Id,
            CheckTime = startTime,
            TotalRecords = 1000,
            PassedRecords = 980,
            FailedRecords = 20,
            Status = QualityCheckStatus.Passed,
            Metadata = new Dictionary<string, object>
            {
                ["duplicateCount"] = 20
            }
        };

        return await Task.FromResult(result);
    }

    private async Task<QualityCheckResult> CheckValidityAsync(
        DataQualityRule rule, 
        IDataConnector connector, 
        DateTime startTime)
    {
        // 模拟有效性检查
        var result = new QualityCheckResult
        {
            RuleId = rule.Id,
            CheckTime = startTime,
            TotalRecords = 1000,
            PassedRecords = 990,
            FailedRecords = 10,
            Status = QualityCheckStatus.Passed,
            Metadata = new Dictionary<string, object>
            {
                ["invalidFormatCount"] = 10
            }
        };

        return await Task.FromResult(result);
    }

    private async Task<QualityCheckResult> CheckConsistencyAsync(
        DataQualityRule rule, 
        IDataConnector connector, 
        DateTime startTime)
    {
        // 模拟一致性检查
        var result = new QualityCheckResult
        {
            RuleId = rule.Id,
            CheckTime = startTime,
            TotalRecords = 1000,
            PassedRecords = 995,
            FailedRecords = 5,
            Status = QualityCheckStatus.Passed,
            Metadata = new Dictionary<string, object>
            {
                ["inconsistentCount"] = 5
            }
        };

        return await Task.FromResult(result);
    }

    private async Task<QualityCheckResult> CheckTimelinessAsync(
        DataQualityRule rule, 
        IDataConnector connector, 
        DateTime startTime)
    {
        // 模拟及时性检查
        var result = new QualityCheckResult
        {
            RuleId = rule.Id,
            CheckTime = startTime,
            TotalRecords = 1000,
            PassedRecords = 970,
            FailedRecords = 30,
            Status = QualityCheckStatus.Passed,
            Metadata = new Dictionary<string, object>
            {
                ["staleDataCount"] = 30
            }
        };

        return await Task.FromResult(result);
    }

    private async Task<QualityCheckResult> CheckAccuracyAsync(
        DataQualityRule rule, 
        IDataConnector connector, 
        DateTime startTime)
    {
        // 模拟准确性检查
        var result = new QualityCheckResult
        {
            RuleId = rule.Id,
            CheckTime = startTime,
            TotalRecords = 1000,
            PassedRecords = 985,
            FailedRecords = 15,
            Status = QualityCheckStatus.Passed,
            Metadata = new Dictionary<string, object>
            {
                ["inaccurateCount"] = 15
            }
        };

        return await Task.FromResult(result);
    }

    private async Task UpdateRuleLastCheckAsync(string ruleId, QualityCheckResult result)
    {
        var filter = Builders<DataQualityRule>.Filter.And(
            Builders<DataQualityRule>.Filter.Eq(r => r.Id, ruleId),
            Builders<DataQualityRule>.Filter.Eq(r => r.CompanyId, _companyId)
        );

        var update = Builders<DataQualityRule>.Update
            .Set(r => r.LastCheckedAt, result.CheckTime)
            .Set(r => r.LastCheckStatus, result.Status)
            .Set(r => r.LastCheckResult, result)
            .Set(r => r.UpdatedAt, DateTime.UtcNow);

        await _qualityRules.UpdateOneAsync(filter, update);
    }
}