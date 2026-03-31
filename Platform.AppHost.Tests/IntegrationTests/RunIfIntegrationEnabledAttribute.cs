using System;
using Xunit;

namespace Platform.AppHost.Tests.Integration
{
    // Custom Fact attribute to skip tests when integration is not enabled
    public class RunIfIntegrationEnabledAttribute : FactAttribute
    {
        public RunIfIntegrationEnabledAttribute()
        {
            if (Environment.GetEnvironmentVariable("INTEGRATION_ENABLED") != "1")
            {
                Skip = "Integration not enabled";
            }
        }
    }
}
