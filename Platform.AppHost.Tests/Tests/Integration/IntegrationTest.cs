using System;
using System.Net.Http;
using System.Threading.Tasks;
using Xunit;

namespace Platform.AppHost.Tests.Integration
{
    [Collection("Integration")]
    public class IntegrationTest
    {
        [Fact]
        public async Task Connectivity_ShouldBeAvailable()
        {
            var enabled = Environment.GetEnvironmentVariable("INTEGRATION_ENABLED") == "1";
            if (!enabled) return;

            var baseUrl = Environment.GetEnvironmentVariable("INTEGRATION_BASE_URL");
            if (string.IsNullOrWhiteSpace(baseUrl))
            {
                Assert.True(true, "Integration base URL not provided; skipping real HTTP test.");
                return;
            }

            using var http = new HttpClient { BaseAddress = new Uri(baseUrl) };
            var resp = await http.GetAsync("/health");
            Assert.True(resp.IsSuccessStatusCode, $"Health check failed with status: {resp.StatusCode}");
        }
    }
}
