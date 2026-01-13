#nullable enable
// 文件说明：
// 本测试验证 AppHost 的资源注册、依赖关系与关键环境变量注入，包括：
// 1) 资源清单完整性（mongo/mongodb/datainitializer/apiservice/apigateway/admin/app/openai/chat）；
// 2) 资源间引用关系（ApiService/Mongodb/DataInitializer/Chat/OpenAI/前端依赖网关）；
// 3) 环境变量注入与来源（Jwt 密钥、OpenAI 端点、前端开发环境变量等）。
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Aspire.Hosting;
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
        }

        public Task InitializeAsync()
        {
            Environment.SetEnvironmentVariable(JwtSecretKeyEnv, "unit-test-secret-key");
            Environment.SetEnvironmentVariable(OpenAiEndpointEnv, "https://unit-test-openai-endpoint");

            return Task.CompletedTask;
        }

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
            // 场景：确保核心资源均已在编排中注册
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
            // 场景：ApiService 应依赖 mongodb、datainitializer 以及 chat（消息/SSE）
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
            // 场景：数据初始化服务在运行前应等待 mongodb 就绪
            var builder = await CreateBuilderAsync();

            var relationships = GetResourceRelationships(builder, "datainitializer");

            Assert.Contains(relationships, relation => relation.Resource.Name == "mongodb");
        }

        [Fact]
        public async Task Frontend_Applications_Should_Depends_On_ApiGateway()
        {
            // 场景：前端 Admin 与 App 项目均应依赖 API 网关以统一后端入口
            var builder = await CreateBuilderAsync();

            var adminRelationships = GetResourceRelationships(builder, "admin");
            var appRelationships = GetResourceRelationships(builder, "app");

            Assert.Contains(adminRelationships, relation => relation.Resource.Name == "apigateway");
            Assert.Contains(appRelationships, relation => relation.Resource.Name == "apigateway");
        }

        [Fact]
        public async Task OpenAi_Service_Should_Reference_Chat_Model()
        {
            // 场景：Chat 组件应引用 OpenAI 服务作为大模型提供方
            var builder = await CreateBuilderAsync();

            var relationships = GetResourceRelationships(builder, "chat");

            Assert.Contains(relationships, relation => relation.Resource.Name == "openai");
        }

        [Fact]
        public async Task ApiService_Should_Inject_Key_Env_Variables()
        {
            // 场景：ApiService 应注入关键日志与 JWT 环境变量
            var builder = await CreateBuilderAsync();

            var env = await GetEnvVarsAsync<ProjectResource>(builder, "apiservice");

            Assert.Contains(env, kvp => kvp.Key == "Jwt__SecretKey" && kvp.Value == "unit-test-secret-key");
            Assert.Contains(env, kvp => kvp.Key == "DOTNET_LOGGING__CONSOLE__INCLUDESCOPES" && kvp.Value == "true");
            Assert.Contains(env, kvp => kvp.Key == "DOTNET_LOGGING__CONSOLE__TIMESTAMPFORMAT" && kvp.Value == "[yyyy-MM-dd HH:mm:ss] ");
        }

        [Fact]
        public async Task Frontend_Apps_Should_Receive_Dev_Env_Vars()
        {
            // 场景：前端项目在开发模式需注入 NPM/Node/BROWSER 等环境变量，并接收网关端口
            var builder = await CreateBuilderAsync();

            var adminEnv = await GetEnvVarsAsync<ProjectResource>(builder, "admin");
            var appEnv = await GetEnvVarsAsync<ProjectResource>(builder, "app");

            Assert.Contains(adminEnv, kvp => kvp.Key == "NPM_CONFIG_PRODUCTION" && kvp.Value == "false");
            Assert.Contains(appEnv, kvp => kvp.Key == "NPM_CONFIG_PRODUCTION" && kvp.Value == "false");

            Assert.Contains(adminEnv, kvp => kvp.Key == "NODE_ENV" && kvp.Value == "development");
            Assert.Contains(appEnv, kvp => kvp.Key == "NODE_ENV" && kvp.Value == "development");

            Assert.Contains(adminEnv, kvp => kvp.Key == "BROWSER" && kvp.Value == "none");
            Assert.Contains(appEnv, kvp => kvp.Key == "BROWSER" && kvp.Value == "none");

            Assert.Contains(adminEnv, kvp => kvp.Key.EndsWith("apigateway__http__0", StringComparison.OrdinalIgnoreCase));
            Assert.Contains(appEnv, kvp => kvp.Key.EndsWith("apigateway__http__0", StringComparison.OrdinalIgnoreCase));
        }

        [Fact]
        public async Task AppHost_Should_Respect_Jwt_Secret_From_Environment()
        {
            // 场景：Jwt 密钥应可通过环境变量覆盖配置文件，编排读取应反映覆盖值
            var originalJwt = Environment.GetEnvironmentVariable(JwtSecretKeyEnv);
            var originalOpenAi = Environment.GetEnvironmentVariable(OpenAiEndpointEnv);

            const string overriddenSecret = "override-jwt-secret-for-test";

            Environment.SetEnvironmentVariable(JwtSecretKeyEnv, overriddenSecret);
            Environment.SetEnvironmentVariable(OpenAiEndpointEnv, originalOpenAi ?? "https://unit-test-openai-endpoint");

            try
            {
                var builder = await CreateBuilderAsync();
                var configuredSecret = builder.Configuration["Jwt:SecretKey"];

                Assert.Equal(overriddenSecret, configuredSecret);
            }
            finally
            {
                Environment.SetEnvironmentVariable(JwtSecretKeyEnv, originalJwt);
                Environment.SetEnvironmentVariable(OpenAiEndpointEnv, originalOpenAi);
            }
        }

        [Fact]
        public async Task AppHost_Should_Respect_OpenAi_Endpoint_From_Environment()
        {
            // 场景：OpenAI 端点同样可通过环境变量覆盖，编排读取应正确
            var originalJwt = Environment.GetEnvironmentVariable(JwtSecretKeyEnv);
            var originalOpenAi = Environment.GetEnvironmentVariable(OpenAiEndpointEnv);

            const string overriddenEndpoint = "https://override-openai-endpoint";

            Environment.SetEnvironmentVariable(JwtSecretKeyEnv, originalJwt ?? "unit-test-secret-key");
            Environment.SetEnvironmentVariable(OpenAiEndpointEnv, overriddenEndpoint);

            try
            {
                var builder = await CreateBuilderAsync();
                var configuredEndpoint = builder.Configuration["Parameters:openai-openai-endpoint"];

                Assert.Equal(overriddenEndpoint, configuredEndpoint);
            }
            finally
            {
                Environment.SetEnvironmentVariable(JwtSecretKeyEnv, originalJwt);
                Environment.SetEnvironmentVariable(OpenAiEndpointEnv, originalOpenAi);
            }
        }

        private static async Task<IReadOnlyDictionary<string, string>> GetEnvVarsAsync<TResource>(
            IDistributedApplicationTestingBuilder builder,
            string resourceName)
        {
            var resource = builder.Resources.Single(r => r.Name == resourceName) as IResourceWithEnvironment
                ?? throw new InvalidOperationException($"Resource '{resourceName}' does not implement IResourceWithEnvironment.");
#pragma warning disable CS0618 // ResourceExtensions.GetEnvironmentVariableValuesAsync 已过时，测试场景仅需读取配置
            var env = await resource.GetEnvironmentVariableValuesAsync(DistributedApplicationOperation.Publish)
                .ConfigureAwait(false);
#pragma warning restore CS0618
            return env;
        }
    }
}
