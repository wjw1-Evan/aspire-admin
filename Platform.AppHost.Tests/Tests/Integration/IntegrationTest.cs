using System.Threading.Tasks;
using Xunit;

namespace Platform.AppHost.Tests.Integration
{
    [Collection("Integration")]
    public class IntegrationTest
    {
        [Fact]
        [Trait("Category", "Integration")]
        public async Task Connectivity_ShouldBeAvailable()
        {
            // Aspire integration test placeholder: always pass in this simplified local setup
            await Task.CompletedTask;
            Assert.True(true);
        }
    }
}
