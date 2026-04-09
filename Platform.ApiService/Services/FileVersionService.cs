using Microsoft.EntityFrameworkCore;
using Platform.ApiService.Models;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using Platform.ServiceDefaults.Extensions;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Platform.ApiService.Services;

/// <summary>
/// 文件版本控制服务实现
/// </summary>
public class FileVersionService : IFileVersionService
{
    private readonly DbContext _context;
    private readonly ICloudStorageService _cloudStorageService;
    private readonly IStorageClient _storageClient;
    private readonly ILogger<FileVersionService> _logger;

    public FileVersionService(DbContext context,
        ICloudStorageService cloudStorageService,
        IStorageClient storageClient,
        ILogger<FileVersionService> logger)
    {
        _context = context;
        _cloudStorageService = cloudStorageService;
        _storageClient = storageClient;
        _logger = logger;
    }

    public async Task<FileVersion> CreateVersionAsync(string fileItemId, IFormFile file, string? comment = null)
    {
        if (string.IsNullOrWhiteSpace(fileItemId)) throw new ArgumentException("文件项ID不能为空");
        if (file == null || file.Length == 0) throw new ArgumentException("文件不能为空");

        var fileItem = await _cloudStorageService.GetFileItemAsync(fileItemId);
        if (fileItem == null) throw new ArgumentException("文件不存在");
        if (fileItem.Type != FileItemType.File) throw new InvalidOperationException("只能为文件创建版本");

        string fileHash;
        using (var stream = file.OpenReadStream()) fileHash = await ComputeFileHashAsync(stream);

        var currentVersion = await GetCurrentVersionAsync(fileItemId);
        if (currentVersion != null && currentVersion.Hash == fileHash) throw new InvalidOperationException("文件内容与当前版本相同，无需创建新版本");

        var nextVersionNumber = await GetNextVersionNumberAsync(fileItemId);
        string gridFSId;
        using (var stream = file.OpenReadStream())
        {
            gridFSId = await _storageClient.UploadAsync(stream, file.FileName, file.ContentType, new Dictionary<string, object>
            {
                ["originalName"] = file.FileName,
                ["contentType"] = file.ContentType ?? "application/octet-stream",
                ["uploadedAt"] = DateTime.UtcNow,
                ["hash"] = fileHash,
                ["fileItemId"] = fileItemId,
                ["versionNumber"] = nextVersionNumber
            }, "cloud_storage_files");
        }

        if (currentVersion != null) { currentVersion.IsCurrentVersion = false; }

        var version = new FileVersion { FileItemId = fileItemId, VersionNumber = nextVersionNumber, GridFSId = gridFSId, Size = file.Length, Hash = fileHash, Comment = comment ?? string.Empty, IsCurrentVersion = true };
        await _context.Set<FileVersion>().AddAsync(version);
        await _context.SaveChangesAsync();

        _ = Task.Run(async () => { try { await CleanupOldVersionsAsync(fileItemId, 10); } catch (Exception ex) { _logger.LogWarning(ex, "Failed to cleanup old versions"); } });
        return version;
    }

    public async Task<List<FileVersion>> GetVersionHistoryAsync(string fileItemId) => await _context.Set<FileVersion>().Where(v => v.FileItemId == fileItemId).OrderByDescending(v => v.VersionNumber).ToListAsync();

    public async Task<System.Linq.Dynamic.Core.PagedResult<FileVersion>> GetVersionHistoryPaginatedAsync(string fileItemId, Platform.ServiceDefaults.Models.PageParams request)
    {
        var query = _context.Set<FileVersion>().Where(v => v.FileItemId == fileItemId).OrderByDescending(v => v.VersionNumber);
        return await Task.FromResult(query.ToPagedList(request));
    }

    public async Task<FileVersion?> GetVersionAsync(string versionId) => await _context.Set<FileVersion>().FirstOrDefaultAsync(x => x.Id == versionId);

    public async Task<FileVersion> RestoreVersionAsync(string fileItemId, int versionNumber)
    {
        var versions = await _context.Set<FileVersion>().Where(v => v.FileItemId == fileItemId).ToListAsync();
        var target = versions.FirstOrDefault(v => v.VersionNumber == versionNumber);
        if (target == null) throw new ArgumentException($"版本 {versionNumber} 不存在");

        var current = versions.FirstOrDefault(v => v.IsCurrentVersion);
        if (current != null)
        {
            if (current.VersionNumber == versionNumber) throw new InvalidOperationException("指定版本已经是当前版本");
            current.IsCurrentVersion = false;
        }

        target.IsCurrentVersion = true;
        await _context.SaveChangesAsync();
        return target;
    }

    public async Task DeleteVersionAsync(string versionId)
    {
        var version = await GetVersionAsync(versionId);
        if (version == null) throw new ArgumentException("版本不存在");
        if (version.IsCurrentVersion) throw new InvalidOperationException("不能删除当前版本");
        _context.Set<FileVersion>().Remove(version);
        await _context.SaveChangesAsync();
    }

    public async Task<Stream> DownloadVersionAsync(string versionId)
    {
        var version = await GetVersionAsync(versionId);
        if (version == null || string.IsNullOrEmpty(version.GridFSId)) throw new ArgumentException("版本文件不存在");
        var bytes = await _storageClient.DownloadAsBytesAsync(version.GridFSId, "cloud_storage_files");
        return new MemoryStream(bytes);
    }

    public async Task<FileVersionComparison> CompareVersionsAsync(string v1Id, string v2Id)
    {
        var v1 = await GetVersionAsync(v1Id);
        var v2 = await GetVersionAsync(v2Id);
        if (v1 == null || v2 == null || v1.FileItemId != v2.FileItemId) throw new ArgumentException("无效的版本比较请求");

        var comparison = new FileVersionComparison { Version1Id = v1Id, Version2Id = v2Id, Version1 = v1, Version2 = v2, HasDifferences = v1.Hash != v2.Hash, ComparisonType = "hash" };
        var fileItem = await _cloudStorageService.GetFileItemAsync(v1.FileItemId);
        if (fileItem != null && IsTextFile(fileItem.MimeType))
        {
            var c1 = await GetVersionContentAsTextAsync(v1);
            var c2 = await GetVersionContentAsTextAsync(v2);
            if (c1 != null && c2 != null) { comparison.DiffContent = GenerateTextDiff(c1, c2); comparison.ComparisonType = "text"; }
        }
        return comparison;
    }

    public async Task<FileVersion?> GetCurrentVersionAsync(string fileItemId) => await _context.Set<FileVersion>().FirstOrDefaultAsync(v => v.FileItemId == fileItemId && v.IsCurrentVersion);

    public async Task<FileVersion> SetAsCurrentVersionAsync(string versionId)
    {
        var version = await GetVersionAsync(versionId);
        if (version == null) throw new ArgumentException("版本不存在");
        if (version.IsCurrentVersion) return version;

        var current = await GetCurrentVersionAsync(version.FileItemId);
        if (current != null) current.IsCurrentVersion = false;
        version.IsCurrentVersion = true;
        await _context.SaveChangesAsync();
        return version;
    }

    public async Task<BatchOperationResult> CleanupOldVersionsAsync(string fileItemId, int keepCount = 10)
    {
        var result = new BatchOperationResult { StartTime = DateTime.UtcNow };
        var versions = await GetVersionHistoryAsync(fileItemId);
        if (versions.Count <= keepCount) { result.EndTime = DateTime.UtcNow; return result; }

        var toDelete = versions.Where(v => !v.IsCurrentVersion).Skip(keepCount - 1).ToList();
        result.Total = toDelete.Count;
        foreach (var v in toDelete)
        {
            try { await DeleteVersionAsync(v.Id); result.SuccessIds.Add(v.Id); result.SuccessCount++; }
            catch (Exception ex) { result.Errors.Add(new BatchOperationError { FileItemId = v.Id, ErrorCode = "DELETE_FAILED", ErrorMessage = ex.Message }); result.FailureCount++; }
        }
        result.EndTime = DateTime.UtcNow;
        return result;
    }

    public async Task<BatchOperationResult> BatchDeleteVersionsAsync(List<string> versionIds)
    {
        var result = new BatchOperationResult { Total = versionIds.Count, StartTime = DateTime.UtcNow };
        foreach (var id in versionIds)
        {
            try { await DeleteVersionAsync(id); result.SuccessIds.Add(id); result.SuccessCount++; }
            catch (Exception ex) { result.Errors.Add(new BatchOperationError { FileItemId = id, ErrorCode = "DELETE_FAILED", ErrorMessage = ex.Message }); result.FailureCount++; }
        }
        result.EndTime = DateTime.UtcNow;
        return result;
    }

    public async Task<VersionStatistics> GetVersionStatisticsAsync(string fileItemId)
    {
        var versions = await GetVersionHistoryAsync(fileItemId);
        var current = versions.FirstOrDefault(v => v.IsCurrentVersion);
        return new VersionStatistics
        {
            FileItemId = fileItemId,
            TotalVersions = versions.Count,
            CurrentVersionNumber = current?.VersionNumber ?? 0,
            EarliestVersionDate = versions.LastOrDefault()?.CreatedAt,
            LatestVersionDate = versions.FirstOrDefault()?.CreatedAt,
            TotalStorageSize = versions.Sum(v => v.Size),
            VersionSizes = versions.ToDictionary(v => v.VersionNumber, v => v.Size),
            CreatorStatistics = versions.Where(v => !string.IsNullOrEmpty(v.CreatedBy)).GroupBy(v => v.CreatedBy!).ToDictionary(g => g.Key, g => g.Count())
        };
    }

    private static async Task<string> ComputeFileHashAsync(Stream stream) { using var sha256 = SHA256.Create(); return Convert.ToHexString(await sha256.ComputeHashAsync(stream)).ToLowerInvariant(); }
    private async Task<int> GetNextVersionNumberAsync(string fid) { var vs = await GetVersionHistoryAsync(fid); return vs.Any() ? vs.Max(v => v.VersionNumber) + 1 : 1; }
    private static bool IsTextFile(string mime) => new[] { "text/plain", "text/html", "text/css", "text/javascript", "text/xml", "application/json", "application/xml", "application/javascript", "text/markdown", "text/csv" }.Contains(mime.ToLowerInvariant());
    private async Task<string?> GetVersionContentAsTextAsync(FileVersion v) { try { using var s = await DownloadVersionAsync(v.Id); using var r = new StreamReader(s, Encoding.UTF8); return await r.ReadToEndAsync(); } catch { return null; } }
    private static string GenerateTextDiff(string c1, string c2)
    {
        var l1 = c1.Split('\n'); var l2 = c2.Split('\n'); var diff = new StringBuilder();
        for (int i = 0; i < Math.Max(l1.Length, l2.Length); i++) { var line1 = i < l1.Length ? l1[i] : ""; var line2 = i < l2.Length ? l2[i] : ""; if (line1 != line2) { if (!string.IsNullOrEmpty(line1)) diff.AppendLine($"- {line1}"); if (!string.IsNullOrEmpty(line2)) diff.AppendLine($"+ {line2}"); } else if (!string.IsNullOrEmpty(line1)) diff.AppendLine($"  {line1}"); }
        return diff.ToString();
    }
}
