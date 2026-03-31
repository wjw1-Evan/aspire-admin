using Xunit;

[assembly: CollectionBehavior(DisableTestParallelization = true)]
[assembly: TestCaseOrderer("Platform.AppHost.Tests.TestOrderer", "Platform.AppHost.Tests")]
