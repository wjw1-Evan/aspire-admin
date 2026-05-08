# 多阶段构建：.NET 10 SDK 构建 + ASP.NET Core 运行时
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# [优化] 先只复制项目文件，利用 Docker 层缓存
COPY Platform.DataInitializer.csproj .
COPY Platform.ServiceDefaults/Platform.ServiceDefaults.csproj Platform.ServiceDefaults/

# 恢复 NuGet 依赖
RUN dotnet restore

# 复制所有源代码
COPY . .

# 发布（依赖 Docker 层缓存，而非 BuildKit 缓存挂载）
RUN dotnet publish "Platform.DataInitializer.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
ENV DOTNET_EnableDiagnostics=0

COPY --from=build /app/publish .
EXPOSE 8080

ENTRYPOINT ["dotnet", "Platform.DataInitializer.dll"]
