using Platform.ApiService.Models;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Extensions;
using System.Linq.Dynamic.Core;
using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;

namespace Platform.ApiService.Services;

/// <summary>
/// 晓可配置服务实现
/// </summary>
public class XiaokeConfigService : IXiaokeConfigService
{
    private readonly DbContext _context;

    private readonly ITenantContext _tenantContext;

    /// <summary>
    /// 初始化晓可配置服务
    /// </summary>
    /// <param name="context">数据库上下文</param>
    /// <param name="tenantContext">租户上下文</param>
    public XiaokeConfigService(DbContext context,
        ITenantContext tenantContext
    ) {
        _context = context;
        
        _tenantContext = tenantContext ?? throw new ArgumentNullException(nameof(tenantContext));
    }

    private async Task<string> GetCurrentCompanyIdAsync()
    {
        var companyId = await _tenantContext.GetCurrentCompanyIdAsync();
        if (string.IsNullOrEmpty(companyId))
        {
            throw new UnauthorizedAccessException("未找到当前企业信息");
        }
        return companyId;
    }

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

    /// <inheritdoc/>
    public async Task<System.Linq.Dynamic.Core.PagedResult<XiaokeConfigDto>> GetConfigsAsync(Platform.ServiceDefaults.Models.PageParams queryParams)
    {
        var pagedResult = _context.Set<XiaokeConfig>().ToPagedList(queryParams);
        var configs = await pagedResult.Queryable.ToListAsync();

        return new System.Linq.Dynamic.Core.PagedResult<XiaokeConfigDto>
        {
            Queryable = configs.Select(ToDto).AsQueryable(),
            CurrentPage = pagedResult.CurrentPage,
            PageSize = pagedResult.PageSize,
            RowCount = pagedResult.RowCount,
            PageCount = pagedResult.PageCount
        };
    }

    /// <inheritdoc/>
    public async Task<XiaokeConfigDto?> GetConfigByIdAsync(string id)
    {
        var config = await _context.Set<XiaokeConfig>().FirstOrDefaultAsync(x => x.Id == id);
        return config != null ? ToDto(config) : null;
    }

    /// <inheritdoc/>
    public async Task<XiaokeConfigDto?> GetDefaultConfigAsync()
    {
        Expression<Func<XiaokeConfig, bool>> filter = c => c.IsDefault == true;
        var configs = await _context.Set<XiaokeConfig>().Where(filter).Take(1).ToListAsync();
        var defaultConfig = configs.FirstOrDefault();
        return defaultConfig != null ? ToDto(defaultConfig) : null;
    }

    /// <inheritdoc/>
    public async Task<XiaokeConfigDto> CreateConfigAsync(CreateXiaokeConfigRequest request)
    {
        var companyId = await GetCurrentCompanyIdAsync();

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
        };

        await _context.Set<XiaokeConfig>().AddAsync(config);
        await _context.SaveChangesAsync();

        var createdConfig = await _context.Set<XiaokeConfig>().FirstOrDefaultAsync(x => x.Id == config.Id);
        if (createdConfig == null)
        {
            throw new InvalidOperationException("创建配置后无法获取配置信息");
        }

        return ToDto(createdConfig);
    }

    /// <inheritdoc/>
    public async Task<XiaokeConfigDto?> UpdateConfigAsync(string id, UpdateXiaokeConfigRequest request)
    {
        var existingConfig = await _context.Set<XiaokeConfig>().FirstOrDefaultAsync(x => x.Id == id);
        if (existingConfig == null)
        {
            throw new KeyNotFoundException($"配置 {id} 不存在");
        }

        if (!string.IsNullOrEmpty(request.Name))
            existingConfig.Name = request.Name;
        if (!string.IsNullOrEmpty(request.Model))
            existingConfig.Model = request.Model;
        if (request.SystemPrompt != null)
            existingConfig.SystemPrompt = request.SystemPrompt;
        if (request.Temperature.HasValue)
            existingConfig.Temperature = request.Temperature.Value;
        if (request.MaxTokens.HasValue)
            existingConfig.MaxTokens = request.MaxTokens.Value;
        if (request.TopP.HasValue)
            existingConfig.TopP = request.TopP.Value;
        if (request.FrequencyPenalty.HasValue)
            existingConfig.FrequencyPenalty = request.FrequencyPenalty.Value;
        if (request.PresencePenalty.HasValue)
            existingConfig.PresencePenalty = request.PresencePenalty.Value;
        if (request.IsEnabled.HasValue)
            existingConfig.IsEnabled = request.IsEnabled.Value;

        if (request.IsDefault.HasValue && request.IsDefault.Value)
        {
            await UnsetOtherDefaultConfigsAsync(id);
            existingConfig.IsDefault = true;
        }
        else if (request.IsDefault.HasValue)
        {
            existingConfig.IsDefault = request.IsDefault.Value;
        }

        await _context.SaveChangesAsync();

        return await GetConfigByIdAsync(id);
    }

    /// <inheritdoc/>
    public async Task<bool> DeleteConfigAsync(string id)
    {
        var existingConfig = await _context.Set<XiaokeConfig>().FirstOrDefaultAsync(x => x.Id == id);
        if (existingConfig == null) return false;
        _context.Set<XiaokeConfig>().Remove(existingConfig);
        await _context.SaveChangesAsync();
        return true;
    }

    /// <inheritdoc/>
    public async Task<bool> SetDefaultConfigAsync(string id)
    {
        await UnsetOtherDefaultConfigsAsync(id);

        var existingConfig = await _context.Set<XiaokeConfig>().FirstOrDefaultAsync(x => x.Id == id);
        if (existingConfig != null)
        {
            existingConfig.IsDefault = true;
            await _context.SaveChangesAsync();
        }

        return await _context.Set<XiaokeConfig>().AnyAsync(x => x.Id == id);
    }

    private async Task UnsetOtherDefaultConfigsAsync(string? excludeId = null)
    {
        Expression<Func<XiaokeConfig, bool>> filter = c => c.IsDefault == true;

        if (!string.IsNullOrEmpty(excludeId))
        {
            filter = c => c.IsDefault == true && c.Id != excludeId;
        }

        var defaultConfigs = await _context.Set<XiaokeConfig>().Where(filter).ToListAsync();

        if (defaultConfigs.Any())
        {
            foreach (var config in defaultConfigs)
            {
                if (config.Id != null)
                {
                    config.IsDefault = false;
                }
            }
            await _context.SaveChangesAsync();
        }
    }
}