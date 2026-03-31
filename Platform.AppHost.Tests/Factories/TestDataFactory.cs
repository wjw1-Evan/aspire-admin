using System.Collections.Generic;

namespace Platform.AppHost.Tests.Factories
{
    // Lightweight test document model used only for unit testing
    public class TestDocument
    {
        public string Title { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public string DocumentType { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public Dictionary<string, object> FormData { get; set; } = new();
    }

    public static class TestDataFactory
    {
        public static TestDocument CreateBasicDocument(string title = "doc_default")
        {
            return new TestDocument
            {
                Title = title,
                Content = "sample content",
                DocumentType = "Document",
                Category = "General",
                FormData = new Dictionary<string, object>()
                {
                    { "field1", "value1" },
                    { "field2", 123 },
                }
            };
        }
    }
}
