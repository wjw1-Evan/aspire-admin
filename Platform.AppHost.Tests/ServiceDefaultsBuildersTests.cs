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
        var fb = new FilterBuilder<TestEntity>()
            .Regex(e => e.Name, "abc", "i");
        var _ = fb.Build();
        Assert.True(fb.Count > 0);
    }

    [Fact]
    public void FilterBuilder_Exists_Builds_NonEmpty()
    {
        var fb = new FilterBuilder<TestEntity>()
            .Exists(e => e.Name, true);
        var _ = fb.Build();
        Assert.True(fb.Count > 0);
    }

    [Fact]
    public void FilterBuilder_Contains_Array_Builds_NonEmpty()
    {
        var fb = new FilterBuilder<TestEntity>()
            .Contains(e => e.Tags, "x");
        var _ = fb.Build();
        Assert.True(fb.Count > 0);
    }

    [Fact]
    public void FilterBuilder_Contains_String_Builds_NonEmpty()
    {
        var fb = new FilterBuilder<TestEntity>()
            .Contains(e => e.Name, "abc");
        var _ = fb.Build();
        Assert.True(fb.Count > 0);
    }



    [Fact]
    public void UpdateBuilder_Build_Throws_When_Empty()
    {
        var ub = new UpdateBuilder<TestEntity>();
        Assert.Throws<InvalidOperationException>(() => ub.Build());
    }
}
