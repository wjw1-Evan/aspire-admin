using Platform.ApiService.Models;

namespace Platform.ApiService.Services;

public interface IContentFilterService
{
    Task<FilterResult> FilterPageAsync(string prompt, PageResult page);
    Task<List<FilterResult>> FilterPagesAsync(string prompt, List<PageResult> pages);
}

public class FilterResult
{
    public bool IsMatched { get; set; }
    public string? Reason { get; set; }
    public double Score { get; set; }
}
