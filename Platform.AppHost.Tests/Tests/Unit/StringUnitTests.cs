using Xunit;

namespace Platform.AppHost.Tests.Unit
{
    [Collection("Unit")]
    public class StringUnitTests
    {
        [Fact]
        [Trait("Category", "Unit")]
        public void Trim_should_handle_nulls_safely()
        {
            string? s = null;
            string t = (s ?? string.Empty).Trim();
            Assert.Equal(string.Empty, t);
        }

        [Fact]
        [Trait("Category", "Unit")]
        public void Basic_concatenation()
        {
            string a = "ab";
            string b = "cd";
            Assert.Equal("abcd", a + b);
        }
    }
}
