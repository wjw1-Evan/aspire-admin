using Microsoft.AspNetCore.Http;
using System.Collections.Generic;

namespace Platform.ApiService.Models;

/// <summary>
/// 创建文件夹请求模型
/// </summary>
public class CreateFolderRequest
{
    /// <summary>文件夹名称</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>父文件夹ID</summary>
    public string ParentId { get; set; } = string.Empty;
}

/// <summary>
/// 上传文件请求模型
/// </summary>
public class UploadFileRequest
{
    /// <summary>上传的文件</summary>
    public IFormFile File { get; set; } = null!;

    /// <summary>父文件夹ID</summary>
    public string ParentId { get; set; } = string.Empty;

    /// <summary>是否覆盖同名文件</summary>
    public bool Overwrite { get; set; } = false;
}

/// <summary>
/// 重命名请求模型
/// </summary>
public class RenameRequest
{
    /// <summary>新名称</summary>
    public string NewName { get; set; } = string.Empty;
}

/// <summary>
/// 移动请求模型
/// </summary>
public class MoveRequest
{
    /// <summary>新的父文件夹ID</summary>
    public string NewParentId { get; set; } = string.Empty;
}

/// <summary>
/// 复制请求模型
/// </summary>
public class CopyRequest
{
    /// <summary>目标父文件夹ID</summary>
    public string NewParentId { get; set; } = string.Empty;

    /// <summary>新名称（可选）</summary>
    public string? NewName { get; set; }
}

/// <summary>
/// 恢复请求模型
/// </summary>
public class RestoreRequest
{
    /// <summary>新的父文件夹ID（可选）</summary>
    public string? NewParentId { get; set; }
}

/// <summary>
/// 批量操作请求模型
/// </summary>
public class BatchOperationRequest
{
    /// <summary>文件项ID列表</summary>
    public List<string> Ids { get; set; } = [];
}

/// <summary>
/// 批量移动请求模型
/// </summary>
public class BatchMoveRequest
{
    /// <summary>文件项ID列表</summary>
    public List<string> Ids { get; set; } = [];

    /// <summary>目标父文件夹ID</summary>
    public string TargetParentId { get; set; } = string.Empty;
}

/// <summary>
/// 批量复制请求模型
/// </summary>
public class BatchCopyRequest
{
    /// <summary>文件项ID列表</summary>
    public List<string> Ids { get; set; } = [];

    /// <summary>目标父文件夹ID</summary>
    public string TargetParentId { get; set; } = string.Empty;
}
