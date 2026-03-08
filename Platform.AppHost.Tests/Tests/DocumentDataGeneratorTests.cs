using Platform.AppHost.Tests.Helpers;
using Platform.AppHost.Tests.Models;
using Xunit;

namespace Platform.AppHost.Tests.Tests;

/// <summary>
/// Tests for document data generation methods in TestDataGenerator.
/// Validates that the methods generate valid document data with unique identifiers.
/// </summary>
public class DocumentDataGeneratorTests
{
    [Fact]
    public void GenerateValidDocument_ShouldCreateDocumentWithUniqueTitle()
    {
        // Act
        var document = TestDataGenerator.GenerateValidDocument();

        // Assert
        Assert.NotNull(document);
        Assert.NotEmpty(document.Title);
        Assert.StartsWith("doc_", document.Title);
        Assert.NotEmpty(document.Content);
        Assert.Equal("公文", document.DocumentType);
        Assert.Equal("测试分类", document.Category);
        Assert.Null(document.FormData);
    }

    [Fact]
    public void GenerateValidDocument_ShouldCreateUniqueTitles()
    {
        // Act
        var document1 = TestDataGenerator.GenerateValidDocument();
        var document2 = TestDataGenerator.GenerateValidDocument();

        // Assert
        Assert.NotEqual(document1.Title, document2.Title);
    }

    [Fact]
    public void GenerateDocumentWithFormData_ShouldIncludeFormData()
    {
        // Arrange
        var formData = new Dictionary<string, object>
        {
            { "field1", "value1" },
            { "field2", 123 },
            { "field3", true }
        };

        // Act
        var document = TestDataGenerator.GenerateDocumentWithFormData(formData);

        // Assert
        Assert.NotNull(document);
        Assert.NotEmpty(document.Title);
        Assert.StartsWith("doc_", document.Title);
        Assert.NotEmpty(document.Content);
        Assert.Equal("公文", document.DocumentType);
        Assert.Equal("测试分类", document.Category);
        Assert.NotNull(document.FormData);
        Assert.Equal(3, document.FormData.Count);
        Assert.Equal("value1", document.FormData["field1"]);
        Assert.Equal(123, document.FormData["field2"]);
        Assert.Equal(true, document.FormData["field3"]);
    }

    [Fact]
    public void GenerateDocumentWithFormData_ShouldCreateUniqueTitles()
    {
        // Arrange
        var formData = new Dictionary<string, object> { { "test", "value" } };

        // Act
        var document1 = TestDataGenerator.GenerateDocumentWithFormData(formData);
        var document2 = TestDataGenerator.GenerateDocumentWithFormData(formData);

        // Assert
        Assert.NotEqual(document1.Title, document2.Title);
    }

    [Fact]
    public void GenerateDocumentWithFormData_ShouldHandleEmptyFormData()
    {
        // Arrange
        var formData = new Dictionary<string, object>();

        // Act
        var document = TestDataGenerator.GenerateDocumentWithFormData(formData);

        // Assert
        Assert.NotNull(document);
        Assert.NotNull(document.FormData);
        Assert.Empty(document.FormData);
    }
}
