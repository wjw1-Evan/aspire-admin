namespace Platform.ApiService.Models;

/// <summary>
/// 邮件发送任务信息
/// </summary>
public record EmailTaskItem(string LogId, string ToEmail, string Subject, string HtmlBody);