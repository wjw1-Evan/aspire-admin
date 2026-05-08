# 多阶段构建：.NET 10 SDK 构建 + ASP.NET Core 运行时
# 阶段 1: 构建
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# [优化] 先只复制项目文件，利用 Docker 层缓存
# 仅当 csproj 变更时才重新下载 NuGet 包
COPY Platform.ApiService.csproj .
COPY Platform.ServiceDefaults/Platform.ServiceDefaults.csproj Platform.ServiceDefaults/

# 恢复 NuGet 依赖
RUN dotnet restore

# 复制所有源代码
COPY . .

# 发布（依赖 Docker 层缓存，而非 BuildKit 缓存挂载）
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
