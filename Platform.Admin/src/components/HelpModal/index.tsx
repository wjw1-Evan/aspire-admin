import {
  ApiOutlined,
  CodeOutlined,
  QuestionCircleOutlined,
  RocketOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Modal, Space, Tabs, Typography } from 'antd';
import React from 'react';

const { Title, Paragraph, Text } = Typography;

interface HelpModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ open, onClose }) => {
  const tabItems = [
    {
      key: 'quick-start',
      label: (
        <span>
          <RocketOutlined /> 快速开始
        </span>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          <Title level={4}>欢迎使用 Aspire Admin Platform</Title>
          <Paragraph>
            这是一个基于 .NET Aspire、React 和 Ant Design Pro
            构建的现代化企业级管理平台，提供统一的后端服务、管理后台与跨平台移动应用。
          </Paragraph>

          <Paragraph>
            <Text type="success">
              🎉 平台提供多租户数据隔离、菜单级权限控制、实时聊天、AI 助手、IoT 平台、规则管理等完整的企业级功能！
            </Text>
          </Paragraph>

          <Title level={5}>核心功能模块</Title>
          <ul>
            <li>
              <strong>用户管理</strong> - 创建、编辑、删除用户，分配角色，支持多企业隶属
            </li>
            <li>
              <strong>角色管理</strong> - 定义角色，配置菜单权限，简化权限控制
            </li>
            <li>
              <strong>企业协作</strong> - 多租户企业配置、成员管理、加入申请审批、企业切换
            </li>
            <li>
              <strong>任务管理</strong> - 创建任务、分配执行人、跟踪进度、统计报表
            </li>
            <li>
              <strong>IoT 平台</strong> - 设备管理、网关配置、数据流监控、设备状态追踪
            </li>
            <li>
              <strong>规则管理</strong> - 配置业务规则，支持 MCP 集成，自动化工作流
            </li>
            <li>
              <strong>实时聊天</strong> - SignalR 实时通信、会话管理、消息撤回、已读状态
            </li>
            <li>
              <strong>AI 智能助手</strong> - 智能回复、匹配推荐、话题引导、附件处理
            </li>
            <li>
              <strong>活动日志</strong> - 记录所有用户操作，便于审计和追溯
            </li>
            <li>
              <strong>系统监控</strong> - 资源监控、性能指标、健康检查、OpenTelemetry 追踪
            </li>
            <li>
              <strong>API 文档</strong> - 集成 Scalar API 文档系统，支持在线测试
            </li>
            <li>
              <strong>多语言支持</strong> - 支持 8 种语言的完整界面翻译
            </li>
          </ul>

          <Title level={5}>多语言支持</Title>
          <Paragraph>
            系统支持 8 种语言的完整界面翻译：
          </Paragraph>
          <ul>
            <li>🇨🇳 简体中文 (zh-CN)</li>
            <li>🇹🇼 繁体中文 (zh-TW)</li>
            <li>🇺🇸 英语 (en-US)</li>
            <li>🇯🇵 日语 (ja-JP)</li>
            <li>🇧🇷 葡萄牙语-巴西 (pt-BR)</li>
            <li>🇮🇷 波斯语-伊朗 (fa-IR)</li>
            <li>🇮🇩 印尼语 (id-ID)</li>
            <li>🇧🇩 孟加拉语 (bn-BD)</li>
          </ul>
          <Paragraph>
            <Text type="secondary">
              点击右上角的语言选择器可以切换界面语言。所有界面元素（菜单、按钮、提示信息等）都已完整翻译。
            </Text>
          </Paragraph>

          <Title level={5}>功能亮点</Title>
          <Paragraph>
            <strong>多租户架构</strong> - 所有数据通过企业 ID 自动隔离，支持用户隶属多个企业，灵活切换工作空间。
          </Paragraph>
          <Paragraph>
            <strong>菜单级权限</strong> - 简化的权限模型，菜单即权限，能访问菜单就能使用功能，降低配置复杂度。
          </Paragraph>
          <Paragraph>
            <strong>实时通信</strong> - 基于 SignalR 的实时聊天系统，支持自动重连、会话房间、消息撤回、已读状态推送。
          </Paragraph>
          <Paragraph>
            <strong>AI 集成</strong> - 内置 AI 智能回复服务，支持智能匹配推荐、话题引导，提升沟通效率。
          </Paragraph>
          <Paragraph>
            <strong>IoT 平台</strong> - 完整的物联网设备管理能力，支持设备注册、网关配置、数据流监控和状态追踪。
          </Paragraph>
          <Paragraph>
            <strong>规则引擎</strong> - 灵活的规则配置系统，支持 MCP 集成，实现自动化工作流和业务规则管理。
          </Paragraph>

          <Title level={5}>开始使用</Title>
          <Paragraph>
            系统采用注册制，没有默认账户。请按照以下步骤开始使用：
          </Paragraph>
          <ol>
            <li>
              <strong>注册账户</strong> - 访问注册页面，填写用户名、邮箱和密码
            </li>
            <li>
              <strong>自动创建企业</strong> - 注册成功后，系统会自动为您创建个人企业
            </li>
            <li>
              <strong>自动设置管理员</strong> - 您将自动成为企业管理员，拥有所有权限
            </li>
            <li>
              <strong>立即登录</strong> - 注册完成后会自动登录系统
            </li>
            <li>
              <strong>探索功能</strong> - 访问欢迎页面查看系统概览，或直接使用各个功能模块
            </li>
          </ol>
          <Paragraph>
            <Text type="secondary">
              💡 提示：每个用户注册时都会自动获得一个个人企业，您可以后续申请加入其他企业或创建新企业。系统支持多企业切换，方便在不同工作空间间切换。
            </Text>
          </Paragraph>
        </div>
      ),
    },
    {
      key: 'version-history',
      label: (
        <span>
          <CodeOutlined /> 版本历史
        </span>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          <Title level={4}>📚 系统版本历史</Title>
          <Paragraph>
            以下是 Aspire Admin
            平台的完整版本历史，记录了每个版本的重要更新和改进。
          </Paragraph>

          {/* 最新版本 */}
          <div
            style={{
              marginBottom: 32,
              padding: 16,
              border: '1px solid #f0f0f0',
              borderRadius: 8,
              backgroundColor: '#f6ffed',
            }}
          >
            <Title level={5} style={{ color: '#52c41a', marginBottom: 16 }}>
              🚀 最新版本 - 功能完善与扩展
            </Title>

            <Title level={5}>新增功能模块</Title>
            <ul>
              <li>
                <strong>任务管理</strong> - 完整的任务创建、分配、跟踪和统计功能
              </li>
              <li>
                <strong>IoT 平台</strong> - 设备管理、网关配置、数据流监控、设备状态追踪
              </li>
              <li>
                <strong>规则管理</strong> - 业务规则配置系统，支持 MCP 集成和自动化工作流
              </li>
              <li>
                <strong>实时聊天</strong> - SignalR 实时通信，支持会话管理、消息撤回、已读状态
              </li>
              <li>
                <strong>AI 智能助手</strong> - 智能回复、匹配推荐、话题引导、附件处理
              </li>
            </ul>

            <Title level={5}>架构优化</Title>
            <ul>
              <li>
                <strong>多租户数据隔离</strong> - 所有实体通过 IDatabaseOperationFactory 访问，自动处理企业过滤
              </li>
              <li>
                <strong>统一响应格式</strong> - ApiResponse 统一响应模型，BaseApiController 简化控制器开发
              </li>
              <li>
                <strong>中间件增强</strong> - ResponseFormattingMiddleware 统一响应，ActivityLogMiddleware 记录审计
              </li>
              <li>
                <strong>数据库操作工厂</strong> - 自动处理软删除、审计字段、多租户过滤，禁止直接访问 MongoDB
              </li>
            </ul>
          </div>

          {/* v6.1 版本 */}
          <div
            style={{
              marginBottom: 32,
              padding: 16,
              border: '1px solid #f0f0f0',
              borderRadius: 8,
            }}
          >
            <Title level={5} style={{ color: '#1890ff', marginBottom: 16 }}>
              🌐 v6.1.0 - 多语言支持完善
            </Title>

            <Title level={5}>多语言翻译补充</Title>
            <ul>
              <li>
                <strong>完整翻译覆盖</strong> - 所有 8 种语言现在都有完整的界面翻译
              </li>
              <li>
                <strong>企业切换菜单多语言</strong> - 企业切换功能已支持所有语言
              </li>
              <li>
                <strong>翻译一致性</strong> - 统一翻译风格和术语使用
              </li>
              <li>
                <strong>字符分隔符优化</strong> - 根据语言特性使用合适的分隔符
              </li>
            </ul>

            <Title level={5}>翻译统计</Title>
            <ul>
              <li>
                <strong>zh-TW (繁体中文)</strong> - 已补充 387 个翻译键
              </li>
              <li>
                <strong>其他语言</strong> - 正在补充中（参考 zh-CN 和 en-US）
              </li>
              <li>
                <strong>翻译模块</strong> - 涵盖用户管理、角色管理、企业设置、欢迎页面等所有功能模块
              </li>
            </ul>
          </div>

          {/* v6.0 版本 */}
          <div
            style={{
              marginBottom: 32,
              padding: 16,
              border: '1px solid #f0f0f0',
              borderRadius: 8,
            }}
          >
            <Title level={5} style={{ color: '#1890ff', marginBottom: 16 }}>
              🎯 v6.0.0 - 菜单级权限系统重构 (2025-10-14)
            </Title>

            <Title level={5}>核心特性</Title>
            <ul>
              <li>
                <strong>菜单即权限</strong> - 能访问菜单，就能使用该功能
              </li>
              <li>
                <strong>后端验证</strong> - 使用 [RequireMenu("menu-name")] 特性
              </li>
              <li>
                <strong>前端简化</strong> - 所有用户看到相同按钮，权限由后端控制
              </li>
              <li>
                <strong>易于理解</strong> - 权限配置更直观，降低学习成本
              </li>
            </ul>

            <Title level={5}>优化成果</Title>
            <ul>
              <li>
                架构简化：减少 <Text strong>70%</Text> 的权限相关代码
              </li>
              <li>易于理解：菜单即权限，用户一目了然</li>
              <li>减少维护：不需要维护复杂的 Permission 映射</li>
              <li>提升性能：减少数据库查询和内存占用</li>
              <li>用户友好：前端显示所有按钮，避免用户困惑</li>
            </ul>

            <Title level={5}>架构变更</Title>
            <Paragraph>
              <Text code>用户 → 角色 → 菜单 → API</Text>
              <br />
              移除了复杂的 Permission
              实体和操作级权限管理，统一使用菜单级权限控制。
            </Paragraph>
          </div>

          {/* v5.0 版本 */}
          <div
            style={{
              marginBottom: 32,
              padding: 16,
              border: '1px solid #f0f0f0',
              borderRadius: 8,
            }}
          >
            <Title level={5} style={{ color: '#52c41a', marginBottom: 16 }}>
              🚀 v5.0.0 - 后端架构重大升级 (2025-10-13)
            </Title>

            <Title level={5}>新增基础组件</Title>
            <ul>
              <li>
                <strong>BaseService</strong> - 服务基类，统一公共功能
              </li>
              <li>
                <strong>BaseRepository&lt;T&gt;</strong> - 泛型仓储，提供 14
                个通用 CRUD 方法
              </li>
              <li>
                <strong>ValidationExtensions</strong> - 15+ 个参数验证扩展方法
              </li>
              <li>
                <strong>ErrorMessages</strong> - 50+ 个统一错误消息常量
              </li>
            </ul>

            <Title level={5}>优化成果</Title>
            <ul>
              <li>
                代码减少 <Text strong>161 行（8.4%）</Text>
              </li>
              <li>
                重复代码消除 <Text strong>90%+</Text>
              </li>
              <li>
                开发效率提升 <Text strong>50%+</Text>
              </li>
              <li>
                维护成本降低 <Text strong>50%+</Text>
              </li>
              <li>
                代码一致性达到 <Text strong>100%</Text>
              </li>
            </ul>

            <Title level={5}>设计模式应用</Title>
            <ul>
              <li>
                <strong>仓储模式</strong> - 统一数据访问层
              </li>
              <li>
                <strong>模板方法模式</strong> - 公共行为抽象
              </li>
              <li>
                <strong>扩展方法模式</strong> - 流畅的验证 API
              </li>
              <li>
                <strong>泛型编程</strong> - 类型安全的复用
              </li>
            </ul>

            <Title level={5}>SOLID 原则</Title>
            <Paragraph>
              所有代码遵循 SOLID
              五大原则：单一职责、开闭原则、里氏替换、接口隔离、依赖倒置
            </Paragraph>
          </div>

          {/* v4.0 版本 */}
          <div
            style={{
              marginBottom: 32,
              padding: 16,
              border: '1px solid #f0f0f0',
              borderRadius: 8,
            }}
          >
            <Title level={5} style={{ color: '#eb2f96', marginBottom: 16 }}>
              🔧 v4.0.0 - 系统架构扩展优化 (2025-10-11)
            </Title>

            <Title level={5}>架构扩展</Title>
            <ul>
              <li>扩展系统架构，增强可扩展性</li>
              <li>优化组件结构，提升代码复用性</li>
              <li>完善错误处理机制</li>
            </ul>

            <Title level={5}>性能提升</Title>
            <ul>
              <li>进一步优化查询性能</li>
              <li>改进缓存机制</li>
              <li>优化内存使用</li>
            </ul>

            <Title level={5}>开发体验</Title>
            <ul>
              <li>完善开发工具和调试功能</li>
              <li>优化代码生成和模板</li>
              <li>改进文档和注释</li>
            </ul>
          </div>

          {/* v3.1 版本 */}
          <div
            style={{
              marginBottom: 32,
              padding: 16,
              border: '1px solid #f0f0f0',
              borderRadius: 8,
            }}
          >
            <Title level={5} style={{ color: '#13c2c2', marginBottom: 16 }}>
              🏢 v3.1.0 - 多企业隶属架构 (2025-01-13)
            </Title>

            <Title level={5}>多企业支持</Title>
            <ul>
              <li>
                <strong>多企业隶属</strong> - 用户可以隶属多个企业
              </li>
              <li>
                <strong>企业切换</strong> - 支持用户在不同企业间切换
              </li>
              <li>
                <strong>全局用户名</strong> - 用户名全局唯一，简化登录
              </li>
              <li>
                <strong>企业申请加入</strong> - 用户可以申请加入其他企业
              </li>
            </ul>

            <Title level={5}>架构重构</Title>
            <ul>
              <li>UserCompany 多对多关联表</li>
              <li>CompanyJoinRequest 申请审核表</li>
              <li>AppUser 字段迁移（CurrentCompanyId, PersonalCompanyId）</li>
              <li>9个数据库索引优化</li>
            </ul>

            <Title level={5}>核心服务</Title>
            <ul>
              <li>AuthService 重构 - 注册自动创建个人企业</li>
              <li>UserCompanyService - 企业成员管理</li>
              <li>JoinRequestService - 申请审核流程</li>
              <li>TenantContext 重构 - 多企业支持</li>
            </ul>

            <Title level={5}>API接口</Title>
            <ul>
              <li>16个新增API端点</li>
              <li>企业搜索、成员管理、申请审核</li>
              <li>企业切换、角色分配</li>
            </ul>
          </div>

          {/* v3.0 版本 */}
          <div
            style={{
              marginBottom: 32,
              padding: 16,
              border: '1px solid #f0f0f0',
              borderRadius: 8,
            }}
          >
            <Title level={5} style={{ color: '#52c41a', marginBottom: 16 }}>
              ⚡ v3.0.0 - 代码质量提升 (2025-10-12)
            </Title>

            <Title level={5}>代码质量优化</Title>
            <ul>
              <li>
                <strong>常量管理</strong> - 消除魔法字符串，使用常量管理
              </li>
              <li>
                <strong>扩展方法</strong> - 简化重复代码，提供流畅API
              </li>
              <li>
                <strong>响应模型</strong> - 类型安全的响应模型
              </li>
              <li>
                <strong>验证器</strong> - 统一验证逻辑
              </li>
            </ul>

            <Title level={5}>组件优化</Title>
            <ul>
              <li>
                <strong>公共组件</strong> - 提高组件复用性
              </li>
              <li>
                <strong>自定义 Hooks</strong> - 业务逻辑分离
              </li>
              <li>
                <strong>类型定义</strong> - 完整的 TypeScript 类型
              </li>
            </ul>

            <Title level={5}>后端优化</Title>
            <ul>
              <li>30+ 权限资源和操作常量</li>
              <li>15+ 个参数验证扩展方法</li>
              <li>50+ 个统一错误消息常量</li>
              <li>10+ MongoDB 过滤器扩展方法</li>
            </ul>

            <Title level={5}>前端优化</Title>
            <ul>
              <li>DeleteConfirmModal - 删除确认对话框</li>
              <li>BulkActionModal - 批量操作对话框</li>
              <li>useDeleteConfirm - 删除确认逻辑封装</li>
              <li>useBulkAction - 批量操作逻辑封装</li>
            </ul>
          </div>

          {/* v2.0 版本 */}
          <div
            style={{
              marginBottom: 32,
              padding: 16,
              border: '1px solid #f0f0f0',
              borderRadius: 8,
            }}
          >
            <Title level={5} style={{ color: '#fa8c16', marginBottom: 16 }}>
              📊 v2.0.0 - 数据模型统一与性能优化 (2025-10-12)
            </Title>

            <Title level={5}>数据模型统一</Title>
            <ul>
              <li>移除冗余的 Role 字段，统一使用 RoleIds</li>
              <li>优化 JWT 结构，简化认证流程</li>
              <li>自动数据迁移，向后兼容</li>
            </ul>

            <Title level={5}>性能优化</Title>
            <ul>
              <li>
                解决 N+1 查询问题，提升 <Text strong>80%+</Text> 性能
              </li>
              <li>添加 18 个数据库索引，加速查询</li>
              <li>优化批量操作逻辑</li>
            </ul>

            <Title level={5}>安全加固</Title>
            <ul>
              <li>完善权限验证机制</li>
              <li>实现级联删除保护</li>
              <li>添加业务规则保护</li>
            </ul>

            <Title level={5}>搜索增强</Title>
            <ul>
              <li>支持多角色筛选</li>
              <li>支持日期范围查询</li>
              <li>多条件组合搜索</li>
            </ul>
          </div>

          {/* API 文档功能 */}
          <div
            style={{
              marginBottom: 32,
              padding: 16,
              border: '1px solid #f0f0f0',
              borderRadius: 8,
            }}
          >
            <Title level={5} style={{ color: '#722ed1', marginBottom: 16 }}>
              📖 API 文档系统 - Scalar 集成
            </Title>

            <Title level={5}>功能特性</Title>
            <ul>
              <li>
                <strong>浏览所有 API 端点</strong> - 按 Controller 分组展示
              </li>
              <li>
                <strong>查看请求/响应 Schema</strong> - 完整的类型定义
              </li>
              <li>
                <strong>在线测试 API</strong> - 直接调用接口进行测试
              </li>
              <li>
                <strong>JWT 认证支持</strong> - 配置 Token 后自动认证
              </li>
              <li>
                <strong>参数说明和示例</strong> - 详细的接口文档
              </li>
            </ul>

            <Title level={5}>如何访问</Title>
            <ol>
              <li>
                启动应用 - 运行{' '}
                <Text code>dotnet run --project Platform.AppHost</Text>
              </li>
              <li>
                打开 Aspire Dashboard - 访问{' '}
                <Text code>http://localhost:15003</Text>
              </li>
              <li>找到 Scalar API Reference - 在 Resources 标签页中</li>
              <li>点击端点链接 - 在新标签页中打开 Scalar 文档</li>
            </ol>
          </div>

          <Title level={5}>📈 版本演进趋势</Title>
          <ul>
            <li>
              <strong>v2.0</strong> - 基础功能完善，性能优化
            </li>
            <li>
              <strong>v3.0</strong> - 代码质量提升，组件优化
            </li>
            <li>
              <strong>v3.1</strong> - 多企业隶属架构，企业协作
            </li>
            <li>
              <strong>v4.0</strong> - 系统架构扩展，开发体验优化
            </li>
            <li>
              <strong>v5.0</strong> - 后端架构重构，代码质量提升
            </li>
            <li>
              <strong>v6.0</strong> - 权限简化，用户体验优化
            </li>
            <li>
              <strong>v6.1</strong> - 多语言支持完善，国际化覆盖
            </li>
          </ul>

          <Title level={5}>🔮 未来规划</Title>
          <ul>
            <li>继续优化用户体验和界面交互</li>
            <li>增强系统性能和可扩展性</li>
            <li>扩展 IoT 平台功能（设备联动、场景自动化）</li>
            <li>完善规则引擎和 MCP 集成能力</li>
            <li>增强 AI 助手功能（多模型支持、自定义提示词）</li>
            <li>完善移动端功能（React Native + Expo）</li>
            <li>完善文档体系和开发指南</li>
            <li>增加更多语言支持</li>
          </ul>
        </div>
      ),
    },
    {
      key: 'features',
      label: (
        <span>
          <ApiOutlined /> 功能说明
        </span>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          <Title level={4}>📋 功能模块详细说明</Title>

          <Title level={5}>👥 用户管理</Title>
          <Paragraph>
            用户管理模块提供完整的用户生命周期管理功能：
          </Paragraph>
          <ul>
            <li>
              <strong>创建用户</strong> - 支持设置用户名、邮箱、手机号、密码等基本信息
            </li>
            <li>
              <strong>编辑用户</strong> - 修改用户信息、重置密码、启用/禁用账户
            </li>
            <li>
              <strong>角色分配</strong> - 为用户分配一个或多个角色，控制功能访问权限
            </li>
            <li>
              <strong>企业关联</strong> - 查看用户所属企业，支持多企业隶属
            </li>
            <li>
              <strong>搜索筛选</strong> - 支持按用户名、邮箱、角色、企业等条件搜索
            </li>
          </ul>

          <Title level={5}>🎭 角色管理</Title>
          <Paragraph>
            角色管理采用菜单级权限模型，简化权限配置：
          </Paragraph>
          <ul>
            <li>
              <strong>创建角色</strong> - 定义角色名称、描述，配置菜单权限
            </li>
            <li>
              <strong>菜单权限</strong> - 通过勾选菜单项分配权限，菜单即权限
            </li>
            <li>
              <strong>权限继承</strong> - 获得菜单权限即拥有对应 API 访问权限
            </li>
            <li>
              <strong>角色分配</strong> - 将角色分配给用户，用户获得角色所有权限
            </li>
          </ul>
          <Paragraph>
            <Text type="secondary">
              💡 提示：v6.0 版本简化了权限模型，移除了复杂的操作级权限，统一使用菜单级权限控制。
            </Text>
          </Paragraph>

          <Title level={5}>🏢 企业协作</Title>
          <Paragraph>
            多租户企业协作功能，支持企业创建、成员管理、申请审批：
          </Paragraph>
          <ul>
            <li>
              <strong>企业设置</strong> - 查看和编辑当前企业信息（名称、描述、联系方式等）
            </li>
            <li>
              <strong>成员管理</strong> - 查看企业成员列表，分配角色，移除成员
            </li>
            <li>
              <strong>企业搜索</strong> - 搜索其他企业，申请加入
            </li>
            <li>
              <strong>加入申请</strong> - 查看我发起的申请和待我审批的申请
            </li>
            <li>
              <strong>企业切换</strong> - 在多个隶属企业间切换，数据自动隔离
            </li>
            <li>
              <strong>管理员设置</strong> - 企业管理员可以设置其他成员为管理员
            </li>
          </ul>

          <Title level={5}>✅ 任务管理</Title>
          <Paragraph>
            完整的任务管理功能，支持任务创建、分配、跟踪和统计：
          </Paragraph>
          <ul>
            <li>
              <strong>创建任务</strong> - 设置任务标题、描述、优先级、截止日期
            </li>
            <li>
              <strong>任务分配</strong> - 将任务分配给团队成员，支持多执行人
            </li>
            <li>
              <strong>状态跟踪</strong> - 任务状态（待开始、进行中、已完成、已取消）
            </li>
            <li>
              <strong>进度管理</strong> - 更新任务进度，添加备注和附件
            </li>
            <li>
              <strong>统计报表</strong> - 查看任务统计、完成率、工作量分析
            </li>
            <li>
              <strong>筛选搜索</strong> - 按状态、执行人、优先级、日期范围筛选
            </li>
          </ul>

          <Title level={5}>🌐 IoT 平台</Title>
          <Paragraph>
            物联网设备管理平台，支持设备注册、监控和数据流管理：
          </Paragraph>
          <ul>
            <li>
              <strong>设备管理</strong> - 注册设备、编辑设备信息、查看设备列表
            </li>
            <li>
              <strong>网关配置</strong> - 配置设备网关，管理网关连接
            </li>
            <li>
              <strong>数据流监控</strong> - 实时监控设备数据流，查看历史数据
            </li>
            <li>
              <strong>设备状态</strong> - 追踪设备在线/离线状态，设备健康度
            </li>
            <li>
              <strong>数据统计</strong> - 设备数据统计报表，趋势分析
            </li>
          </ul>
          <Paragraph>
            <Text type="secondary">
              💡 提示：IoT 平台支持多租户数据隔离，每个企业只能管理自己的设备。
            </Text>
          </Paragraph>

          <Title level={5}>⚙️ 规则管理</Title>
          <Paragraph>
            业务规则配置系统，支持规则创建、MCP 集成和自动化工作流：
          </Paragraph>
          <ul>
            <li>
              <strong>规则创建</strong> - 定义规则名称、描述、触发条件、执行动作
            </li>
            <li>
              <strong>规则状态</strong> - 启用/禁用规则，支持草稿、启用、禁用、过期状态
            </li>
            <li>
              <strong>MCP 集成</strong> - 支持 MCP 工具、资源、提示词配置
            </li>
            <li>
              <strong>规则执行</strong> - 自动执行规则，支持条件判断和动作触发
            </li>
            <li>
              <strong>规则版本</strong> - 支持规则版本管理和历史记录
            </li>
          </ul>

          <Title level={5}>💬 实时聊天</Title>
          <Paragraph>
            基于 SignalR 的实时聊天系统，支持会话管理和消息功能：
          </Paragraph>
          <ul>
            <li>
              <strong>创建会话</strong> - 与团队成员创建聊天会话
            </li>
            <li>
              <strong>实时消息</strong> - SignalR 实时推送消息，支持自动重连
            </li>
            <li>
              <strong>消息管理</strong> - 发送、撤回消息，查看已读状态
            </li>
            <li>
              <strong>附件支持</strong> - 上传附件，支持图片、文档等文件类型
            </li>
            <li>
              <strong>会话摘要</strong> - 自动生成会话摘要，快速了解对话内容
            </li>
            <li>
              <strong>消息搜索</strong> - 搜索历史消息，按关键词查找
            </li>
          </ul>

          <Title level={5}>🤖 AI 智能助手</Title>
          <Paragraph>
            集成 AI 智能回复服务，提升沟通效率：
          </Paragraph>
          <ul>
            <li>
              <strong>智能回复</strong> - AI 自动生成回复建议，一键插入
            </li>
            <li>
              <strong>匹配推荐</strong> - 根据对话内容推荐相关话题和回复
            </li>
            <li>
              <strong>话题引导</strong> - AI 提供话题建议，引导对话方向
            </li>
            <li>
              <strong>附件处理</strong> - 支持附件内容分析和智能回复
            </li>
            <li>
              <strong>多模型支持</strong> - 支持配置不同的 AI 模型和参数
            </li>
          </ul>

          <Title level={5}>📊 活动日志</Title>
          <Paragraph>
            完整的用户操作审计日志，记录所有关键操作：
          </Paragraph>
          <ul>
            <li>
              <strong>操作记录</strong> - 记录所有 CRUD 操作（创建、读取、更新、删除）
            </li>
            <li>
              <strong>用户追踪</strong> - 记录操作人、操作时间、IP 地址等信息
            </li>
            <li>
              <strong>数据变更</strong> - 记录数据变更前后的值，便于追溯
            </li>
            <li>
              <strong>筛选查询</strong> - 按用户、操作类型、时间范围筛选日志
            </li>
            <li>
              <strong>导出功能</strong> - 支持日志导出，便于审计和分析
            </li>
          </ul>

          <Title level={5}>📈 系统监控</Title>
          <Paragraph>
            系统资源监控和性能指标查看：
          </Paragraph>
          <ul>
            <li>
              <strong>资源监控</strong> - CPU、内存、磁盘、网络使用情况
            </li>
            <li>
              <strong>性能指标</strong> - API 响应时间、请求量、错误率等
            </li>
            <li>
              <strong>健康检查</strong> - 服务健康状态，依赖服务状态
            </li>
            <li>
              <strong>OpenTelemetry</strong> - 分布式追踪，请求链路分析
            </li>
          </ul>
        </div>
      ),
    },
    {
      key: 'faq',
      label: (
        <span>
          <QuestionCircleOutlined /> 常见问题
        </span>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          <Title level={5}>Q: 忘记密码怎么办？</Title>
          <Paragraph>
            请联系系统管理员重置密码，或通过"忘记密码"功能自助重置。
          </Paragraph>

          <Title level={5}>Q: 没有某个功能的权限？</Title>
          <Paragraph>
            请联系管理员为您分配相应的角色和菜单权限。在 v6.0
            中，权限控制已简化为菜单级权限。
          </Paragraph>

          <Title level={5}>Q: 为什么所有用户看到相同的按钮？</Title>
          <Paragraph>
            这是 v6.0
            的设计特性。所有用户看到相同的界面，但点击按钮时，后端会验证菜单权限。无权限时会返回
            403 错误。
          </Paragraph>

          <Title level={5}>Q: 如何修改个人信息？</Title>
          <Paragraph>
            点击右上角头像 → 选择"个人中心"，即可修改个人信息和密码。
          </Paragraph>

          <Title level={5}>Q: 数据丢失或误删除？</Title>
          <Paragraph>
            系统采用软删除机制，数据不会真正删除。请联系管理员恢复数据。
          </Paragraph>

          <Title level={5}>Q: 页面加载慢或出错？</Title>
          <Paragraph>
            1. 清除浏览器缓存（Ctrl+Shift+R 或 Cmd+Shift+R）
            <br />
            2. 检查网络连接
            <br />
            3. 尝试重新登录
            <br />
            4. 如果问题持续，请联系技术支持
          </Paragraph>

          <Title level={5}>Q: 如何切换界面语言？</Title>
          <Paragraph>
            点击右上角的语言选择器（🌐 图标），选择您想要的语言。系统支持 8 种语言：
            <br />
            简体中文、繁体中文、英语、日语、葡萄牙语（巴西）、波斯语（伊朗）、印尼语、孟加拉语
          </Paragraph>

          <Title level={5}>Q: 某些界面元素没有翻译？</Title>
          <Paragraph>
            系统正在持续完善多语言支持。如果发现某些内容未翻译，请联系技术支持。
            目前核心功能（用户管理、角色管理、企业设置等）已完整支持所有语言。
          </Paragraph>

          <Title level={5}>Q: 如何使用任务管理功能？</Title>
          <Paragraph>
            访问"任务管理"菜单，您可以创建新任务、分配给团队成员、设置优先级和截止日期。
            系统会自动跟踪任务进度，并提供统计报表帮助您了解任务完成情况。
          </Paragraph>

          <Title level={5}>Q: IoT 平台如何添加设备？</Title>
          <Paragraph>
            在"IoT 平台"页面，点击"添加设备"按钮，填写设备信息（名称、类型、网关等）。
            设备添加后，系统会自动监控设备状态和数据流，您可以在设备列表中查看详细信息。
          </Paragraph>

          <Title level={5}>Q: 规则管理支持哪些功能？</Title>
          <Paragraph>
            规则管理系统支持创建业务规则、配置触发条件、设置执行动作。系统支持 MCP 集成，
            可以实现自动化工作流。规则可以启用/禁用，支持状态管理和版本控制。
          </Paragraph>

          <Title level={5}>Q: 实时聊天功能如何使用？</Title>
          <Paragraph>
            系统集成了 SignalR 实时聊天功能，支持创建会话、发送消息、撤回消息、查看已读状态。
            聊天记录会自动保存，支持附件上传和预览。AI 智能助手可以帮助您快速回复和推荐内容。
          </Paragraph>

          <Title level={5}>Q: 如何切换企业？</Title>
          <Paragraph>
            点击右上角头像 → 选择"切换企业"，在弹出窗口中选择要切换的企业。
            系统支持用户隶属多个企业，切换后所有数据会自动按企业隔离显示。
          </Paragraph>
        </div>
      ),
    },
    {
      key: 'tech',
      label: (
        <span>
          <ToolOutlined /> 技术支持
        </span>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          <Title level={5}>技术文档</Title>
          <ul>
            <li>
              <a href="https://pro.ant.design" target="_blank" rel="noreferrer">
                Ant Design Pro 文档
              </a>
            </li>
            <li>
              <a href="https://ant.design" target="_blank" rel="noreferrer">
                Ant Design 组件库
              </a>
            </li>
            <li>
              <a
                href="https://learn.microsoft.com/zh-cn/dotnet/aspire"
                target="_blank"
                rel="noreferrer"
              >
                .NET Aspire 文档
              </a>
            </li>
            <li>
              <a
                href="https://www.mongodb.com/docs"
                target="_blank"
                rel="noreferrer"
              >
                MongoDB 文档
              </a>
            </li>
          </ul>

          <Title level={5}>联系我们</Title>
          <Paragraph>
            <Space direction="vertical">
              <Text>📧 邮箱: support@example.com</Text>
              <Text>💬 在线客服: 工作日 9:00-18:00</Text>
              <Text>📞 电话: 400-XXX-XXXX</Text>
            </Space>
          </Paragraph>

          <Title level={5}>版本信息</Title>
          <Paragraph>
            <Text type="secondary">
              Aspire Admin Platform
              <br />
              核心版本: v6.1.0+
              <br />
              更新内容: 多语言支持完善、任务管理、IoT 平台、规则管理、实时聊天、AI 助手
              <br />
              支持语言: 8 种语言（中文、英文、日语、葡萄牙语、波斯语、印尼语、孟加拉语）
              <br />
              技术栈: .NET 10, React 19, Ant Design Pro, MongoDB, SignalR, .NET Aspire
              <br />© 2025 All Rights Reserved
            </Text>
          </Paragraph>
        </div>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <QuestionCircleOutlined />
          <span>系统帮助</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={800}
      style={{ top: 40 }}
      destroyOnHidden
    >
      <Tabs
        defaultActiveKey="quick-start"
        items={tabItems}
        style={{ marginTop: 16 }}
      />
    </Modal>
  );
};

export default HelpModal;
