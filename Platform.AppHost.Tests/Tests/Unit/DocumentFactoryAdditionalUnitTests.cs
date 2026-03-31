using Xunit;
using Platform.AppHost.Tests.Factories;

namespace Platform.AppHost.Tests.Unit
{
    [Collection("Unit")]
    public class DocumentFactoryAdditionalUnitTests
    {
        [Fact]
        [Trait("Category", "Unit")]
        public void CreateBasicDocument_DefaultFormData_ShouldBeEmpty()
        {
            var doc = TestDataFactory.CreateBasicDocument("doc_default_empty");
            Assert.NotNull(doc);
            Assert.NotNull(doc.FormData);
            Assert.Empty(doc.FormData);
        }
    }
}
