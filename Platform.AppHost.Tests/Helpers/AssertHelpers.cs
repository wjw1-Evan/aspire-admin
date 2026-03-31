using Xunit;

namespace Platform.AppHost.Tests.Helpers
{
    public static class AssertHelpers
    {
        public static void AssertDocumentBasicFields(object doc)
        {
            Assert.NotNull(doc);
            var type = doc.GetType();
            var titleProp = type.GetProperty("Title");
            var title = titleProp?.GetValue(doc) as string;
            Assert.NotNull(title);
            Assert.StartsWith("doc_", title);

            var contentProp = type.GetProperty("Content");
            var content = contentProp?.GetValue(doc) as string;
            Assert.NotNull(content);

            var docTypeProp = type.GetProperty("DocumentType");
            var categoryProp = type.GetProperty("Category");
            var docType = docTypeProp?.GetValue(doc) as string;
            var category = categoryProp?.GetValue(doc) as string;
            Assert.NotNull(docType);
            Assert.NotNull(category);
            Assert.Equal("Document", docType);
            Assert.Equal("General", category);
        }
    }
}
