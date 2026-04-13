using Microsoft.AspNetCore.Http;
using System.Collections.Generic;

namespace Platform.ApiService.Models;

/// <summary>
/// 创建版本请求模型
/// </summary>
public class CreateVersionRequest
{
    /// <summary>文件内容</summary>
    public IFormFile File { get; set; } = null!;

    /// <summary>版本说明</summary>
    public string? Comment { get; set; }
}

/// <summary>
/// 批量删除版本请求模型
/// </summary>
public class BatchDeleteVersionsRequest
{
    /// <summary>版本ID列表</summary>
    public List<string> VersionIds { get; set; } = [];
}
