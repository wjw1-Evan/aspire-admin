using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddPlatformDatabase();             // IMongoClient, IMongoDatabase, PlatformDbContext, ITenantContext


builder.Services.AddControllers();

var app = builder.Build();

app.MapHealthChecks("/health");
app.MapControllers();
app.MapDefaultEndpoints();

await app.RunAsync();
