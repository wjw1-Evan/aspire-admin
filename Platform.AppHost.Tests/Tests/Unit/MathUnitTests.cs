using Xunit;

namespace Platform.AppHost.Tests.Unit
{
    [Collection("Unit")]
    public class MathUnitTests
    {
        [Fact]
        [Trait("Category", "Unit")]
        public void SimpleAddition_ShouldBeTwo()
        {
            Assert.Equal(2, 1 + 1);
        }
    }
}
