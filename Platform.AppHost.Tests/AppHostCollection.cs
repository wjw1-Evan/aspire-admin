namespace Platform.AppHost.Tests;

/// <summary>
/// Defines a test collection that shares a single AppHostFixture instance across all tests.
/// This ensures that:
/// 1. Only one instance of the distributed application runs at a time
/// 2. Tests execute sequentially to avoid database conflicts
/// 3. Resources are properly shared and cleaned up
/// </summary>
[CollectionDefinition("AppHost Collection")]
public class AppHostCollection : ICollectionFixture<AppHostFixture>
{
    // This class has no code, and is never created. Its purpose is simply
    // to be the place to apply [CollectionDefinition] and all the
    // ICollectionFixture<> interfaces.
}
