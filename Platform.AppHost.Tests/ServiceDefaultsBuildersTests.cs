// 文件说明：
// 本测试验证 ServiceDefaults 中的过滤与更新构建器的基本行为：
// 1) FilterBuilder 的 Regex/Exists/Contains（数组/字符串）在有条件时应生成非空过滤器；
// 2) UpdateBuilder 在未设置任何更新操作时构建应抛出异常。
using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;
using Platform.ServiceDefaults.Models;
using Platform.ServiceDefaults.Services;
using Xunit;

namespace Platform.AppHost.Tests;

public class ServiceDefaultsBuildersTests
{
    private class TestEntity : BaseEntity, IEntity, ISoftDeletable, ITimestamped
    {
        [BsonElement("displayName")]
        public string Name { get; set; } = string.Empty;

        [BsonElement("tags")]
        public List<string> Tags { get; set; } = new();
    }

    [Fact]
    public void FilterBuilder_Regex_Builds_NonEmpty()
    {
        // 场景：正则条件应添加到过滤器并生成非空构造
        var fb = new FilterBuilder<TestEntity>()
            .Regex(e => e.Name, "abc", "i");
        var _ = fb.Build();
        Assert.True(fb.Count > 0);
    }

    [Fact]
    public void FilterBuilder_Exists_Builds_NonEmpty()
    {
        // 场景：字段存在性条件应生效并生成非空过滤器
        var fb = new FilterBuilder<TestEntity>()
            .Exists(e => e.Name, true);
        var _ = fb.Build();
        Assert.True(fb.Count > 0);
    }

    [Fact]
    public void FilterBuilder_Contains_Array_Builds_NonEmpty()
    {
        // 场景：数组包含条件应生效并生成非空过滤器
        var fb = new FilterBuilder<TestEntity>()
            .Contains(e => e.Tags, "x");
        var _ = fb.Build();
        Assert.True(fb.Count > 0);
    }

    [Fact]
    public void FilterBuilder_Contains_String_Builds_NonEmpty()
    {
        // 场景：字符串包含条件应生效并生成非空过滤器
        var fb = new FilterBuilder<TestEntity>()
            .Contains(e => e.Name, "abc");
        var _ = fb.Build();
        Assert.True(fb.Count > 0);
    }



    [Fact]
    public void UpdateBuilder_Build_Throws_When_Empty()
    {
        // 场景：未添加任何更新操作时构建应抛出 InvalidOperationException
        var ub = new UpdateBuilder<TestEntity>();
        Assert.Throws<InvalidOperationException>(() => ub.Build());
    }
}
