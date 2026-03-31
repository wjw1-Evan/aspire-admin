using Xunit;
using Platform.AppHost.Tests.Factories;

namespace Platform.AppHost.Tests.Unit
{
    [Collection("Unit")]
    public class DataFactoryAdvancedUnitTests
    {
        [Fact]
        [Trait("Category", "Unit")]
        public void CreateBasicDocument_WithAdditionalFormData_ShouldIncludeExtra()
        {
            var doc = TestDataFactory.CreateBasicDocument("doc_ext");
            doc.FormData["extra"] = "extra_value";
            Assert.True(doc.FormData.ContainsKey("extra"));
            Assert.Equal("extra_value", doc.FormData["extra"]);
        }
    }
}
