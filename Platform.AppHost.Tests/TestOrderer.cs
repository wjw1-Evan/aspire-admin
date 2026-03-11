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
        return testCases.Select(tc => new { TestCase = tc, Order = GetOrder(tc) })
            .OrderBy(x => x.Order)
            .Select(x => x.TestCase);
    }

    private int GetOrder(ITestCase testCase)
    {
        var methodInfo = testCase.TestMethod.Method;
        var orderAttr = methodInfo.GetCustomAttributes(typeof(TestOrderAttribute))
            .FirstOrDefault();

        return orderAttr != null ? (int)orderAttr.GetType().GetProperty("Order")!.GetValue(orderAttr)! : int.MaxValue;
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
