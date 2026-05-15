using System.Text.Json;
using Microsoft.Extensions.AI;
using Microsoft.Extensions.Diagnostics.HealthChecks;
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
    private readonly IParkVisitService _visitService;
    private readonly IChatClient _openAiClient;
    private readonly ILogger<ParkStatisticsService> _logger;

    /// <summary>
    /// 初始化园区统计服务
    /// </summary>
    public ParkStatisticsService(
        IParkAssetService assetService,
        IParkInvestmentService investmentService,
        IParkTenantService tenantService,
        IParkEnterpriseServiceService enterpriseService,
        IParkVisitService visitService,
        IChatClient openAiClient,
        ILogger<ParkStatisticsService> logger)
    {
        _assetService = assetService;
        _investmentService = investmentService;
        _tenantService = tenantService;
        _enterpriseService = enterpriseService;
        _visitService = visitService;
        _openAiClient = openAiClient;
        _logger = logger;
    }

    /// <summary>
    /// 生成 AI 统计报告
    /// </summary>
    public async Task<string> GenerateAiReportAsync(DateTime? startDate = null, DateTime? endDate = null, object? statisticsData = null, string? culture = "zh-CN")
    {
        // 1. 获取所有模块统计数据
        object statsData;
        var periodDesc = startDate.HasValue && endDate.HasValue
            ? culture switch
            {
                "zh-CN" => $"{startDate:yyyy-MM-dd} 至 {endDate.Value.AddDays(-1):yyyy-MM-dd}",
                _ => $"{startDate:yyyy-MM-dd} to {endDate.Value.AddDays(-1):yyyy-MM-dd}"
            }
            : culture switch
            {
                "zh-CN" => "本月",
                _ => "This Month"
            };

        var visitStats = await _visitService.GetVisitStatisticsAsync(startDate, endDate);

        if (statisticsData != null)
        {
            statsData = new
            {
                Period = periodDesc,
                Data = statisticsData,
                Visit = visitStats
            };
        }
        else
        {
            var assetStats = await _assetService.GetAssetStatisticsAsync(startDate, endDate);
            var investmentStats = await _investmentService.GetStatisticsAsync(startDate, endDate);
            var tenantStats = await _tenantService.GetStatisticsAsync(startDate, endDate);
            var serviceStats = await _enterpriseService.GetStatisticsAsync(startDate, endDate);

            statsData = new
            {
                Period = periodDesc,
                Asset = assetStats,
                Investment = investmentStats,
                Tenant = tenantStats,
                Service = serviceStats,
                Visit = visitStats
            };
        }


        var statsJson = JsonSerializer.Serialize(statsData, new JsonSerializerOptions { WriteIndented = true });

        // 3. 构建 Prompt
        var languageName = culture switch
        {
            "zh-CN" => "简体中文",
            "zh-TW" => "繁體中文",
            _ => culture
        };
        var isChinese = culture == "zh-CN" || culture == "zh-TW";
        var monthComparison = isChinese ? "本月 vs 上月" : "This Month vs Last Month";
        var systemPrompt = $"You are a professional park operations data analyst with deep expertise in commercial real estate operations. Generate a comprehensive, insightful Markdown operations analysis report. Focus on trends, root causes, and actionable insights behind the data. ALL content MUST be in {languageName}. Strictly NO mixing of languages. If the data contains text in other languages, translate it into {languageName}.";
        var userPrompt = $@"## LANGUAGE RULE
The ENTIRE report MUST be written in {languageName}. EVERY line including titles, tables, descriptions, analysis, and suggestions MUST be in {languageName}. NEVER use any other language. If data contains Chinese text (e.g. 本月, 至), TRANSLATE it to {languageName}.

请基于以下全面的园区运营统计数据，生成一份深度运营分析报告：

{statsJson}

## 报告结构要求

### 0. 📋 报告标题
第一行必须是 Markdown H1 标题（#），包含 🏢 Emoji，标题中必须提及时间段 {periodDesc}。标题必须使用 {languageName}。

### 1. 📊 总体概览（Executive Summary）
用 3-5 句话高度概括本周期园区整体运营状况：
- 关键绩效指标（出租率、收缴率、完成率等）的总体健康度评估
- 相比上期（环比）的总体走势：整体向好/平稳/需关注
- 用一个数据亮点和一个需关注的问题点引起读者注意

### 2. 🔍 各模块详细分析

每个模块必须包含：
A. 一个**对比表格**（本期 vs 上期）
B. 一段**深度分析**（不仅描述数据，更要分析原因和影响）

#### 🏭 资产管理
对比表格需包含：
| 指标 | 本期 | 上期 | 变化 |
|:---|---:|---:|:---:|
| 出租率 | xx% | xx% | ⬆️/⬇️ x.xx% |
| 已租面积 | xxx ㎡ | xxx ㎡ | ⬆️/⬇️ x.xx% |
| 楼宇总数 | xx 栋 | xx 栋 | ⬆️/⬇️ x.xx% |
| 平均租金单价 | x.xx 元/㎡/月 | - | - |

深度分析关注：
- **房源结构**：分析 UnitTypeDistribution 中各类型房源（办公室/商铺/厂房等）的占比结构是否合理
- **楼宇状况**：分析 BuildingTypeDistribution 和 BuildingStatusDistribution，识别不同类型楼宇的运营状况差异
- **租金水平**：结合 AverageUnitPrice 评估租金定价的市场竞争力，判断是否有调价空间
- **资产利用效率**：结合出租率变化趋势，判断是结构性空置还是季节性波动

#### 📈 招商管理
对比表格需包含：
| 指标 | 本期 | 上期 | 变化 |
|:---|---:|---:|:---:|
| 新增线索 | xx 条 | xx 条 | ⬆️/⬇️ x.xx% |
| 本期签约 | xx 个 | xx 个 | ⬆️/⬇️ x.xx% |
| 转化率 | x.xx% | - | - |
| 洽谈中项目 | xx 个 | - | - |

深度分析关注：
- **线索质量**：通过 LeadsBySource 分析各来源渠道（转介绍/线上/招商活动等）的贡献度，识别高效渠道
- **行业匹配**：通过 LeadsByIndustry 分析线索行业分布是否与园区定位一致，评估产业聚集度
- **招商漏斗**：结合 ProjectsByStage 阶段分布，评估从线索→洽谈→签约的转化效率，识别漏斗瓶颈
- **项目储备**：分析 ProjectsInNegotiation 和 SignedProjects 的变化趋势，预判未来签约潜力

#### 👥 租户管理
对比表格需包含：
| 指标 | 本期 | 上期 | 变化 |
|:---|---:|---:|:---:|
| 有效租户 | xx 家 | xx 家 | ⬆️/⬇️ x.xx% |
| 月租金收入 | x.xx 万 | x.xx 万 | ⬆️/⬇️ x.xx% |
| 实收金额 | x.xx 万 | x.xx 万 | ⬆️/⬇️ x.xx% |
| 应收金额 | x.xx 万 | x.xx 万 | ⬆️/⬇️ x.xx% |
| 收缴率 | x.xx% | x.xx% | ⬆️/⬇️ x.xx% |

深度分析关注：
- **收缴健康度**：重点分析 TotalReceived/TotalExpected 差距，判断欠费风险。如果 CollectionRate 下降，需分析是哪些租户拖欠
- **到期风险**：通过 ContractsExpiringByQuarter 分析未来各季度到期合同量，识别集中到期风险。如有季度到期量异常高，需预警
- **租户结构**：结合 TenantsByIndustry 行业分布和 PaymentCycleDistribution 付款周期分布，评估租户组合的抗风险能力
- **租金水平**：分析 MonthlyRent 环比变化，判断是租金调整还是租户结构变化导致的

#### 🛠️ 企业服务
对比表格需包含：
| 指标 | 本期 | 上期 | 变化 |
|:---|---:|---:|:---:|
| 服务申请 | xx 件 | xx 件 | ⬆️/⬇️ x.xx% |
| 平均评分 | x.xx / 5 | x.xx / 5 | ⬆️/⬇️ x.xx% |
| 处理时长 | x.x 小时 | - | - |
| 满意度 | x.xx% | - | - |

深度分析关注：
- **服务效率**：结合 AvgResponseTime（平均响应时间）和 ApproxHandlingTime（平均处理时长），评估服务响应速度是否达标。如果处理时长过长，分析瓶颈环节
- **满意度分析**：结合 AverageRating、SatisfactionRate 和评分趋势，评估服务质量变化。如有下滑，结合 RequestsByCategory 分析是哪类服务满意度低
- **工单分布**：通过 RequestsByPriority 分析紧急工单占比是否合理，通过 RequestsByHandler 分析工作量分配是否均衡
- **完成质量**：结合 CompletedRequests 占比和关闭率，评估团队整体交付能力

#### 📋 走访管理
对比表格需包含：
| 指标 | 本期 | 上期 | 变化 |
|:---|---:|---:|:---:|
| 待处理任务 | xx 件 | xx 件 | ⬆️/⬇️ x.xx% |
| 已完成任务 | xx 件 | xx 件 | ⬆️/⬇️ x.xx% |
| 完成率 | x.xx% | x.xx% | ⬆️/⬇️ x.xx% |
| 活跃企管员 | xx 人 | xx 人 | ⬆️/⬇️ x.xx% |
| 考核评分 | x.x / 5 | x.x / 5 | ⬆️/⬇️ x.xx% |

深度分析关注：
- **走访执行力**：分析 CompletionRate 的变化趋势，判断走访计划的执行力度是否达标
- **考核质量**：分析 AverageScore 和 TotalAssessments 的环比变化，评估服务质量是否持续提升
- **团队活力**：通过 ActiveManagers 和 ManagerRanking 分析企管员参与度，识别走访积极性变化
- **知识库运营**：结合 TotalQuestions 和 FrequentlyUsedQuestions 分析知识库的覆盖率和实用性
- **月度趋势**：通过 MonthlyTrends 分析过去 6 个月的走访量变化，判断是否存在季节性规律或持续增长/下滑趋势

### 3. 📈 交叉趋势洞察
跨模块关联分析，发现更深层的业务关联：
- **出租率 vs 招商线索**：出租率下降是否伴随着线索减少？如果是，说明市场吸引力在下降
- **租金 vs 收缴率**：租金上涨是否导致收缴率下降？（租户支付意愿与租金水平的平衡）
- **走访频率 vs 租户满意度**：走访完成率高的月份，企业服务评分是否也更高？
- **到期合同 vs 新签约**：季度到期量大时，新签约量是否足够覆盖流失风险？

### 4. ⚠️ 问题与风险预警
务必量化预警，避免笼统描述：
- **出租率风险**：如出租率连续低于 xx%，或环比下滑超过 5%，需预警空置率持续上升
- **收缴风险**：如 CollectionRate < 90%，识别欠费金额和主要欠费租户特征
- **到期风险**：如某季度到期合同数超过有效合同 30%，预警集中退租风险
- **服务风险**：如 AverageRating 连续两期下滑或低于 3.5，预警服务品质恶化
- **走访风险**：如 CompletionRate < 60% 或连续下滑，预警走访计划执行不力

### 5. 💡 改进建议（SMART 原则驱动）

每条建议必须严格遵循 **SMART 原则**，以结构化方式呈现。每个建议包含以下 5 个维度：

#### S — Specific（具体）
- 明确指出**针对哪个模块、哪个指标、哪个问题**
- 给出**具体的操作动作**，而非模糊方向
- 示例 ❌：「加强招商力度」
- 示例 ✅：「针对近3个月线索量下降30%的线上渠道，增加百度SEM投放预算并优化落地页转化路径」

#### M — Measurable（可衡量）
- 每条建议必须附带**可量化的成功标准**
- 明确写出「预计将 XX 指标从 X% 提升至 Y%」
- 示例 ❌：「提升出租率」
- 示例 ✅：「通过定向招商活动，预计在 2 个月内将出租率从 75% 提升至 80%」

#### A — Achievable（可达成）
- 建议需基于**现有资源和可行范围**
- 评估实施的**成本、人力、时间可行性**
- 说明建议的**可落地性**（如有类似成功案例可引用数据佐证）

#### R — Relevant（相关）
- 建议必须**直接关联**到前面识别的问题与风险
- 说明为什么这条建议能解决第 4 节中指出的特定问题
- 建议之间应有**逻辑递进关系**（先解决根源问题，再优化衍生指标）

#### T — Time-bound（有时限）
- 每条建议必须有明确的**时间节点**或**时间窗口**
- 使用「1 周内」「本季度」「30 天内」「下一周期前」等具体时限
- 区分**短期见效**（1-4 周）和**长期建设**（1-3 个月）的建议

#### 输出格式

对报告中识别的每个核心问题，生成一条完整 SMART 建议，格式如下：

> **建议 N：** （一句话概括）
> - 🎯 **目标**：具体要改善的指标和期望值
> - 🔧 **措施**：具体的操作步骤和执行方案
> - 📅 **时限**：完成时间节点
> - 📊 **预期效果**：执行后可量化的改善结果
> - 🔴🟡🟢 **优先级**：高/中/低

#### 要求
- 至少输出 **3 条**建议
- **避免**空泛套话（如「加强管理」「提高意识」「优化流程」），每句话必须有实质内容
- **数据驱动**：每条建议引用的数据必须来自本报告分析结果
- **分层输出**：按优先级从高到低排列，最紧急的排第一

## 格式规范
1. **Emoji 使用**：每个一级/二级标题前加 1 个相关 Emoji，关键数据前也适当使用（📊📈📉⚠️✅🎯💡）
2. **对比表格**：每个模块表格必须包含且格式统一：
   | 指标 | 本期 | 上期 | 变化 |
   |:---|---:|---:|:---:|
   表头必须带对齐分隔符（:---），数值列右对齐，变化列居中，变化列使用 ⬆️/⬇️/➡️ 加百分比
3. **数据高亮**：**加粗** 核心指标数值（如出租率、收缴率、完成率等）
4. **引用块**：`> ` 引用块用于突出关键结论或核心洞察，每个模块至少 1 处
5. **单位标注**：金额统一标注单位（万元/元），面积统一标注（㎡），百分比保留到小数点后两位
6. **语气**：专业、客观、数据驱动、具有建设性。避免模糊表述（如「有所提升」改为「提升 x.xx%」）";

        // 4. 调用 LLM
        // 4. 调用 LLM
        // 注意：Aspire 注入的 IChatClient 可能通过 ConnectionString 配置，因此不检查 _aiOptions 的 ApiKey 和 Endpoint

        try
        {


            var messages = new List<Microsoft.Extensions.AI.ChatMessage>
            {
                new (ChatRole.System, systemPrompt),
                new (ChatRole.User, userPrompt)
            };

            var completion = await _openAiClient.GetResponseAsync(messages);

            return completion.Text;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "生成 AI 报告失败");
            return $"生成报告时发生错误：{ex.Message}。请联系管理员检查 AI 服务配置。";
        }
    }
}
