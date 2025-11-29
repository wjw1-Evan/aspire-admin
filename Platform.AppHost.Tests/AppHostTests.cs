using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.Testing;
using Microsoft.Extensions.Hosting;
using Xunit;

namespace Platform.AppHost.Tests
{
    /// <summary>
    /// 针对 AppHost 编排的健全性测试，确保核心资源与依赖链被正确定义。
    /// </summary>
    public sealed class AppHostTests : IAsyncLifetime
    {
        private const string JwtSecretKeyEnv = "Jwt__SecretKey";
        private const string OpenAiEndpointEnv = "Parameters__openai-openai-endpoint";

        private readonly Dictionary<string, string?> _originalEnv = new();

        public AppHostTests()
        {
            _originalEnv[JwtSecretKeyEnv] = Environment.GetEnvironmentVariable(JwtSecretKeyEnv);
            _originalEnv[OpenAiEndpointEnv] = Environment.GetEnvironmentVariable(OpenAiEndpointEnv);

            Environment.SetEnvironmentVariable(JwtSecretKeyEnv, "unit-test-secret-key");
            Environment.SetEnvironmentVariable(OpenAiEndpointEnv, "https://unit-test-openai-endpoint");
        }

        public Task InitializeAsync() => Task.CompletedTask;

        public Task DisposeAsync()
        {
            foreach (var pair in _originalEnv)
            {
                Environment.SetEnvironmentVariable(pair.Key, pair.Value);
            }

            return Task.CompletedTask;
        }

        private static Task<IDistributedApplicationTestingBuilder> CreateBuilderAsync()
        {
            return DistributedApplicationTestingBuilder.CreateAsync<Projects.Platform_AppHost>(
                Array.Empty<string>(),
                static (_, settings) => settings.EnvironmentName = Environments.Development);
        }

        private static IReadOnlyList<ResourceRelationshipAnnotation> GetResourceRelationships(
            IDistributedApplicationTestingBuilder builder,
            string resourceName)
        {
            return builder.Resources
                .Single(resource => resource.Name == resourceName)
                .Annotations
                .OfType<ResourceRelationshipAnnotation>()
                .ToList();
        }

        [Fact]
        public async Task AppHost_Should_Register_All_Core_Resources()
        {
            var builder = await CreateBuilderAsync();

            var resourceNames = builder.Resources
                .Select(resource => resource.Name)
                .ToList();

            Assert.Contains("mongo", resourceNames);
            Assert.Contains("mongodb", resourceNames);
            Assert.Contains("datainitializer", resourceNames);
            Assert.Contains("apiservice", resourceNames);
            Assert.Contains("apigateway", resourceNames);
            Assert.Contains("admin", resourceNames);
            Assert.Contains("app", resourceNames);
            Assert.Contains("openai", resourceNames);
            Assert.Contains("chat", resourceNames);
        }

        [Fact]
        public async Task ApiService_Should_Reference_Its_Critical_Dependencies()
        {
            var builder = await CreateBuilderAsync();

            var referencedResources = GetResourceRelationships(builder, "apiservice")
                .Select(relationship => relationship.Resource.Name)
                .ToList();

            Assert.Contains("mongodb", referencedResources);
            Assert.Contains("datainitializer", referencedResources);
            Assert.Contains("chat", referencedResources);
        }

        [Fact]
        public async Task DataInitializer_Should_Wait_For_Mongodb_Before_Running()
        {
            var builder = await CreateBuilderAsync();

            var relationships = GetResourceRelationships(builder, "datainitializer");

            Assert.Contains(relationships, relation => relation.Resource.Name == "mongodb");
        }

        [Fact]
        public async Task Frontend_Applications_Should_Depends_On_ApiGateway()
        {
            var builder = await CreateBuilderAsync();

            var adminRelationships = GetResourceRelationships(builder, "admin");
            var appRelationships = GetResourceRelationships(builder, "app");

            Assert.Contains(adminRelationships, relation => relation.Resource.Name == "apigateway");
            Assert.Contains(appRelationships, relation => relation.Resource.Name == "apigateway");
        }

        [Fact]
        public async Task Chat_Model_Should_Reference_OpenAi_Service()
        {
            var builder = await CreateBuilderAsync();

            var relationships = GetResourceRelationships(builder, "chat");

            Assert.Contains(relationships, relation => relation.Resource.Name == "openai");
        }
    }
}
