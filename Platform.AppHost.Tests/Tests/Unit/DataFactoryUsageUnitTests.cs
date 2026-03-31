using Xunit;
using Platform.AppHost.Tests.Factories;

namespace Platform.AppHost.Tests.Unit
{
    [Collection("Unit")]
    public class DataFactoryUsageUnitTests
    {
        [Fact]
        [Trait("Category", "Unit")]
        public void CreateBasicDocument_ShouldPopulateFields()
        {
            var doc = TestDataFactory.CreateBasicDocument("doc_100");
            Assert.NotNull(doc);
            Assert.Equal("doc_100", doc.Title);
            Assert.Equal("Document", doc.DocumentType);
            Assert.Equal("General", doc.Category);
            Assert.NotNull(doc.Content);
        }
    }
}
