using Platform.ApiService.Services;
using Platform.ApiService.Models;
using MongoDB.Driver;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();

// Add services to the container.
builder.Services.AddProblemDetails();
builder.Services.AddControllers();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Register MongoDB services 
// 添加MongoDB服务  
builder.AddMongoDBClient(connectionName: "mongodb");

// Add HTTP context accessor
builder.Services.AddHttpContextAccessor();

// Register services
builder.Services.AddSingleton<IJwtService, JwtService>();
builder.Services.AddSingleton<UserService>();
builder.Services.AddSingleton<AuthService>();
builder.Services.AddSingleton<RuleService>();
builder.Services.AddSingleton<NoticeService>();
builder.Services.AddSingleton<TagService>();

// Configure JWT authentication
var jwtSecretKey = builder.Configuration["Jwt:SecretKey"] ?? "your-super-secret-key-that-is-at-least-32-characters-long-for-production-use";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "Platform.ApiService";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "Platform.Web";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(jwtSecretKey)),
            ValidateIssuer = true,
            ValidIssuer = jwtIssuer,
            ValidateAudience = true,
            ValidAudience = jwtAudience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            RequireExpirationTime = true,
            RequireSignedTokens = true
        };
        
        // 添加调试事件
        options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                Console.WriteLine($"JWT Authentication failed: {context.Exception.Message}");
                return Task.CompletedTask;
            },
            OnTokenValidated = context =>
            {
                Console.WriteLine($"JWT Token validated for user: {context.Principal?.Identity?.Name}");
                return Task.CompletedTask;
            },
            OnChallenge = context =>
            {
                Console.WriteLine($"JWT Challenge: {context.Error} - {context.ErrorDescription}");
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization();


var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();

// Add authentication and authorization middleware
app.UseAuthentication();
app.UseAuthorization();

// Configure controllers
app.MapControllers();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}


app.MapDefaultEndpoints();

await app.RunAsync();
