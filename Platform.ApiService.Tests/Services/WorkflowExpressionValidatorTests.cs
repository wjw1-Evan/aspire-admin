using Microsoft.Extensions.Logging;
using Moq;
using Platform.ApiService.Services;
using Xunit;

namespace Platform.ApiService.Tests.Services;

/// <summary>
/// 工作流表达式验证器单元测试
/// </summary>
public class WorkflowExpressionValidatorTests
{
    private readonly IWorkflowExpressionValidator _validator;
    private readonly Mock<ILogger<WorkflowExpressionValidator>> _loggerMock;

    public WorkflowExpressionValidatorTests()
    {
        _loggerMock = new Mock<ILogger<WorkflowExpressionValidator>>();
        _validator = new WorkflowExpressionValidator(_loggerMock.Object);
    }

    #region 表达式验证测试

    [Fact]
    public void Validate_EmptyExpression_ShouldReturnSuccess()
    {
        // Arrange
        var expression = "";

        // Act
        var result = _validator.Validate(expression);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void Validate_SimpleComparison_ShouldReturnSuccess()
    {
        // Arrange
        var expression = "{amount} > 1000";

        // Act
        var result = _validator.Validate(expression);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void Validate_MultipleConditionsAnd_ShouldReturnSuccess()
    {
        // Arrange
        var expression = "{amount} > 1000 && {department} == Finance";

        // Act
        var result = _validator.Validate(expression);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void Validate_MultipleConditionsOr_ShouldReturnSuccess()
    {
        // Arrange
        var expression = "{amount} > 5000 || {isUrgent} == true";

        // Act
        var result = _validator.Validate(expression);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void Validate_NestedObjectAccess_ShouldReturnSuccess()
    {
        // Arrange
        var expression = "{user.level} > 2";

        // Act
        var result = _validator.Validate(expression);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void Validate_DeepNestedObjectAccess_ShouldReturnSuccess()
    {
        // Arrange
        var expression = "{department.manager.level} >= 3";

        // Act
        var result = _validator.Validate(expression);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void Validate_ExpressionTooLong_ShouldReturnFailure()
    {
        // Arrange
        var expression = new string('a', 1001);

        // Act
        var result = _validator.Validate(expression);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("长度超过限制", result.ErrorMessage);
    }

    [Fact]
    public void Validate_InvalidCharacters_ShouldReturnFailure()
    {
        // Arrange
        var expression = "{amount} > 1000; DROP TABLE";

        // Act
        var result = _validator.Validate(expression);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("不允许的字符", result.ErrorMessage);
    }

    [Fact]
    public void Validate_UnmatchedParentheses_ShouldReturnFailure()
    {
        // Arrange
        var expression = "{amount} > (1000";

        // Act
        var result = _validator.Validate(expression);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("括号不匹配", result.ErrorMessage);
    }

    [Fact]
    public void Validate_UnmatchedBraces_ShouldReturnFailure()
    {
        // Arrange
        var expression = "{amount > 1000";

        // Act
        var result = _validator.Validate(expression);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("括号不匹配", result.ErrorMessage);
    }

    [Fact]
    public void Validate_InvalidOperatorCombination_ShouldReturnFailure()
    {
        // Arrange
        var expression = "{amount} === 1000";

        // Act
        var result = _validator.Validate(expression);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("不允许的操作符", result.ErrorMessage);
    }

    [Fact]
    public void Validate_ExpressionWithoutOperator_ShouldReturnSuccess()
    {
        // Arrange
        var expression = "{isActive}";

        // Act
        var result = _validator.Validate(expression);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void Validate_BooleanLiteral_ShouldReturnSuccess()
    {
        // Arrange
        var expression = "true";

        // Act
        var result = _validator.Validate(expression);

        // Assert
        Assert.True(result.IsValid);
    }

    #endregion

    #region 变量名验证测试

    [Fact]
    public void ValidateVariableName_SimpleVariableName_ShouldReturnSuccess()
    {
        // Arrange
        var variableName = "amount";

        // Act
        var result = _validator.ValidateVariableName(variableName);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ValidateVariableName_VariableNameWithBraces_ShouldReturnSuccess()
    {
        // Arrange
        var variableName = "{amount}";

        // Act
        var result = _validator.ValidateVariableName(variableName);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ValidateVariableName_NestedVariableName_ShouldReturnSuccess()
    {
        // Arrange
        var variableName = "user.level";

        // Act
        var result = _validator.ValidateVariableName(variableName);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ValidateVariableName_DeepNestedVariableName_ShouldReturnSuccess()
    {
        // Arrange
        var variableName = "department.manager.level";

        // Act
        var result = _validator.ValidateVariableName(variableName);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ValidateVariableName_EmptyString_ShouldReturnFailure()
    {
        // Arrange
        var variableName = "";

        // Act
        var result = _validator.ValidateVariableName(variableName);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("不能为空", result.ErrorMessage);
    }

    [Fact]
    public void ValidateVariableName_OnlyBraces_ShouldReturnFailure()
    {
        // Arrange
        var variableName = "{}";

        // Act
        var result = _validator.ValidateVariableName(variableName);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("不能为空", result.ErrorMessage);
    }

    [Fact]
    public void ValidateVariableName_OnlyBracesWithSpaces_ShouldReturnFailure()
    {
        // Arrange
        var variableName = "{ }";

        // Act
        var result = _validator.ValidateVariableName(variableName);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("不能为空", result.ErrorMessage);
    }

    [Fact]
    public void ValidateVariableName_TooLong_ShouldReturnFailure()
    {
        // Arrange
        var variableName = new string('a', 257);

        // Act
        var result = _validator.ValidateVariableName(variableName);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("长度超过限制", result.ErrorMessage);
    }

    [Fact]
    public void ValidateVariableName_InvalidCharacters_ShouldReturnFailure()
    {
        // Arrange
        var variableName = "amount-value";

        // Act
        var result = _validator.ValidateVariableName(variableName);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("格式不合法", result.ErrorMessage);
    }

    [Fact]
    public void ValidateVariableName_StartingWithNumber_ShouldReturnFailure()
    {
        // Arrange
        var variableName = "1amount";

        // Act
        var result = _validator.ValidateVariableName(variableName);

        // Assert
        Assert.False(result.IsValid);
        Assert.Contains("格式不合法", result.ErrorMessage);
    }

    [Fact]
    public void ValidateVariableName_WithUnderscore_ShouldReturnSuccess()
    {
        // Arrange
        var variableName = "_amount";

        // Act
        var result = _validator.ValidateVariableName(variableName);

        // Assert
        Assert.True(result.IsValid);
    }

    [Fact]
    public void ValidateVariableName_WithNumbers_ShouldReturnSuccess()
    {
        // Arrange
        var variableName = "amount123";

        // Act
        var result = _validator.ValidateVariableName(variableName);

        // Assert
        Assert.True(result.IsValid);
    }

    #endregion
}
