using System;
using Xunit.Sdk;

namespace Platform.AppHost.Tests.Integration
{
    using System;
    using Xunit.Sdk;

    public class IntegrationTestBase : IClassFixture<AppHostFixture>
    {
        protected Platform.AppHost.Tests.Integration.AppHostFixture Fixture => null; // placeholder for compatibility
        protected bool IntegrationEnabled => Environment.GetEnvironmentVariable("INTEGRATION_ENABLED") == "1";

        protected void SkipIfNotEnabled(string reason = "Integration environment not enabled")
        {
            if (!IntegrationEnabled)
                throw new global::Xunit.Sdk.SkipTestException(reason);
        }
    }
}
