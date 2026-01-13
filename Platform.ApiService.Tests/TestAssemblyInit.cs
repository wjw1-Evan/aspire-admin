// 文件说明：
// 测试程序集初始化：设置 Jwt、Issuer、Audience 以及开发环境变量，供集成测试使用。
using System;
using System.Runtime.CompilerServices;

namespace Platform.ApiService.Tests
{
    public static class TestAssemblyInit
    {
        [ModuleInitializer]
        public static void Initialize()
        {
            // 为集成测试提供必要的 Jwt 配置并设置开发环境
            Environment.SetEnvironmentVariable("Jwt__SecretKey", "integration-test-secret-key");
            Environment.SetEnvironmentVariable("Jwt__Issuer", "Platform.ApiService");
            Environment.SetEnvironmentVariable("Jwt__Audience", "Platform.Web");
            Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Development");
        }
    }
}
