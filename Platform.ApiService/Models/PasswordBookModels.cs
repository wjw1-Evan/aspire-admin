using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Platform.ServiceDefaults.Attributes;
using Platform.ServiceDefaults.Models;

namespace Platform.ApiService.Models;

/// <summary>
/// 密码强度等级枚举
/// </summary>
public enum PasswordStrengthLevel
{
    /// <summary>弱</summary>
    Weak = 0,
    
    /// <summary>中</summary>
    Medium = 1,
    
    /// <summary>强</summary>
    Strong = 2,
    
    /// <summary>非常强</summary>
    VeryStrong = 3
}

/// <summary>
/// 密码本条目实体
/// </summary>
[BsonIgnoreExtraElements]
[BsonCollectionName("passwordBookEntries")]
public class PasswordBookEntry : MultiTenantEntity
{
    /// <summary>平台名称</summary>
    [BsonElement("platform")]
    public string Platform { get; set; } = string.Empty;

    /// <summary>账号</summary>
    [BsonElement("account")]
    public string Account { get; set; } = string.Empty;

    /// <summary>加密后的密码</summary>
    [BsonElement("encryptedPassword")]
    public string EncryptedPassword { get; set; } = string.Empty;

    /// <summary>网址</summary>
    [BsonElement("url")]
    public string? Url { get; set; }

    /// <summary>分类</summary>
    [BsonElement("category")]
    public string? Category { get; set; }

    /// <summary>标签列表</summary>
    [BsonElement("tags")]
    public List<string> Tags { get; set; } = new();

    /// <summary>备注</summary>
    [BsonElement("notes")]
    public string? Notes { get; set; }

    /// <summary>最后使用时间</summary>
    [BsonElement("lastUsedAt")]
    public DateTime? LastUsedAt { get; set; }

    /// <summary>创建者用户ID（用于加密密钥派生）</summary>
    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;
}

/// <summary>
/// 创建密码本条目请求
/// </summary>
public class CreatePasswordBookEntryRequest
{
    /// <summary>平台名称</summary>
    public string Platform { get; set; } = string.Empty;

    /// <summary>账号</summary>
    public string Account { get; set; } = string.Empty;

    /// <summary>密码（明文，后端会加密）</summary>
    public string Password { get; set; } = string.Empty;

    /// <summary>网址</summary>
    public string? Url { get; set; }

    /// <summary>分类</summary>
    public string? Category { get; set; }

    /// <summary>标签列表</summary>
    public List<string>? Tags { get; set; }

    /// <summary>备注</summary>
    public string? Notes { get; set; }
}

/// <summary>
/// 更新密码本条目请求
/// </summary>
public class UpdatePasswordBookEntryRequest
{
    /// <summary>平台名称</summary>
    public string? Platform { get; set; }

    /// <summary>账号</summary>
    public string? Account { get; set; }

    /// <summary>密码（明文，如果提供则更新）</summary>
    public string? Password { get; set; }

    /// <summary>网址</summary>
    public string? Url { get; set; }

    /// <summary>分类</summary>
    public string? Category { get; set; }

    /// <summary>标签列表</summary>
    public List<string>? Tags { get; set; }

    /// <summary>备注</summary>
    public string? Notes { get; set; }
}

/// <summary>
/// 密码本查询请求
/// </summary>
public class PasswordBookQueryRequest
{
    /// <summary>当前页码</summary>
    public int Current { get; set; } = 1;

    /// <summary>每页数量</summary>
    public int PageSize { get; set; } = 10;

    /// <summary>平台名称搜索</summary>
    public string? Platform { get; set; }

    /// <summary>账号搜索</summary>
    public string? Account { get; set; }

    /// <summary>分类筛选</summary>
    public string? Category { get; set; }

    /// <summary>标签筛选</summary>
    public List<string>? Tags { get; set; }

    /// <summary>关键词搜索（平台、账号、备注）</summary>
    public string? Keyword { get; set; }
}

/// <summary>
/// 密码本条目DTO（列表显示，不包含密码）
/// </summary>
public class PasswordBookEntryDto
{
    /// <summary>条目ID</summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>平台名称</summary>
    public string Platform { get; set; } = string.Empty;

    /// <summary>账号</summary>
    public string Account { get; set; } = string.Empty;

    /// <summary>网址</summary>
    public string? Url { get; set; }

    /// <summary>分类</summary>
    public string? Category { get; set; }

    /// <summary>标签列表</summary>
    public List<string> Tags { get; set; } = new();

    /// <summary>备注</summary>
    public string? Notes { get; set; }

    /// <summary>最后使用时间</summary>
    public DateTime? LastUsedAt { get; set; }

    /// <summary>创建时间</summary>
    public DateTime CreatedAt { get; set; }

    /// <summary>更新时间</summary>
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// 密码本条目详情DTO（包含解密后的密码）
/// </summary>
public class PasswordBookEntryDetailDto : PasswordBookEntryDto
{
    /// <summary>密码（解密后的明文）</summary>
    public string Password { get; set; } = string.Empty;
}

/// <summary>
/// 密码本列表响应
/// </summary>
public class PasswordBookListResponse
{
    /// <summary>条目列表</summary>
    public List<PasswordBookEntryDto> Data { get; set; } = new();

    /// <summary>总数</summary>
    public int Total { get; set; }

    /// <summary>是否成功</summary>
    public bool Success { get; set; } = true;

    /// <summary>当前页码</summary>
    public int Current { get; set; }

    /// <summary>每页数量</summary>
    public int PageSize { get; set; }
}

/// <summary>
/// 密码强度检测结果
/// </summary>
public class PasswordStrengthResult
{
    /// <summary>强度等级</summary>
    public PasswordStrengthLevel Level { get; set; }

    /// <summary>强度评分（0-100）</summary>
    public int Score { get; set; }

    /// <summary>强度描述</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>建议</summary>
    public List<string> Suggestions { get; set; } = new();
}

/// <summary>
/// 密码生成请求
/// </summary>
public class GeneratePasswordRequest
{
    /// <summary>密码长度（8-32）</summary>
    public int Length { get; set; } = 16;

    /// <summary>包含大写字母</summary>
    public bool IncludeUppercase { get; set; } = true;

    /// <summary>包含小写字母</summary>
    public bool IncludeLowercase { get; set; } = true;

    /// <summary>包含数字</summary>
    public bool IncludeNumbers { get; set; } = true;

    /// <summary>包含特殊字符</summary>
    public bool IncludeSpecialChars { get; set; } = true;
}

/// <summary>
/// 密码生成响应
/// </summary>
public class GeneratePasswordResponse
{
    /// <summary>生成的密码</summary>
    public string Password { get; set; } = string.Empty;

    /// <summary>密码强度</summary>
    public PasswordStrengthResult Strength { get; set; } = new();
}

/// <summary>
/// 导出密码本请求
/// </summary>
public class ExportPasswordBookRequest
{
    /// <summary>导出格式（json/csv）</summary>
    public string Format { get; set; } = "json";

    /// <summary>分类筛选（可选）</summary>
    public string? Category { get; set; }

    /// <summary>标签筛选（可选）</summary>
    public List<string>? Tags { get; set; }
}

/// <summary>
/// 密码本统计信息
/// </summary>
public class PasswordBookStatistics
{
    /// <summary>总条目数</summary>
    public int TotalEntries { get; set; }

    /// <summary>分类数量</summary>
    public int CategoryCount { get; set; }

    /// <summary>标签数量</summary>
    public int TagCount { get; set; }

    /// <summary>最近使用数量（7天内）</summary>
    public int RecentUsedCount { get; set; }
}
