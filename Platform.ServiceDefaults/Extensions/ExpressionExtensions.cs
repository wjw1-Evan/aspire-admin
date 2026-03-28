using System.Linq.Expressions;

namespace System.Linq.Expressions;

/// <summary>
/// 🚀 表达式树扩展 - 支持 LINQ 表达式的动态组合 (And/Or)
/// </summary>
public static class ExpressionExtensions
{
    public static Expression<Func<T, bool>>? And<T>(this Expression<Func<T, bool>>? expr1, Expression<Func<T, bool>>? expr2)
    {
        if (expr1 == null) return expr2;
        if (expr2 == null) return expr1;
        
        var parameter = Expression.Parameter(typeof(T));

        var combined = new ParameterUpdateVisitor(expr1.Parameters[0], parameter).Visit(expr1.Body);
        var second = new ParameterUpdateVisitor(expr2.Parameters[0], parameter).Visit(expr2.Body);

        return Expression.Lambda<Func<T, bool>>(Expression.AndAlso(combined, second), parameter);
    }

    public static Expression<Func<T, bool>>? Or<T>(this Expression<Func<T, bool>>? expr1, Expression<Func<T, bool>>? expr2)
    {
        if (expr1 == null) return expr2;
        if (expr2 == null) return expr1;
        
        var parameter = Expression.Parameter(typeof(T));

        var combined = new ParameterUpdateVisitor(expr1.Parameters[0], parameter).Visit(expr1.Body);
        var second = new ParameterUpdateVisitor(expr2.Parameters[0], parameter).Visit(expr2.Body);

        return Expression.Lambda<Func<T, bool>>(Expression.OrElse(combined, second), parameter);
    }

    private class ParameterUpdateVisitor(ParameterExpression oldParameter, ParameterExpression newParameter) : ExpressionVisitor
    {
        protected override Expression VisitParameter(ParameterExpression node)
        {
            if (node == oldParameter) return newParameter;
            return base.VisitParameter(node);
        }
    }
}
