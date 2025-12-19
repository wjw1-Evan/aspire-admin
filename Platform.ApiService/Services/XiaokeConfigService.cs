using Platform.ApiService.Extensions;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using System.Text.Json;
using MongoDB.Driver;

namespace Platform.ApiService.Services;

/// <summary>
/// 小科配置服务实现
/// </summary>
public class XiaokeConfigService : IXiaokeConfigService
{
    private readonly IDatabaseOperationFactory<XiaokeConfig> _configFactory;
    private readonly ITenantContext _tenantContext;

    /// <summary>
    /// 初始化小科配置服务
    /// </summary>
    /// <param name="configFactory">配置数据操作工厂</param>
    /// <param name="tenantContext">租户上下文</param>
    public XiaokeConfigService(
        IDatabaseOperationFactory<XiaokeConfig> configFactory,
        ITenantContext tenantContext)
    {
        _configFactory = configFactory ?? throw new ArgumentNullException(nameof(configFactory));
        _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
    }

    /// <summary>
    /// 获取当前用户的企业ID（从数据库获取，不使用 JWT token）
    /// </summary>
    private async Task<string> GetCurrentCompanyIdAsync()
    {
        var companyId = await _tenantContext.GetCurrentCompanyIdAsync();
        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }
        return companyId;
    }

    /// <summary>
    /// 将实体转换为DTO
    /// </summary>
    private static XiaokeConfigDto ToDto(XiaokeConfig config)
    {
        return new XiaokeConfigDto
        {
            Id = config.Id,
            Name = config.Name,
            Model = config.Model,
            SystemPrompt = config.SystemPrompt,
            Temperature = config.Temperature,
            MaxTokens = config.MaxTokens,
            TopP = config.TopP,
            FrequencyPenalty = config.FrequencyPenalty,
            PresencePenalty = config.PresencePenalty,
            IsEnabled = config.IsEnabled,
            IsDefault = config.IsDefault,
            CreatedAt = config.CreatedAt,
            UpdatedAt = config.UpdatedAt
        };
    }

    /// <summary>
    /// 获取配置列表
    /// ✅ 使用数据工厂的自动企业过滤（XiaokeConfig 实现了 IMultiTenant）
    /// </summary>
    public async Task<XiaokeConfigListResponse> GetConfigsAsync(XiaokeConfigQueryParams queryParams)
    {
        var filterBuilder = _configFactory.CreateFilterBuilder();

        // 按名称筛选
        if (!string.IsNullOrEmpty(queryParams.Name))
        {
#pragma warning disable CS8603 // FilterBuilder.Regex 总是返回 this，不会返回 null
            filterBuilder = filterBuilder.Regex(c => c.Name, queryParams.Name, "i");
#pragma warning restore CS8603
        }

        // 按启用状态筛选
        if (queryParams.IsEnabled.HasValue)
        {
            filterBuilder = filterBuilder.Equal(c => c.IsEnabled, queryParams.IsEnabled.Value);
        }

        var filter = filterBuilder.Build();

        // ✅ 数据工厂会自动添加企业过滤（因为 XiaokeConfig 实现了 IMultiTenant）
        // 获取总数
        var total = await _configFactory.CountAsync(filter);

        // 分页 - FindPagedAsync 期望的是 page（页码），而不是 skip
        var sortBuilder = _configFactory.CreateSortBuilder();
        sortBuilder.Descending(c => c.UpdatedAt);
        var (configs, _) = await _configFactory.FindPagedAsync(filter, sortBuilder.Build(), queryParams.Current, queryParams.PageSize);

        // 排序处理
        if (!string.IsNullOrEmpty(queryParams.Sorter))
        {
            var sorter = JsonSerializer.Deserialize<Dictionary<string, string>>(queryParams.Sorter);
            if (sorter != null)
            {
                // 这里可以根据需要实现更复杂的排序逻辑
                configs = configs.OrderBy(c => c.Name).ToList();
            }
        }

        return new XiaokeConfigListResponse
        {
            Data = configs.Select(ToDto).ToList(),
            Total = (int)total,
            Success = true,
            PageSize = queryParams.PageSize,
            Current = queryParams.Current
        };
    }

    /// <summary>
    /// 根据ID获取配置
    /// ✅ 使用数据工厂的自动企业过滤（XiaokeConfig 实现了 IMultiTenant）
    /// </summary>
    public async Task<XiaokeConfigDto?> GetConfigByIdAsync(string id)
    {
        // ✅ 数据工厂会自动添加企业过滤（因为 XiaokeConfig 实现了 IMultiTenant）
        var config = await _configFactory.GetByIdAsync(id);
        return config != null ? ToDto(config) : null;
    }

    /// <summary>
    /// 获取当前企业的默认配置
    /// ✅ 使用数据工厂的自动企业过滤（XiaokeConfig 实现了 IMultiTenant）
    /// </summary>
    public async Task<XiaokeConfigDto?> GetDefaultConfigAsync()
    {
        var filterBuilder = _configFactory.CreateFilterBuilder();
        var filter = filterBuilder.Equal(c => c.IsDefault, true).Build();

        // ✅ 数据工厂会自动添加企业过滤（因为 XiaokeConfig 实现了 IMultiTenant）
        var configs = await _configFactory.FindAsync(filter, limit: 1);
        var defaultConfig = configs.FirstOrDefault();
        return defaultConfig != null ? ToDto(defaultConfig) : null;
    }

    /// <summary>
    /// 创建配置
    /// </summary>
    public async Task<XiaokeConfigDto> CreateConfigAsync(CreateXiaokeConfigRequest request)
    {
        // 获取当前企业ID进行多租户过滤（从数据库获取，不使用 JWT token）
        var companyId = await GetCurrentCompanyIdAsync();

        // 如果设置为默认配置，先取消其他默认配置
        if (request.IsDefault)
        {
            await UnsetOtherDefaultConfigsAsync();
        }

        var config = new XiaokeConfig
        {
            CompanyId = companyId,
            Name = request.Name,
            Model = request.Model,
            SystemPrompt = request.SystemPrompt,
            Temperature = request.Temperature,
            MaxTokens = request.MaxTokens,
            TopP = request.TopP,
            FrequencyPenalty = request.FrequencyPenalty,
            PresencePenalty = request.PresencePenalty,
            IsEnabled = request.IsEnabled,
            IsDefault = request.IsDefault
            // ✅ DatabaseOperationFactory.CreateAsync 会自动设置 IsDeleted = false, CreatedAt, UpdatedAt
        };

        await _configFactory.CreateAsync(config);
        
        // 重新获取创建的实体，确保所有字段（包括 Id、CreatedAt、UpdatedAt 等）都已正确设置
        // ✅ 数据工厂会自动添加企业过滤（因为 XiaokeConfig 实现了 IMultiTenant）
        var createdConfig = await _configFactory.GetByIdAsync(config.Id);
        if (createdConfig == null)
        {
            throw new InvalidOperationException("创建配置后无法获取配置信息");
        }
        
        return ToDto(createdConfig);
    }

    /// <summary>
    /// 更新配置（使用原子操作）
    /// ✅ 使用数据工厂的自动企业过滤（XiaokeConfig 实现了 IMultiTenant）
    /// </summary>
    public async Task<XiaokeConfigDto?> UpdateConfigAsync(string id, UpdateXiaokeConfigRequest request)
    {
        var filter = _configFactory.CreateFilterBuilder()
            .Equal(c => c.Id, id)
            .Build();

        var updateBuilder = _configFactory.CreateUpdateBuilder();

        if (!string.IsNullOrEmpty(request.Name))
            updateBuilder.Set(c => c.Name, request.Name);

        if (!string.IsNullOrEmpty(request.Model))
            updateBuilder.Set(c => c.Model, request.Model);

        if (request.SystemPrompt != null)
            updateBuilder.Set(c => c.SystemPrompt, request.SystemPrompt);

        if (request.Temperature.HasValue)
            updateBuilder.Set(c => c.Temperature, request.Temperature.Value);

        if (request.MaxTokens.HasValue)
            updateBuilder.Set(c => c.MaxTokens, request.MaxTokens.Value);

        if (request.TopP.HasValue)
            updateBuilder.Set(c => c.TopP, request.TopP.Value);

        if (request.FrequencyPenalty.HasValue)
            updateBuilder.Set(c => c.FrequencyPenalty, request.FrequencyPenalty.Value);

        if (request.PresencePenalty.HasValue)
            updateBuilder.Set(c => c.PresencePenalty, request.PresencePenalty.Value);

        if (request.IsEnabled.HasValue)
            updateBuilder.Set(c => c.IsEnabled, request.IsEnabled.Value);

        // 如果设置为默认配置，先取消其他默认配置
        if (request.IsDefault.HasValue && request.IsDefault.Value)
        {
            await UnsetOtherDefaultConfigsAsync(id);
            updateBuilder.Set(c => c.IsDefault, true);
        }
        else if (request.IsDefault.HasValue && !request.IsDefault.Value)
        {
            updateBuilder.Set(c => c.IsDefault, false);
        }

        var update = updateBuilder.Build();

        var options = new FindOneAndUpdateOptions<XiaokeConfig>
        {
            ReturnDocument = ReturnDocument.After,
            IsUpsert = false
        };

        var updatedConfig = await _configFactory.FindOneAndUpdateAsync(filter, update, options);

        if (updatedConfig == null)
        {
            throw new KeyNotFoundException($"配置 {id} 不存在");
        }

        return await GetConfigByIdAsync(id);
    }

    /// <summary>
    /// 删除配置（软删除）
    /// ✅ 使用数据工厂的自动企业过滤（XiaokeConfig 实现了 IMultiTenant）
    /// </summary>
    public async Task<bool> DeleteConfigAsync(string id)
    {
        var filter = _configFactory.CreateFilterBuilder()
            .Equal(c => c.Id, id)
            .Build();

        // ✅ 数据工厂会自动添加企业过滤（因为 XiaokeConfig 实现了 IMultiTenant）
        var result = await _configFactory.FindOneAndSoftDeleteAsync(filter);
        return result != null;
    }

    /// <summary>
    /// 设置默认配置（自动取消其他默认配置）
    /// ✅ 使用数据工厂的自动企业过滤（XiaokeConfig 实现了 IMultiTenant）
    /// </summary>
    public async Task<bool> SetDefaultConfigAsync(string id)
    {
        // 先取消其他默认配置
        await UnsetOtherDefaultConfigsAsync(id);

        // 设置当前配置为默认
        var filter = _configFactory.CreateFilterBuilder()
            .Equal(c => c.Id, id)
            .Build();

        var updateBuilder = _configFactory.CreateUpdateBuilder();
        updateBuilder.Set(c => c.IsDefault, true);
        var update = updateBuilder.Build();

        var options = new FindOneAndUpdateOptions<XiaokeConfig>
        {
            ReturnDocument = ReturnDocument.After,
            IsUpsert = false
        };

        var result = await _configFactory.FindOneAndUpdateAsync(filter, update, options);
        return result != null;
    }

    /// <summary>
    /// 取消其他默认配置（排除指定ID）
    /// ✅ 使用数据工厂的自动企业过滤（XiaokeConfig 实现了 IMultiTenant）
    /// </summary>
    private async Task UnsetOtherDefaultConfigsAsync(string? excludeId = null)
    {
        var filterBuilder = _configFactory.CreateFilterBuilder()
            .Equal(c => c.IsDefault, true);

        if (!string.IsNullOrEmpty(excludeId))
        {
            filterBuilder = filterBuilder.NotEqual(c => c.Id, excludeId);
        }

        var filter = filterBuilder.Build();

        // ✅ 数据工厂会自动添加企业过滤（因为 XiaokeConfig 实现了 IMultiTenant）
        var defaultConfigs = await _configFactory.FindAsync(filter);

        if (defaultConfigs.Any())
        {
            var updateBuilder = _configFactory.CreateUpdateBuilder();
            updateBuilder.Set(c => c.IsDefault, false);
            var update = updateBuilder.Build();

            var ids = defaultConfigs.Select(c => c.Id).ToList();
            await _configFactory.UpdateManyAsync(
                _configFactory.CreateFilterBuilder().In(c => c.Id, ids).Build(),
                update
            );
        }
    }
}
