using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Attributes;
using Platform.ApiService.Models;
using Platform.ApiService.Services;
using Platform.ServiceDefaults.Controllers;

namespace Platform.ApiService.Controllers;

/// <summary>
/// 密码本管理控制器
/// </summary>
[ApiController]
[Route("api/password-book")]

public class PasswordBookController : BaseApiController
{
    private readonly IPasswordBookService _passwordBookService;
    private readonly IPasswordGeneratorService _passwordGeneratorService;
    private readonly IPasswordStrengthService _passwordStrengthService;
    private readonly ILogger<PasswordBookController> _logger;

    /// <summary>
    /// 初始化密码本控制器
    /// </summary>
    public PasswordBookController(
        IPasswordBookService passwordBookService,
        IPasswordGeneratorService passwordGeneratorService,
        IPasswordStrengthService passwordStrengthService,
        ILogger<PasswordBookController> logger)
    {
        _passwordBookService = passwordBookService ?? throw new ArgumentNullException(nameof(passwordBookService));
        _passwordGeneratorService = passwordGeneratorService ?? throw new ArgumentNullException(nameof(passwordGeneratorService));
        _passwordStrengthService = passwordStrengthService ?? throw new ArgumentNullException(nameof(passwordStrengthService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// 创建密码本条目
    /// </summary>
    [HttpPost]
    [RequireMenu("password-book")]
    public async Task<IActionResult> CreateEntry([FromBody] CreatePasswordBookEntryRequest request)
    {
        if (string.IsNullOrEmpty(request.Platform))
            throw new ArgumentException("平台名称不能为空");
        if (string.IsNullOrEmpty(request.Account))
            throw new ArgumentException("账号不能为空");
        if (string.IsNullOrEmpty(request.Password))
            throw new ArgumentException("密码不能为空");

        var userId = RequiredUserId;
        var entry = await _passwordBookService.CreateEntryAsync(request, userId);
        return Success(entry);
    }

    /// <summary>
    /// 更新密码本条目
    /// </summary>
    [HttpPut("{id}")]
    [RequireMenu("password-book")]
    public async Task<IActionResult> UpdateEntry(string id, [FromBody] UpdatePasswordBookEntryRequest request)
    {
        var userId = RequiredUserId;
        var entry = await _passwordBookService.UpdateEntryAsync(id, request, userId);
        if (entry == null)
            throw new ArgumentException("条目不存在");
        return Success(entry);
    }

    /// <summary>
    /// 获取条目详情（包含解密后的密码）
    /// </summary>
    [HttpGet("{id}")]
    [RequireMenu("password-book")]
    public async Task<IActionResult> GetEntry(string id)
    {
        var userId = RequiredUserId;
        var entry = await _passwordBookService.GetEntryByIdAsync(id, userId);
        if (entry == null)
            throw new ArgumentException("条目不存在");
        return Success(entry);
    }

    /// <summary>
    /// 分页查询条目列表
    /// </summary>
    [HttpPost("list")]
    [RequireMenu("password-book")]
    public async Task<IActionResult> GetEntries([FromBody] PasswordBookQueryRequest request)
    {
        var userId = RequiredUserId;
        var result = await _passwordBookService.GetEntriesAsync(request, userId);
        return Success(result);
    }

    /// <summary>
    /// 删除条目
    /// </summary>
    [HttpDelete("{id}")]
    [RequireMenu("password-book")]
    public async Task<IActionResult> DeleteEntry(string id)
    {
        var userId = RequiredUserId;
        try
        {
            var result = await _passwordBookService.DeleteEntryAsync(id, userId);
            if (!result)
                throw new ArgumentException("条目不存在");
            return Success(true);
        }
        catch (UnauthorizedAccessException)
        {
            throw new ArgumentException("无权删除此条目");
        }
    }

    /// <summary>
    /// 获取所有分类
    /// </summary>
    [HttpGet("categories")]
    [RequireMenu("password-book")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _passwordBookService.GetCategoriesAsync();
        return Success(categories);
    }

    /// <summary>
    /// 获取所有标签
    /// </summary>
    [HttpGet("tags")]
    [RequireMenu("password-book")]
    public async Task<IActionResult> GetTags()
    {
        var tags = await _passwordBookService.GetTagsAsync();
        return Success(tags);
    }

    /// <summary>
    /// 生成密码
    /// </summary>
    [HttpPost("generate")]
    [RequireMenu("password-book")]
    public IActionResult GeneratePassword([FromBody] GeneratePasswordRequest request)
    {
        if (request.Length < 8 || request.Length > 32)
            throw new ArgumentException("密码长度必须在8-32之间");

        if (!request.IncludeUppercase && !request.IncludeLowercase &&
            !request.IncludeNumbers && !request.IncludeSpecialChars)
            throw new ArgumentException("至少需要选择一种字符类型");

        var password = _passwordGeneratorService.GeneratePassword(request);
        var strength = _passwordStrengthService.CheckStrength(password);

        var response = new GeneratePasswordResponse
        {
            Password = password,
            Strength = strength
        };

        return Success(response);
    }

    /// <summary>
    /// 检测密码强度
    /// </summary>
    [HttpPost("check-strength")]
    [RequireMenu("password-book")]
    public IActionResult CheckPasswordStrength([FromBody] Dictionary<string, string> request)
    {
        if (!request.TryGetValue("password", out var password) || string.IsNullOrEmpty(password))
            throw new ArgumentException("密码不能为空");

        var strength = _passwordStrengthService.CheckStrength(password);
        return Success(strength);
    }

    /// <summary>
    /// 导出密码本数据
    /// </summary>
    [HttpPost("export")]
    [RequireMenu("password-book")]
    public async Task<IActionResult> ExportEntries([FromBody] ExportPasswordBookRequest request)
    {
        if (request.Format != "json" && request.Format != "csv")
            throw new ArgumentException("导出格式必须是 json 或 csv");

        var userId = RequiredUserId;
        var entries = await _passwordBookService.ExportEntriesAsync(request, userId);

        if (request.Format == "json")
        {
            return File(
                System.Text.Encoding.UTF8.GetBytes(System.Text.Json.JsonSerializer.Serialize(entries, new System.Text.Json.JsonSerializerOptions { WriteIndented = true })),
                "application/json",
                $"password-book-export-{DateTime.UtcNow:yyyyMMddHHmmss}.json"
            );
        }
        else // CSV
        {
            var csv = new System.Text.StringBuilder();
            csv.AppendLine("平台,账号,密码,网址,分类,标签,备注,最后使用时间,创建时间,更新时间");
            foreach (var entry in entries)
            {
                var tags = string.Join(";", entry.Tags);
                var lastUsedAt = entry.LastUsedAt?.ToString("yyyy-MM-dd HH:mm:ss") ?? "";
                var createdAt = entry.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss");
                var updatedAt = entry.UpdatedAt.ToString("yyyy-MM-dd HH:mm:ss");
                csv.AppendLine($"{EscapeCsv(entry.Platform)},{EscapeCsv(entry.Account)},{EscapeCsv(entry.Password)},{EscapeCsv(entry.Url ?? "")},{EscapeCsv(entry.Category ?? "")},{EscapeCsv(tags)},{EscapeCsv(entry.Notes ?? "")},{lastUsedAt},{createdAt},{updatedAt}");
            }
            return File(
                System.Text.Encoding.UTF8.GetBytes(csv.ToString()),
                "text/csv",
                $"password-book-export-{DateTime.UtcNow:yyyyMMddHHmmss}.csv"
            );
        }
    }

    /// <summary>
    /// 获取统计信息
    /// </summary>
    [HttpGet("statistics")]
    [RequireMenu("password-book")]
    public async Task<IActionResult> GetStatistics()
    {
        var statistics = await _passwordBookService.GetStatisticsAsync();
        return Success(statistics);
    }

    /// <summary>
    /// CSV转义
    /// </summary>
    private static string EscapeCsv(string value)
    {
        if (string.IsNullOrEmpty(value))
            return "";
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
            return $"\"{value.Replace("\"", "\"\"")}\"";
        return value;
    }
}