# 需求文档

## 简介

本文档规定了使用 Aspire.Hosting.Testing 框架为 Platform.AppHost 实现集成测试的需求。这些测试将专注于验证 Platform.ApiService 在分布式应用程序上下文中公开的用户注册和登录 API。这些测试确保当应用程序由 Aspire 编排时，身份验证端点能够正确运行，包括适当的服务发现、配置和服务间通信。

## 术语表

- **Test_Project（测试项目）**: 将包含 Aspire 托管集成测试的新 xUnit 测试项目
- **AppHost（应用主机）**: 使用 Aspire 编排所有应用程序资源的 Platform.AppHost 项目
- **ApiService（API 服务）**: 公开身份验证 REST API 的 Platform.ApiService 项目
- **DistributedApplication（分布式应用程序）**: 由测试工具创建的 Aspire 分布式应用程序实例
- **Test_Harness（测试工具）**: 创建和管理分布式应用程序以进行测试的 Aspire.Hosting.Testing 基础设施
- **HTTP_Client（HTTP 客户端）**: 用于向 ApiService 端点发出请求的 HttpClient 实例
- **Registration_Endpoint（注册端点）**: 创建新用户账户的 POST /api/auth/register 端点
- **Login_Endpoint（登录端点）**: 验证用户身份并返回令牌的 POST /api/auth/login 端点
- **Auth_Token（身份验证令牌）**: 成功登录操作返回的 JWT bearer 令牌
- **Test_Database（测试数据库）**: 测试执行期间使用的 MongoDB 数据库实例
- **Resource_Health（资源健康状态）**: 分布式应用程序中资源的健康状态（运行中、健康等）

## 需求

### 需求 1: 测试项目设置

**用户故事：** 作为开发人员，我希望有一个专门用于 AppHost 集成测试的测试项目，以便我可以在隔离环境中验证分布式应用程序的行为。

#### 验收标准

1. Test_Project 应创建为名为 "Platform.AppHost.Tests" 的新 xUnit 测试项目
2. Test_Project 应引用 Aspire.Hosting.Testing NuGet 包
3. Test_Project 应引用 Platform.AppHost 项目
4. Test_Project 应使用 .NET 10.0 作为目标框架
5. Test_Project 应包含 xunit、xunit.runner.visualstudio 和 Microsoft.NET.Test.Sdk 包
6. Test_Project 应添加到 Platform.sln 解决方案文件中

### 需求 2: 分布式应用程序初始化

**用户故事：** 作为测试作者，我希望在运行测试之前初始化分布式应用程序，以便所有必需的资源都可用于测试。

#### 验收标准

1. 当测试类被实例化时，Test_Harness 应从 AppHost 创建 DistributedApplication 实例
2. Test_Harness 应等待所有关键资源达到健康状态后再继续测试
3. Test_Harness 应使用特定于测试的设置配置 DistributedApplication
4. 当测试执行完成时，Test_Harness 应释放 DistributedApplication 并清理资源
5. 如果资源初始化失败，则 Test_Harness 应提供描述性错误消息，指示哪个资源失败

### 需求 3: 服务发现和 HTTP 客户端配置

**用户故事：** 作为测试作者，我希望获得为 ApiService 配置的 HTTP 客户端，以便我可以向身份验证端点发出请求。

#### 验收标准

1. Test_Harness 应从 DistributedApplication 解析 ApiService 端点 URL
2. Test_Harness 应创建配置了 ApiService 基地址的 HTTP_Client
3. HTTP_Client 应包含用于 JSON 内容协商的适当标头
4. 当 ApiService 有多个副本时，Test_Harness 应选择健康的副本端点
5. HTTP_Client 应配置合理的超时时间（集成测试至少 30 秒）

### 需求 4: 用户注册 API 测试

**用户故事：** 作为测试作者，我希望测试用户注册端点，以便我可以验证新用户可以成功创建。

#### 验收标准

1. 当向 Registration_Endpoint 发送有效的注册请求时，ApiService 应返回 200 OK 状态码
2. 当发送有效的注册请求时，ApiService 应返回包含已创建用户的 ID 和用户名的响应
3. 当发送具有重复用户名的注册请求时，ApiService 应返回错误响应
4. 当发送具有无效数据的注册请求时，ApiService 应返回验证错误响应
5. Test_Project 应验证注册的用户数据已持久化到 Test_Database 中

### 需求 5: 用户登录 API 测试

**用户故事：** 作为测试作者，我希望测试用户登录端点，以便我可以验证身份验证在分布式应用程序中正常工作。

#### 验收标准

1. 当向 Login_Endpoint 发送有效凭据时，ApiService 应返回 200 OK 状态码
2. 当发送有效凭据时，ApiService 应在响应中返回 Auth_Token
3. 当发送有效凭据时，ApiService 应在响应中返回刷新令牌
4. 当向 Login_Endpoint 发送无效凭据时，ApiService 应返回错误响应
5. 返回的 Auth_Token 应是具有适当声明的有效 JWT 令牌

### 需求 6: 身份验证流程集成测试

**用户故事：** 作为测试作者，我希望测试完整的注册-然后-登录流程，以便我可以验证端到端的身份验证过程正常工作。

#### 验收标准

1. Test_Project 应包含一个测试，该测试注册新用户，然后使用这些凭据登录
2. 当用户注册然后登录时，ApiService 应返回有效的 Auth_Token
3. Test_Project 应验证 Auth_Token 可用于访问受保护的端点
4. Test_Project 应验证从登录返回的用户信息与注册的用户数据匹配
5. 对于所有有效的用户注册后跟登录，身份验证流程应成功完成（往返属性）

### 需求 7: 资源健康状态验证

**用户故事：** 作为测试作者，我希望在运行测试之前验证所有必需的资源都是健康的，以便测试失败不是由基础设施问题引起的。

#### 验收标准

1. 当测试开始执行时，Test_Harness 应验证 ApiService 的 Resource_Health 为 "Running" 或 "Healthy"
2. 当测试开始执行时，Test_Harness 应验证 Test_Database 的 Resource_Health 为 "Running" 或 "Healthy"
3. 如果任何关键资源不健康，则 Test_Harness 应快速失败并提供描述性错误消息
4. Test_Project 应包含一个专门的测试来验证所有资源都是健康的
5. Test_Project 应在测试执行开始时记录所有资源的状态

### 需求 8: 测试数据隔离

**用户故事：** 作为测试作者，我希望每个测试都有隔离的数据，以便测试不会相互干扰。

#### 验收标准

1. 当多个测试按顺序运行时，Test_Project 应确保每个测试使用唯一的用户名
2. Test_Project 应使用时间戳或 GUID 为每次测试执行生成唯一的测试数据
3. 在需要清理测试数据的地方，Test_Project 应在测试执行后清理测试数据
4. Test_Project 不应依赖于测试的执行顺序
5. 当测试并行运行时，Test_Project 应确保并发测试执行之间的数据隔离

### 需求 9: 错误处理和诊断

**用户故事：** 作为测试作者，我希望在测试失败时获得全面的错误信息，以便我可以快速诊断和修复问题。

#### 验收标准

1. 当 HTTP 请求失败时，Test_Project 应记录请求详细信息，包括 URL、方法和正文
2. 当 HTTP 请求失败时，Test_Project 应记录响应详细信息，包括状态码和正文
3. 当资源启动失败时，Test_Project 应捕获并记录资源的控制台输出
4. Test_Project 应包含带有描述性消息的断言，解释预期的内容
5. 当测试失败时，Test_Project 应提供足够的上下文来重现失败

### 需求 10: 测试配置管理

**用户故事：** 作为测试作者，我希望配置特定于测试的设置，以便测试可以在不同环境中运行而无需更改代码。

#### 验收标准

1. Test_Project 应支持覆盖 AppHost 配置值以用于测试目的
2. Test_Project 应为测试执行配置 JWT 密钥
3. 在需要外部依赖项的地方，Test_Project 应提供测试替身或模拟配置
4. Test_Project 应在测试期间禁用或模拟电子邮件发送功能
5. Test_Project 应为测试执行配置适当的超时时间
