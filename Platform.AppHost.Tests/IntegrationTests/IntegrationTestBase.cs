using System;
using Xunit.Sdk;

namespace Platform.AppHost.Tests.Integration
{
    public class IntegrationTestBase
    {
        protected bool IntegrationEnabled => System.Environment.GetEnvironmentVariable("INTEGRATION_ENABLED") == "1";
    }
}
