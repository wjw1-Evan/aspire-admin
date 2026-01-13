// 文件说明：
// 本测试验证工作流表达式求值器的基础能力：
// 1) 数值比较（>、>=）；
// 2) 字符串相等比较；
// 3) 布尔变量解析；
// 4) 不可解析表达式时记录警告并返回 false。
using System;
using System.Collections.Generic;
using Microsoft.Extensions.Logging;
using Platform.ApiService.Services;
using Xunit;

namespace Platform.ApiService.Tests;

public class WorkflowExpressionEvaluatorTests
{
    private sealed class TestLogger<T> : ILogger<T>
    {
        public List<string> Warnings { get; } = new();
        public List<string> Errors { get; } = new();
        public IDisposable BeginScope<TState>(TState state) => new Noop();
        public bool IsEnabled(LogLevel logLevel) => true;
        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            var msg = formatter(state, exception);
            if (logLevel == LogLevel.Warning) Warnings.Add(msg);
            if (logLevel == LogLevel.Error) Errors.Add(msg);
        }
        private sealed class Noop : IDisposable { public void Dispose() { } }
    }

    /// <summary>
    /// 数值比较测试
    /// </summary>
    [Fact]
    public void Numeric_GreaterOrEqual_Should_Pass()
    {
        // 场景：变量 amount=100，应满足 ">=" 断言，不满足严格 ">" 断言
        var logger = new TestLogger<WorkflowExpressionEvaluator>();
        var eval = new WorkflowExpressionEvaluator(logger);
        var variables = new Dictionary<string, object> { { "amount", 100 } };
        Assert.True(eval.Evaluate("amount >= 99", variables));
        Assert.False(eval.Evaluate("amount > 100", variables));
    }

    [Fact]
    public void String_Equality_Should_Work()
    {
        // 场景：字符串变量 status=approved，等于比较成立，非等值比较不成立
        var logger = new TestLogger<WorkflowExpressionEvaluator>();
        var eval = new WorkflowExpressionEvaluator(logger);
        var variables = new Dictionary<string, object> { { "status", "approved" } };
        Assert.True(eval.Evaluate("status == 'approved'", variables));
        Assert.False(eval.Evaluate("status == 'rejected'", variables));
    }

    [Fact]
    public void Boolean_Variable_Should_Work()
    {
        // 场景：布尔变量 isVip=true / isBlocked=false，直接求值应反映其真值
        var logger = new TestLogger<WorkflowExpressionEvaluator>();
        var eval = new WorkflowExpressionEvaluator(logger);
        var variables = new Dictionary<string, object> { { "isVip", true }, { "isBlocked", false } };
        Assert.True(eval.Evaluate("isVip", variables));
        Assert.False(eval.Evaluate("isBlocked", variables));
    }

    [Fact]
    public void NotParsable_Expression_Should_LogWarning_And_ReturnFalse()
    {
        // 场景：表达式无法解析时，返回 false 并记录中文警告日志
        var logger = new TestLogger<WorkflowExpressionEvaluator>();
        var eval = new WorkflowExpressionEvaluator(logger);
        var variables = new Dictionary<string, object> { { "foo", 1 } };
        var result = eval.Evaluate("unknown_op@", variables);
        Assert.False(result);
        Assert.Contains(logger.Warnings, w => w.Contains("无法解析表达式"));
    }
}
