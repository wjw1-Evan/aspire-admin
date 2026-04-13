using System.ComponentModel.DataAnnotations;

namespace Platform.ApiService.Models;

public class UserQuotaSettingDto
{
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public long TotalQuota { get; set; } = 0;
    public int? WarningThreshold { get; set; }
    public bool? IsEnabled { get; set; }
}

public class FilePreviewInfo
{
    public string FileId { get; set; } = string.Empty;

    public string PreviewType { get; set; } = string.Empty;

    public string PreviewUrl { get; set; } = string.Empty;

    public string ThumbnailUrl { get; set; } = string.Empty;

    public bool IsPreviewable { get; set; } = false;

    public Dictionary<string, object> Metadata { get; set; } = [];
}

public class StorageUsageInfo
{
    public string UserId { get; set; } = string.Empty;

    public long TotalQuota { get; set; } = 0;

    public long UsedSpace { get; set; } = 0;

    public long AvailableSpace => TotalQuota - UsedSpace;

    public double UsagePercentage => TotalQuota > 0 ? (double)UsedSpace / TotalQuota * 100 : 0;

    public long FileCount { get; set; } = 0;

    public long FolderCount { get; set; } = 0;

    public Dictionary<string, long> TypeUsage { get; set; } = [];

    public DateTime LastUpdatedAt { get; set; } = DateTime.UtcNow;
}

public class RecycleStatistics
{
    public int TotalItems { get; set; }

    public long TotalSize { get; set; }

    public List<RecycleStatisticsItem> ItemsByDate { get; set; } = [];
}

public class RecycleStatisticsItem
{
    public string Date { get; set; } = string.Empty;

    public int Count { get; set; }

    public long Size { get; set; }
}

public class FileVersionComparison
{
    public string Version1Id { get; set; } = string.Empty;

    public string Version2Id { get; set; } = string.Empty;

    public FileVersion? Version1 { get; set; }

    public FileVersion? Version2 { get; set; }

    public string? DiffContent { get; set; }

    public bool HasDifferences { get; set; } = false;

    public string ComparisonType { get; set; } = string.Empty;

    public Dictionary<string, object> Metadata { get; set; } = [];
}

public class FileContentSearchQuery
{
    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 20;

    public List<string> FileTypes { get; set; } = [];

    public long? MaxFileSize { get; set; }

    public bool CaseSensitive { get; set; } = false;

    public bool UseRegex { get; set; } = false;
}

public class BatchOperationResult
{
    public int Total { get; set; } = 0;

    public int SuccessCount { get; set; } = 0;

    public int FailureCount { get; set; } = 0;

    public List<string> SuccessIds { get; set; } = [];

    public List<BatchOperationError> Errors { get; set; } = [];

    public bool IsAllSuccess => FailureCount == 0;

    public DateTime StartTime { get; set; } = DateTime.UtcNow;

    public DateTime? EndTime { get; set; }

    public long? Duration => EndTime.HasValue ? (long)EndTime.Value.Subtract(StartTime).TotalMilliseconds : null;
}

public class BatchOperationError
{
    public string FileItemId { get; set; } = string.Empty;

    public string FileName { get; set; } = string.Empty;

    public string ErrorCode { get; set; } = string.Empty;

    public string ErrorMessage { get; set; } = string.Empty;

    public Dictionary<string, object> ErrorDetails { get; set; } = [];
}

public class StorageUsageStats
{
    public int TotalUsers { get; set; } = 0;

    public long TotalQuota { get; set; } = 0;

    public long TotalUsed { get; set; } = 0;

    public long AverageUsage { get; set; } = 0;

    public List<UsageDistributionItem> UsageDistribution { get; set; } = [];

    public List<TopUserItem> TopUsers { get; set; } = [];
}

public class UsageDistributionItem
{
    public string Range { get; set; } = string.Empty;

    public int Count { get; set; } = 0;

    public double Percentage { get; set; } = 0;
}

public class TopUserItem
{
    public string UserId { get; set; } = string.Empty;

    public string Username { get; set; } = string.Empty;

    public string UserDisplayName { get; set; } = string.Empty;

    public long UsedQuota { get; set; } = 0;

    public double UsagePercentage { get; set; } = 0;
}

public class CreateFolderRequest
{
    public string Name { get; set; } = string.Empty;

    public string ParentId { get; set; } = string.Empty;
}

public class UploadFileRequest
{
    public IFormFile File { get; set; } = null!;

    public string ParentId { get; set; } = string.Empty;

    public bool Overwrite { get; set; } = false;
}

public class RenameRequest
{
    public string NewName { get; set; } = string.Empty;
}

public class MoveRequest
{
    public string NewParentId { get; set; } = string.Empty;
}

public class CopyRequest
{
    public string NewParentId { get; set; } = string.Empty;

    public string? NewName { get; set; }
}

public class RestoreRequest
{
    public string? NewParentId { get; set; }
}

public class BatchOperationRequest
{
    public List<string> Ids { get; set; } = [];
}

public class BatchMoveRequest
{
    public List<string> Ids { get; set; } = [];

    public string TargetParentId { get; set; } = string.Empty;
}

public class BatchCopyRequest
{
    public List<string> Ids { get; set; } = [];

    public string TargetParentId { get; set; } = string.Empty;
}

public class BatchDeleteSharesRequest
{
    public List<string> Ids { get; set; } = new();
}

public class CreateVersionRequest
{
    public IFormFile File { get; set; } = null!;

    public string? Comment { get; set; }
}

public class BatchDeleteVersionsRequest
{
    public List<string> VersionIds { get; set; } = [];
}

public class DeleteRequest
{
    public string? Reason { get; set; }
}

public class BulkDeleteRequest
{
    public List<string> Ids { get; set; } = new();

    public string? Reason { get; set; }
}

public class SetQuotaRequest
{
    public long TotalQuota { get; set; }

    [Range(0, 100)]
    public int? WarningThreshold { get; set; }

    public bool? IsEnabled { get; set; }
}

public class BatchSetQuotasRequest
{
    public List<UserQuotaSettingDto> QuotaSettings { get; set; } = [];
}

public class UpdateStorageUsageRequest
{
    public long SizeChange { get; set; }
}