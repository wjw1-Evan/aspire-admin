using Microsoft.AspNetCore.Mvc;
using Platform.ApiService.Models;

namespace Platform.ApiService.Controllers;

[ApiController]
[Route("[controller]")]
public class WeatherController : BaseApiController
{
    private readonly string[] _summaries = ["Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"];

    /// <summary>
    /// 获取天气预报
    /// </summary>
    [HttpGet]
    public IActionResult GetWeatherForecast()
    {
        var forecast = Enumerable.Range(1, 5).Select(index =>
            new WeatherForecast
            (
                DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
                Random.Shared.Next(-20, 55),
                _summaries[Random.Shared.Next(_summaries.Length)]
            ))
            .ToArray();
        
        return Ok(forecast);
    }
}
