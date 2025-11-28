using Xunit;
using System.IO;

namespace Platform.AppHost.Tests
{
    public class AppHostTests
    {
        [Fact]
        public void AppHost_File_Should_Exist()
        {
            // 检查 AppHost.cs 文件是否存在，使用绝对路径
            var filePath = Path.Combine("/Users/fanshuyi/Projects/aspire-admin/Platform.AppHost/AppHost.cs");
            Assert.True(File.Exists(filePath), $"{filePath} should exist");
        }
    }
}
