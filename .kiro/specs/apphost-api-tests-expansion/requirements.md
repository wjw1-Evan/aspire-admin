# Requirements Document

## Introduction

本文档定义了 Platform.AppHost.Tests 项目的 API 测试扩展功能需求。该功能将为四个核心业务模块添加集成测试：表单定义（Form Definition）、知识库（Knowledge Base）、流程定义（Process Definition）和公文审批（Document Approval）。这些测试将验证 API 端点的正确性、数据完整性和业务流程的端到端功能。

## Glossary

- **Test_System**: Platform.AppHost.Tests 测试系统
- **API_Service**: Platform.ApiService 后端服务
- **Form_Definition**: 表单定义模块，管理动态表单的结构和字段配置
- **Knowledge_Base**: 知识库模块，管理知识库和文档的存储与检索
- **Process_Definition**: 流程定义模块（Workflow Definition），管理工作流的图形化定义和版本
- **Document_Approval**: 公文审批模块，管理公文的创建、提交和审批流程
- **HTTP_Client**: 用于发送 HTTP 请求的客户端
- **Test_Data**: 测试过程中生成的模拟数据
- **Access_Token**: 用户身份验证令牌
- **Workflow_Instance**: 流程实例，表示流程定义的运行时执行状态
- **Approval_Action**: 审批操作（通过、拒绝、退回、转办）

## Requirements

### Requirement 1: 表单定义 API 测试

**User Story:** 作为测试工程师，我希望验证表单定义 API 的完整功能，以确保表单的创建、查询、更新和删除操作正确无误。

#### Acceptance Criteria

1. WHEN 发送创建表单请求且包含有效的表单名称和字段定义，THE Test_System SHALL 验证响应状态码为 200 且返回的表单对象包含生成的 ID
2. WHEN 发送获取表单列表请求，THE Test_System SHALL 验证响应包含分页数据且每个表单对象包含必需字段（Id、Name、Fields）
3. WHEN 发送获取指定 ID 的表单详情请求且该表单存在，THE Test_System SHALL 验证返回的表单数据与创建时的数据一致
4. WHEN 发送更新表单请求且包含修改后的字段定义，THE Test_System SHALL 验证响应状态码为 200 且返回的表单对象反映了更新内容
5. WHEN 发送删除表单请求且该表单存在，THE Test_System SHALL 验证响应状态码为 200 且后续查询该表单返回 404
6. WHEN 发送创建表单请求但缺少必需字段（如表单名称），THE Test_System SHALL 验证响应返回验证错误
7. FOR ALL 创建的表单，表单的 Key 字段 SHALL 自动生成或使用提供的值
8. WHEN 发送获取表单列表请求且包含关键词筛选参数，THE Test_System SHALL 验证返回的表单列表仅包含名称匹配关键词的表单

### Requirement 2: 知识库 API 测试

**User Story:** 作为测试工程师，我希望验证知识库 API 的完整功能，以确保知识库和文档的管理操作正确无误。

#### Acceptance Criteria

1. WHEN 发送创建知识库请求且包含有效的名称和描述，THE Test_System SHALL 验证响应状态码为 200 且返回的知识库对象包含生成的 ID
2. WHEN 发送获取知识库列表请求，THE Test_System SHALL 验证响应包含分页数据且每个知识库对象包含必需字段（Id、Name、Category）
3. WHEN 发送获取指定 ID 的知识库详情请求且该知识库存在，THE Test_System SHALL 验证返回的知识库数据与创建时的数据一致
4. WHEN 发送更新知识库请求且包含修改后的名称或描述，THE Test_System SHALL 验证响应状态码为 200 且返回的知识库对象反映了更新内容
5. WHEN 发送删除知识库请求且该知识库存在，THE Test_System SHALL 验证响应状态码为 200 且后续查询该知识库返回 404
6. WHEN 发送创建知识库请求但缺少必需字段（如名称），THE Test_System SHALL 验证响应返回验证错误
7. WHEN 发送获取知识库列表请求且包含关键词筛选参数，THE Test_System SHALL 验证返回的知识库列表仅包含名称或描述匹配关键词的知识库
8. WHEN 发送更新知识库请求且包含 IsActive 状态变更，THE Test_System SHALL 验证知识库的激活状态正确更新

### Requirement 3: 流程定义 API 测试

**User Story:** 作为测试工程师，我希望验证流程定义 API 的完整功能，以确保工作流的创建、查询、更新和删除操作正确无误，并覆盖所有 26 种流程节点类型。

#### Acceptance Criteria

1. WHEN 发送创建流程定义请求且包含有效的流程名称和图形定义（包含至少一个节点），THE Test_System SHALL 验证响应状态码为 200 且返回的流程对象包含生成的 ID
2. WHEN 发送获取流程定义列表请求，THE Test_System SHALL 验证响应包含分页数据且每个流程对象包含必需字段（Id、Name、Graph、Version）
3. WHEN 发送获取指定 ID 的流程定义详情请求且该流程存在，THE Test_System SHALL 验证返回的流程数据与创建时的数据一致
4. WHEN 发送更新流程定义请求且包含修改后的图形定义，THE Test_System SHALL 验证响应状态码为 200 且返回的流程对象反映了更新内容
5. WHEN 发送删除流程定义请求且该流程存在，THE Test_System SHALL 验证响应状态码为 200 且后续查询该流程返回 404
6. WHEN 发送创建流程定义请求但缺少必需字段（如流程名称或图形定义），THE Test_System SHALL 验证响应返回验证错误
7. WHEN 发送创建流程定义请求但图形定义不合法（如缺少起始节点），THE Test_System SHALL 验证响应返回图形验证错误
8. WHEN 发送获取流程定义列表请求且包含分类筛选参数，THE Test_System SHALL 验证返回的流程列表仅包含指定分类的流程
9. WHEN 发送获取流程定义列表请求且包含状态筛选参数（active/inactive），THE Test_System SHALL 验证返回的流程列表仅包含指定状态的流程
10. WHEN 发送启动流程实例请求且包含有效的流程定义 ID 和文档 ID，THE Test_System SHALL 验证响应状态码为 200 且返回的流程实例对象包含生成的 ID 和初始状态
11. FOR ALL 26 种流程节点类型（ai, ai-judge, answer, approval, code, condition, document-extractor, email, http-request, human-input, iteration, knowledge-search, list-operator, log, notification, parameter-extractor, question-classifier, set-variable, speech-to-text, template, text-to-speech, timer, tool, variable-aggregator, variable-assigner, vision），THE Test_System SHALL 验证包含该节点类型的流程定义能够成功创建和启动
12. WHEN 创建包含特定节点类型的流程定义，THE Test_System SHALL 验证该节点的配置参数正确保存和检索

### Requirement 4: 公文审批 API 测试

**User Story:** 作为测试工程师，我希望验证公文审批 API 的完整功能，以确保公文的创建、提交、审批和查询操作正确无误。

#### Acceptance Criteria

1. WHEN 发送创建公文请求且包含有效的标题和内容，THE Test_System SHALL 验证响应状态码为 200 且返回的公文对象包含生成的 ID
2. WHEN 发送获取公文列表请求，THE Test_System SHALL 验证响应包含分页数据且每个公文对象包含必需字段（Id、Title、Status）
3. WHEN 发送获取指定 ID 的公文详情请求且该公文存在，THE Test_System SHALL 验证返回的公文数据与创建时的数据一致
4. WHEN 发送更新公文请求且包含修改后的标题或内容，THE Test_System SHALL 验证响应状态码为 200 且返回的公文对象反映了更新内容
5. WHEN 发送删除公文请求且该公文存在，THE Test_System SHALL 验证响应状态码为 200 且后续查询该公文返回 404
6. WHEN 发送提交公文请求且包含有效的流程定义 ID，THE Test_System SHALL 验证响应状态码为 200 且返回的流程实例对象状态为 Running
7. WHEN 发送审批通过请求且当前用户是审批人，THE Test_System SHALL 验证响应状态码为 200 且流程实例状态正确更新
8. WHEN 发送审批拒绝请求且包含拒绝原因，THE Test_System SHALL 验证响应状态码为 200 且审批历史记录包含拒绝操作
9. WHEN 发送获取待审批公文列表请求，THE Test_System SHALL 验证返回的公文列表仅包含当前用户有权审批的公文
10. WHEN 发送获取审批历史请求且该公文已提交审批，THE Test_System SHALL 验证返回的历史记录包含所有审批操作的时间戳和审批人信息
11. WHEN 发送创建公文请求但缺少必需字段（如标题），THE Test_System SHALL 验证响应返回验证错误
12. WHEN 发送审批拒绝请求但缺少拒绝原因，THE Test_System SHALL 验证响应返回验证错误

### Requirement 5: 测试数据生成和清理

**User Story:** 作为测试工程师，我希望测试系统能够自动生成测试数据并在测试完成后清理，以确保测试的独立性和可重复性。

#### Acceptance Criteria

1. FOR ALL 测试用例，THE Test_System SHALL 在测试开始前生成唯一的测试数据（包括用户名、表单名称、知识库名称等）
2. FOR ALL 测试用例，THE Test_System SHALL 使用有效的身份验证令牌发送 API 请求
3. WHEN 测试需要创建依赖资源（如创建公文前需要先创建流程定义），THE Test_System SHALL 按正确的顺序创建依赖资源
4. FOR ALL 生成的测试数据，字段值 SHALL 符合 API 的验证规则（如字符串长度、必需字段等）
5. WHEN 测试涉及分页查询，THE Test_System SHALL 验证分页参数（current、pageSize）和响应数据的一致性

### Requirement 6: 端到端集成测试

**User Story:** 作为测试工程师，我希望验证跨模块的业务流程，以确保各模块之间的集成正确无误。

#### Acceptance Criteria

1. WHEN 执行完整的公文审批流程（创建表单 → 创建流程 → 创建公文 → 提交审批 → 审批通过），THE Test_System SHALL 验证每个步骤的响应状态和数据状态正确
2. WHEN 创建流程定义且绑定表单定义，THE Test_System SHALL 验证流程实例启动时能够正确加载表单定义
3. WHEN 公文提交审批后，THE Test_System SHALL 验证流程实例的当前审批人列表包含预期的用户
4. WHEN 审批操作完成后，THE Test_System SHALL 验证公文状态和流程实例状态同步更新
5. WHEN 流程定义包含知识库检索节点，THE Test_System SHALL 验证流程实例能够正确执行知识库查询

### Requirement 7: 错误处理和边界条件测试

**User Story:** 作为测试工程师，我希望验证 API 在异常情况下的错误处理，以确保系统的健壮性。

#### Acceptance Criteria

1. WHEN 发送请求但缺少身份验证令牌，THE Test_System SHALL 验证响应状态码为 401
2. WHEN 发送请求访问不存在的资源（如不存在的表单 ID），THE Test_System SHALL 验证响应状态码为 404
3. WHEN 发送请求但请求体包含无效的 JSON 格式，THE Test_System SHALL 验证响应返回格式错误
4. WHEN 发送分页请求但页码超出有效范围（如负数或超过 10000），THE Test_System SHALL 验证响应返回验证错误
5. WHEN 发送创建请求但字段值超出长度限制，THE Test_System SHALL 验证响应返回验证错误
6. WHEN 发送审批请求但当前用户不是审批人，THE Test_System SHALL 验证响应返回权限错误
7. WHEN 发送更新请求但资源已被删除（软删除），THE Test_System SHALL 验证响应状态码为 404

### Requirement 8: 测试基础设施

**User Story:** 作为测试工程师，我希望测试基础设施能够支持高效的测试执行和结果验证。

#### Acceptance Criteria

1. THE Test_System SHALL 使用 xUnit 测试框架组织和执行测试用例
2. THE Test_System SHALL 使用 AppHostFixture 管理分布式应用的生命周期
3. THE Test_System SHALL 提供辅助方法用于常见的 API 请求操作（如 PostAsJsonAsync、GetAsync）
4. THE Test_System SHALL 提供辅助方法用于验证 API 响应的通用结构（如 ApiResponse<T>）
5. THE Test_System SHALL 记录测试执行日志以便于调试和问题排查
6. WHEN 测试失败，THE Test_System SHALL 提供清晰的错误消息和失败原因
7. THE Test_System SHALL 支持并行执行独立的测试用例以提高测试效率
