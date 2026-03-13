using System;

namespace Platform.ApiService.Workflows.Executors;

/// <summary>
/// 消息处理器属性 - 标记执行器中的处理方法
/// </summary>
[AttributeUsage(AttributeTargets.Method)]
public class MessageHandlerAttribute : Attribute
{
}

/// <summary>
/// 工作流执行器基类 - 替代 Microsoft.Agents.AI.Workflows.Executor
/// </summary>
public abstract class Executor
{
    /// <summary>
    /// 执行器名称
    /// </summary>
    public string Name { get; }

    /// <summary>
    /// 初始化执行器
    /// </summary>
    protected Executor(string name)
    {
        Name = name;
    }
}
