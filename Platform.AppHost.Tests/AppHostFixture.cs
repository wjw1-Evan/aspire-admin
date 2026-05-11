using Aspire.Hosting;
using Aspire.Hosting.Testing;
using Xunit;

namespace Platform.AppHost.Tests;

public class AppHostFixture : IAsyncLifetime
{
    public IDistributedApplicationTestingBuilder Builder { get; private set; } = null!;
    public DistributedApplication App { get; private set; } = null!;
    public HttpClient ApiClient { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        Builder = await DistributedApplicationTestingBuilder.CreateAsync<Projects.Platform_AppHost>([
            "--environment=Testing"
        ]);

        App = await Builder.BuildAsync();
        await App.StartAsync();

        ApiClient = App.CreateHttpClient("apiservice");
        await WaitForServiceReadyAsync(ApiClient);
    }

    public async Task DisposeAsync()
    {
        await App.DisposeAsync();
    }

    private static async Task WaitForServiceReadyAsync(HttpClient client)
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(60));
        while (!cts.Token.IsCancellationRequested)
        {
            try
            {
                var response = await client.GetAsync("/health", cts.Token);
                if (response.IsSuccessStatusCode)
                    return;
            }
            catch
            {
            }

            await Task.Delay(TimeSpan.FromSeconds(1), cts.Token);
        }
    }
}

[CollectionDefinition("AspireApp")]
public class AspireAppCollection : ICollectionFixture<AppHostFixture>
{
}
