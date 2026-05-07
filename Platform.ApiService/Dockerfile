# 多阶段构建：.NET 10 SDK 构建 + ASP.NET Core 运行时
# 阶段 1: 构建
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# 复制 csproj 并恢复依赖
COPY ["Platform.ApiService.csproj", "."]
RUN dotnet restore "Platform.ApiService.csproj"

# 复制源代码并构建
COPY . .
RUN dotnet publish "Platform.ApiService.csproj" -c Release -o /app/publish /p:UseAppHost=false

# 阶段 2: 运行
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# 设置 ASP.NET Core 环境变量
ENV ASPNETCORE_URLS=http://+:8080
ENV DOTNET_EnableDiagnostics=0

# 从构建阶段复制发布产物
COPY --from=build /app/publish .

# 暴露端口
EXPOSE 8080

# 启动应用
ENTRYPOINT ["dotnet", "Platform.ApiService.dll"]
