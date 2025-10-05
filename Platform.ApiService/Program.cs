using Platform.ApiService.Services;
using Platform.ApiService.Models;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();

// Add services to the container.
builder.Services.AddProblemDetails();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.AddMongoDBClient(connectionName: "mongodb");

// Register MongoDB services
builder.Services.AddSingleton<UserService>();


var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

string[] summaries = ["Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"];

app.MapGet("/weatherforecast", () =>
{
    var forecast = Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast");

// MongoDB User API endpoints
app.MapGet("/api/users", async (UserService userService) =>
{
    var users = await userService.GetAllUsersAsync();
    return Results.Ok(users);
})
.WithName("GetAllUsers")
.WithOpenApi();

app.MapGet("/api/users/{id}", async (string id, UserService userService) =>
{
    var user = await userService.GetUserByIdAsync(id);
    if (user == null)
        return Results.NotFound($"User with ID {id} not found");
    
    return Results.Ok(user);
})
.WithName("GetUserById")
.WithOpenApi();

app.MapPost("/api/users", async (CreateUserRequest request, UserService userService) =>
{
    if (string.IsNullOrEmpty(request.Name) || string.IsNullOrEmpty(request.Email))
        return Results.BadRequest("Name and Email are required");
    
    var user = await userService.CreateUserAsync(request);
    return Results.Created($"/api/users/{user.Id}", user);
})
.WithName("CreateUser")
.WithOpenApi();

app.MapPut("/api/users/{id}", async (string id, UpdateUserRequest request, UserService userService) =>
{
    var user = await userService.UpdateUserAsync(id, request);
    if (user == null)
        return Results.NotFound($"User with ID {id} not found");
    
    return Results.Ok(user);
})
.WithName("UpdateUser")
.WithOpenApi();

app.MapDelete("/api/users/{id}", async (string id, UserService userService) =>
{
    var deleted = await userService.DeleteUserAsync(id);
    if (!deleted)
        return Results.NotFound($"User with ID {id} not found");
    
    return Results.NoContent();
})
.WithName("DeleteUser")
.WithOpenApi();

app.MapGet("/api/users/search/{name}", async (string name, UserService userService) =>
{
    var users = await userService.SearchUsersByNameAsync(name);
    return Results.Ok(users);
})
.WithName("SearchUsersByName")
.WithOpenApi();

app.MapDefaultEndpoints();

await app.RunAsync();
