# MCP 处理器详尽指南 (MCP Handlers)

> 本文档列出了系统中所有内置的 MCP 处理器，说明 AI 助手如何通过标准化接口与核心业务逻辑交互。

## 📋 概述

项目基于 **Model Context Protocol (MCP)** 开放标准，使 AI (Xiaoke AI) 能够安全、高效地获取上下文并执行受控动作。所有处理器继承自 `McpToolHandlerBase`。

核心服务：`Platform.ApiService/Services/McpService.cs`

## 🛠️ 核心处理器索引 (21 Handlers)

### 1. 协作与工作流
- **WorkflowMcpToolHandler**: AI 直接操作流程（审批、查询进度、查看历史）。映射 URI: `workflow://{id}`。
- **DocumentMcpToolHandler**: 公文管理，支持文档检索与状态分析。
- **TaskMcpToolHandler**: 任务与项目管理，AI 可自动创建任务、指派负责人、更新看板。
- **ProjectMcpToolHandler**: 项目管理工具，包括成员、里程碑、依赖关系管理。

### 2. 物联网 (IoT)
- **IoTMcpToolHandler**: 网关与设备状态查询，AI 可获取实时数据点并分析趋势。映射 URI: `iot://{id}`。

### 3. 园区业务 (Park)
- **ParkMcpToolHandler**: 涵盖资产、招商、租户全生命周期管理工具集。

### 4. 协同工具
- **UserMcpToolHandler**: 跨租户身份检索、组织架构查询。
- **NoticeMcpToolHandler**: 系统公告与通知推送。
- **NotificationMcpToolHandler**: 统一通知触达分析。
- **FileShareMcpToolHandler**: 云硬盘文件检索与分享。
- **FileVersionMcpToolHandler**: 版本追溯与管理。
- **PasswordBookMcpToolHandler**: 密码本管理工具。
- **KnowledgeMcpToolHandler**: 知识库与文档管理。

### 5. 系统底层
- **SystemMcpToolHandler**: 菜单、权限与系统健康度查询。
- **MenuMcpToolHandler**: 动态菜单配置查询。
- **OrganizationMcpToolHandler**: 组织架构查询。
- **JoinRequestMcpToolHandler**: 申请审核辅助。
- **SocialMcpToolHandler**: 社交功能（好友、动态）。
- **FormMcpToolHandler**: 表单管理工具。
- **StatisticsMcpToolHandler**: 统计分析工具。

## 🧠 智能匹配机制

`McpService` 使用评分系统自动检测用户意图：
1. **关键词权重**: 从 `Description` 的“关键词：”部分提取。
2. **意图过滤**: 只有当包含“审、改、建”等动词时，才会激活写入类工具。
3. **参数补全**: 自动从会话中提取 ObjectId/GUID 填充参数。

## 🔐 安全与审计
- **操作审计**: 所有 `CallToolAsync` 均记录在 `UserActivityLog`。
- **权限继承**: MCP 逻辑强制执行当前用户的 JWT 权限约束。
- **输入过滤**: 自动防御参数注入与 XSS 攻击。

## 📝 最佳实践
- ✅ 新增核心功能后，应同步实现对应的 `IMcpToolHandler`。
- ✅ 在工具描述中明确标注“关键词：xxx、yyy”，以提升 AI 召回率。
- ✅ 尽量保持返回结果为简洁的 JSON 或文本摘要，避免过长。

---
相关文档：
- [SSE 实时通信指南](SSE-REALTIME-COMMUNICATION.md)
