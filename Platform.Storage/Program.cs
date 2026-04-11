using Platform.ServiceDefaults.Authentication;
using Platform.ServiceDefaults.Extensions;
using Platform.Storage.Services;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddSatelliteJwtAndInternalKeyAuthentication();
builder.AddPlatformDatabase("storagedb");

builder.Services.AddSingleton<GridFSStorageService>();

builder.Services.AddControllers();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapControllers();
app.MapDefaultEndpoints();

await app.RunAsync();
