# 多阶段构建：.NET 10 SDK 构建 + ASP.NET Core 运行时
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# [优化] 先只复制 csproj 建立层缓存
# 注意：不复制 ServiceDefaults.csproj，真实 restore 在 publish 完成
COPY Platform.DataInitializer.csproj .
RUN dotnet restore "Platform.DataInitializer.csproj"

# 复制所有源代码（含 ServiceDefaults）
COPY . .

# 发布（隐式 restore 整个依赖树）
RUN dotnet publish "Platform.DataInitializer.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
ENV DOTNET_EnableDiagnostics=0

COPY --from=build /app/publish .
EXPOSE 8080

ENTRYPOINT ["dotnet", "Platform.DataInitializer.dll"]
