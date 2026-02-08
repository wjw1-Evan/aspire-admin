using System.Text.Json;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using OpenAI;
using OpenAI.Chat;
using Platform.ApiService.Models;
using Platform.ApiService.Options;


namespace Platform.ApiService.Services;

/// <summary>
/// 园区统计报表服务实现
/// </summary>
public class ParkStatisticsService : IParkStatisticsService
{
    private readonly IParkAssetService _assetService;
    private readonly IParkInvestmentService _investmentService;
    private readonly IParkTenantService _tenantService;
    private readonly IParkEnterpriseServiceService _enterpriseService;
    private readonly OpenAIClient _openAiClient;
    private readonly AiCompletionOptions _aiOptions;
    private readonly ILogger<ParkStatisticsService> _logger;

    /// <summary>
    /// 初始化园区统计服务
    /// </summary>
    public ParkStatisticsService(
        IParkAssetService assetService,
        IParkInvestmentService investmentService,
        IParkTenantService tenantService,
        IParkEnterpriseServiceService enterpriseService,
        OpenAIClient openAiClient,
        IOptions<AiCompletionOptions> aiOptions,
        ILogger<ParkStatisticsService> logger)
    {
        _assetService = assetService;
        _investmentService = investmentService;
        _tenantService = tenantService;
        _enterpriseService = enterpriseService;
        _openAiClient = openAiClient;
        _aiOptions = aiOptions.Value;
        _logger = logger;
    }

    /// <summary>
    /// 生成 AI 统计报告
    /// </summary>
    public async Task<string> GenerateAiReportAsync(StatisticsPeriod period = StatisticsPeriod.Month,
        DateTime? startDate = null, DateTime? endDate = null)
    {
        // 1. 获取所有模块统计数据
        var assetStats = await _assetService.GetAssetStatisticsAsync(period, startDate, endDate);
        var investmentStats = await _investmentService.GetStatisticsAsync(period, startDate, endDate);
        var tenantStats = await _tenantService.GetStatisticsAsync(period, startDate, endDate);
        var serviceStats = await _enterpriseService.GetStatisticsAsync(period, startDate, endDate);

        // 2. 准备提示词上下文
        var periodDesc = period == StatisticsPeriod.Custom
            ? $"{startDate:yyyy-MM-dd} 至 {endDate:yyyy-MM-dd}"
            : period.ToString();

        var statsData = new
        {
            Period = periodDesc,
            Asset = assetStats,
            Investment = investmentStats,
            Tenant = tenantStats,
            Service = serviceStats
        };

        var statsJson = JsonSerializer.Serialize(statsData, new JsonSerializerOptions { WriteIndented = true });

        // 3. 构建 Prompt
        var systemPrompt = "你是一个专业的园区运营数据分析师。请根据提供的园区各模块运营数据，通过 markdown 格式生成一份详细的运营分析报告。报告应重点关注数据背后的趋势和洞察。";
        var userPrompt = $@"请基于以下统计数据生成运营分析报告：

{statsJson}

报告要求：
1. **总体概览**：简要总结本周期通过关键指标体现的园区运营状况，重点提及关键绩效指标的完成情况。
2. **各模块详细分析**：
   - **资产管理**：重点分析出租率、空置率的 **同比/环比变化**，以及可能的原因。
   - **招商管理**：分析线索获取能力（新增线索同比/环比）、转化效率、项目签约进度及招商漏斗健康度。
   - **租户管理**：关注租户总量变化（同比/环比）、合同到期风险及行业分布集中度。
   - **企业服务**：评估服务响应效率、客户满意度及同比/环比趋势。
3. **趋势洞察**：
   - 识别显著的增长点或下滑点（例如：某项指标环比增长或下滑超过 10%）。
   - 分析这些变化可能带来的长期影响。
4. **问题与风险**：识别数据中的潜在问题（如出租率连续下滑、投诉增多、合同集中到期风险）。
5. **改进建议**：基于数据提出具体的运营改进建议（例如：针对空置房源的去化策略、提升服务满意度的具体措施）。

请使用 Markdown 格式输出，使用各级标题清晰组织内容。语气需专业、客观且具有建设性。数据引用请精确到小数点后两位。";

        // 4. 调用 LLM
        // 4. 调用 LLM
        // 注意：Aspire 注入的 OpenAIClient 可能通过 ConnectionString 配置，因此不检查 _aiOptions 的 ApiKey 和 Endpoint

        try
        {
            var model = string.IsNullOrWhiteSpace(_aiOptions.Model) ? "gpt-4o-mini" : _aiOptions.Model;
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
            return completion.Value.Content[0].Text;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "生成 AI 报告失败");
            return $"生成报告时发生错误：{ex.Message}。请联系管理员检查 AI 服务配置。";
        }
    }
}
