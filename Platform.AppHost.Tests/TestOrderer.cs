using System.Collections.Generic;
using System.Linq;
using Xunit;
using Xunit.Abstractions;
using Xunit.Sdk;

namespace Platform.AppHost.Tests;

public class TestOrderer : ITestCaseOrderer
{
    public IEnumerable<TTestCase> OrderTestCases<TTestCase>(IEnumerable<TTestCase> testCases) where TTestCase : ITestCase
    {
        // Order primarily by explicit TestOrder attribute, then fall back to DisplayName for stability
        return testCases
            .OrderBy(tc => GetOrder(tc))
            .ThenBy(tc => tc.DisplayName);
    }

    private int GetOrder(ITestCase testCase)
    {
        // Be defensive: if method info is unavailable, fall back to max value
        var methodInfo = testCase?.TestMethod?.Method;
        if (methodInfo == null)
        {
            return int.MaxValue;
        }
        try
        {
            var orderAttrs = methodInfo.GetCustomAttributes(typeof(TestOrderAttribute));
            var orderAttr = orderAttrs?.FirstOrDefault() as TestOrderAttribute;
            return orderAttr != null ? orderAttr.Order : int.MaxValue;
        }
        catch
        {
            return int.MaxValue;
        }
    }
}

[AttributeUsage(AttributeTargets.Method)]
public class TestOrderAttribute : Attribute
{
    public int Order { get; }

    public TestOrderAttribute(int order)
    {
        Order = order;
    }
}
