using Microsoft.Extensions.Logging;
using Moq;
using Platform.ApiService.Services;
using System.Collections.Generic;
using System.Text.Json;
using Xunit;

namespace Platform.ApiService.Tests.Services;

/// <summary>
/// 工作流表达式求值器单元测试
/// </summary>
public class WorkflowExpressionEvaluatorTests
{
    private readonly IWorkflowExpressionEvaluator _evaluator;
    private readonly Mock<ILogger<WorkflowExpressionEvaluator>> _loggerMock;

    public WorkflowExpressionEvaluatorTests()
    {
        _loggerMock = new Mock<ILogger<WorkflowExpressionEvaluator>>();
        _evaluator = new WorkflowExpressionEvaluator(_loggerMock.Object);
    }

    #region 基础比较测试

    [Fact]
    public void Evaluate_SimpleGreaterThan_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{amount} > 1000";
        var variables = new Dictionary<string, object?> { { "amount", 2000 } };

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void Evaluate_SimpleGreaterThan_ShouldReturnFalse()
    {
        // Arrange
        var expression = "{amount} > 1000";
        var variables = new Dictionary<string, object?> { { "amount", 500 } };

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void Evaluate_StringEquality_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{department} == Finance";
        var variables = new Dictionary<string, object?> { { "department", "Finance" } };

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void Evaluate_StringEquality_ShouldReturnFalse()
    {
        // Arrange
        var expression = "{department} == Finance";
        var variables = new Dictionary<string, object?> { { "department", "IT" } };

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void Evaluate_BooleanVariable_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{isActive}";
        var variables = new Dictionary<string, object?> { { "isActive", true } };

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.True(result);
    }

    #endregion

    #region 多条件测试

    [Fact]
    public void Evaluate_MultipleConditionsAnd_AllTrue_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{amount} > 1000 && {department} == Finance";
        var variables = new Dictionary<string, object?>
        {
            { "amount", 5000 },
            { "department", "Finance" }
        };

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void Evaluate_MultipleConditionsAnd_OneFalse_ShouldReturnFalse()
    {
        // Arrange
        var expression = "{amount} > 1000 && {department} == Finance";
        var variables = new Dictionary<string, object?>
        {
            { "amount", 5000 },
            { "department", "IT" }
        };

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void Evaluate_MultipleConditionsOr_OneTrue_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{amount} > 5000 || {isUrgent} == true";
        var variables = new Dictionary<string, object?>
        {
            { "amount", 500 },
            { "isUrgent", true }
        };

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void Evaluate_MultipleConditionsOr_AllFalse_ShouldReturnFalse()
    {
        // Arrange
        var expression = "{amount} > 5000 || {isUrgent} == false";
        var variables = new Dictionary<string, object?>
        {
            { "amount", 500 },
            { "isUrgent", false }
        };

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region 嵌套对象访问测试

    [Fact]
    public void Evaluate_NestedObjectAccess_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{user.level} > 2";
        var variables = new Dictionary<string, object?>
        {
            {
                "user", new Dictionary<string, object?>
                {
                    { "level", 5 }
                }
            }
        };

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void Evaluate_DeepNestedObjectAccess_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{department.manager.level} >= 3";
        var variables = new Dictionary<string, object?>
        {
            {
                "department", new Dictionary<string, object?>
                {
                    {
                        "manager", new Dictionary<string, object?>
                        {
                            { "level", 4 }
                        }
                    }
                }
            }
        };

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.True(result);
    }

    #endregion

    #region JSON 数据处理测试

    [Fact]
    public void Evaluate_JsonNumberComparison_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{amount} > 1000";
        var jsonData = JsonSerializer.Deserialize<Dictionary<string, object?>>(
            "{\"amount\": 2000}"
        );
        var variables = jsonData ?? new();

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void Evaluate_JsonStringComparison_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{department} == Finance";
        var jsonData = JsonSerializer.Deserialize<Dictionary<string, object?>>(
            "{\"department\": \"Finance\"}"
        );
        var variables = jsonData ?? new();

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void Evaluate_JsonBooleanComparison_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{isActive} == true";
        var jsonData = JsonSerializer.Deserialize<Dictionary<string, object?>>(
            "{\"isActive\": true}"
        );
        var variables = jsonData ?? new();

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void Evaluate_JsonNestedObjectAccess_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{user.level} > 2";
        var jsonData = JsonSerializer.Deserialize<Dictionary<string, object?>>(
            "{\"user\": {\"level\": 5}}"
        );
        var variables = jsonData ?? new();

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.True(result);
    }

    #endregion

    #region 边界情况测试

    [Fact]
    public void Evaluate_EmptyExpression_ShouldReturnTrue()
    {
        // Arrange
        var expression = "";
        var variables = new Dictionary<string, object?>();

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void Evaluate_MissingVariable_NotEqual_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{amount} != 1000";
        var variables = new Dictionary<string, object?>();

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void Evaluate_MissingVariable_Equal_ShouldReturnFalse()
    {
        // Arrange
        var expression = "{amount} == 1000";
        var variables = new Dictionary<string, object?>();

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public void Evaluate_CaseInsensitiveVariableName_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{Amount} > 1000";
        var variables = new Dictionary<string, object?> { { "amount", 2000 } };

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void Evaluate_BoundaryValue_GreaterThanOrEqual_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{amount} >= 1000";
        var variables = new Dictionary<string, object?> { { "amount", 1000 } };

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public void Evaluate_BoundaryValue_LessThanOrEqual_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{amount} <= 1000";
        var variables = new Dictionary<string, object?> { { "amount", 1000 } };

        // Act
        var result = _evaluator.Evaluate(expression, variables);

        // Assert
        Assert.True(result);
    }

    #endregion
}
