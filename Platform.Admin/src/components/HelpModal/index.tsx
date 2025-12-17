import {
  ApiOutlined,
  CodeOutlined,
  QuestionCircleOutlined,
  RocketOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { Modal, Space, Tabs, Typography } from 'antd';
import React from 'react';
import { useIntl } from '@umijs/max';

const { Title, Paragraph, Text } = Typography;

interface HelpModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ open, onClose }) => {
  const intl = useIntl();
  const tabItems = [
    {
      key: 'quick-start',
      label: (
        <span>
          <RocketOutlined /> {intl.formatMessage({ id: 'pages.help.tab.quickStart' })}
        </span>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          <Title level={4}>{intl.formatMessage({ id: 'pages.help.quickStart.welcome' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.quickStart.description' })}
          </Paragraph>

          <Paragraph>
            <Text type="success">
              🎉 {intl.formatMessage({ id: 'pages.help.quickStart.highlights' })}
            </Text>
          </Paragraph>

          <Title level={5}>{intl.formatMessage({ id: 'pages.help.quickStart.coreFeatures' })}</Title>
          <ul>
            <li>
              <strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.userManagement' })}</strong>
            </li>
            <li>
              <strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.roleManagement' })}</strong>
            </li>
            <li>
              <strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.companyCollaboration' })}</strong>
            </li>
            <li>
              <strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.taskManagement' })}</strong>
            </li>
            <li>
              <strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.iotPlatform' })}</strong>
            </li>
            <li>
              <strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.ruleManagement' })}</strong>
            </li>
            <li>
              <strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.realTimeChat' })}</strong>
            </li>
            <li>
              <strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.aiAssistant' })}</strong>
            </li>
            <li>
              <strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.activityLog' })}</strong>
            </li>
            <li>
              <strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.systemMonitor' })}</strong>
            </li>
            <li>
              <strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.apiDocs' })}</strong>
            </li>
            <li>
              <strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.multilang' })}</strong>
            </li>
          </ul>

          <Title level={5}>{intl.formatMessage({ id: 'pages.help.quickStart.multilang.title' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.quickStart.multilang.description' })}
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
              {intl.formatMessage({ id: 'pages.help.quickStart.multilang.note' })}
            </Text>
          </Paragraph>

          <Title level={5}>{intl.formatMessage({ id: 'pages.help.quickStart.highlights.title' })}</Title>
          <Paragraph>
            <strong>{intl.formatMessage({ id: 'pages.help.quickStart.highlights.multiTenant' })}</strong>
          </Paragraph>
          <Paragraph>
            <strong>{intl.formatMessage({ id: 'pages.help.quickStart.highlights.menuPermission' })}</strong>
          </Paragraph>
          <Paragraph>
            <strong>{intl.formatMessage({ id: 'pages.help.quickStart.highlights.realTime' })}</strong>
          </Paragraph>
          <Paragraph>
            <strong>{intl.formatMessage({ id: 'pages.help.quickStart.highlights.aiIntegration' })}</strong>
          </Paragraph>
          <Paragraph>
            <strong>{intl.formatMessage({ id: 'pages.help.quickStart.highlights.iot' })}</strong>
          </Paragraph>
          <Paragraph>
            <strong>{intl.formatMessage({ id: 'pages.help.quickStart.highlights.ruleEngine' })}</strong>
          </Paragraph>

          <Title level={5}>{intl.formatMessage({ id: 'pages.help.quickStart.gettingStarted.title' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.quickStart.gettingStarted.description' })}
          </Paragraph>
          <ol>
            <li>
              <strong>{intl.formatMessage({ id: 'pages.help.quickStart.gettingStarted.step1' })}</strong>
            </li>
            <li>
              <strong>{intl.formatMessage({ id: 'pages.help.quickStart.gettingStarted.step2' })}</strong>
            </li>
            <li>
              <strong>{intl.formatMessage({ id: 'pages.help.quickStart.gettingStarted.step3' })}</strong>
            </li>
            <li>
              <strong>{intl.formatMessage({ id: 'pages.help.quickStart.gettingStarted.step4' })}</strong>
            </li>
            <li>
              <strong>{intl.formatMessage({ id: 'pages.help.quickStart.gettingStarted.step5' })}</strong>
            </li>
          </ol>
          <Paragraph>
            <Text type="secondary">
              💡 {intl.formatMessage({ id: 'pages.help.quickStart.gettingStarted.tip' })}
            </Text>
          </Paragraph>
        </div>
      ),
    },
    {
      key: 'version-history',
      label: (
        <span>
          <CodeOutlined /> {intl.formatMessage({ id: 'pages.help.tab.versionHistory' })}
        </span>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          <Title level={4}>📚 {intl.formatMessage({ id: 'pages.help.versionHistory.title' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.versionHistory.description' })}
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
              🚀 {intl.formatMessage({ id: 'pages.help.versionHistory.latest.title' })}
            </Title>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.versionHistory.latest.newFeatures' })}</Title>
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
              🌐 {intl.formatMessage({ id: 'pages.help.versionHistory.v6_1.title' })}
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
              🎯 {intl.formatMessage({ id: 'pages.help.versionHistory.v6_0.title' })}
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
              🚀 {intl.formatMessage({ id: 'pages.help.versionHistory.v5_0.title' })}
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
              🔧 {intl.formatMessage({ id: 'pages.help.versionHistory.v4_0.title' })}
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
              🏢 {intl.formatMessage({ id: 'pages.help.versionHistory.v3_1.title' })}
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
              ⚡ {intl.formatMessage({ id: 'pages.help.versionHistory.v3_0.title' })}
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
              📊 {intl.formatMessage({ id: 'pages.help.versionHistory.v2_0.title' })}
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

          <Title level={5}>📈 {intl.formatMessage({ id: 'pages.help.versionHistory.trend.title' })}</Title>
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

          <Title level={5}>🔮 {intl.formatMessage({ id: 'pages.help.versionHistory.future.title' })}</Title>
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
          <ApiOutlined /> {intl.formatMessage({ id: 'pages.help.tab.features' })}
        </span>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          <Title level={4}>📋 {intl.formatMessage({ id: 'pages.help.features.title' })}</Title>

          <Title level={5}>👥 {intl.formatMessage({ id: 'pages.help.features.userManagement.title' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.features.userManagement.description' })}
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

          <Title level={5}>🎭 {intl.formatMessage({ id: 'pages.help.features.roleManagement.title' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.features.roleManagement.description' })}
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

          <Title level={5}>🏢 {intl.formatMessage({ id: 'pages.help.features.companyCollaboration.title' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.features.companyCollaboration.description' })}
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

          <Title level={5}>✅ {intl.formatMessage({ id: 'pages.help.features.taskManagement.title' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.features.taskManagement.description' })}
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

          <Title level={5}>🌐 {intl.formatMessage({ id: 'pages.help.features.iotPlatform.title' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.features.iotPlatform.description' })}
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

          <Title level={5}>⚙️ {intl.formatMessage({ id: 'pages.help.features.ruleManagement.title' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.features.ruleManagement.description' })}
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

          <Title level={5}>💬 {intl.formatMessage({ id: 'pages.help.features.realTimeChat.title' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.features.realTimeChat.description' })}
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

          <Title level={5}>🤖 {intl.formatMessage({ id: 'pages.help.features.aiAssistant.title' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.features.aiAssistant.description' })}
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

          <Title level={5}>📊 {intl.formatMessage({ id: 'pages.help.features.activityLog.title' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.features.activityLog.description' })}
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

          <Title level={5}>📈 {intl.formatMessage({ id: 'pages.help.features.systemMonitor.title' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.features.systemMonitor.description' })}
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
          <QuestionCircleOutlined /> {intl.formatMessage({ id: 'pages.help.tab.faq' })}
        </span>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          <Title level={5}>{intl.formatMessage({ id: 'pages.help.faq.forgotPassword.q' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.faq.forgotPassword.a' })}
          </Paragraph>

          <Title level={5}>{intl.formatMessage({ id: 'pages.help.faq.noPermission.q' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.faq.noPermission.a' })}
          </Paragraph>

          <Title level={5}>{intl.formatMessage({ id: 'pages.help.faq.sameButtons.q' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.faq.sameButtons.a' })}
          </Paragraph>

          <Title level={5}>{intl.formatMessage({ id: 'pages.help.faq.editProfile.q' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.faq.editProfile.a' })}
          </Paragraph>

          <Title level={5}>{intl.formatMessage({ id: 'pages.help.faq.dataLoss.q' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.faq.dataLoss.a' })}
          </Paragraph>

          <Title level={5}>{intl.formatMessage({ id: 'pages.help.faq.pageError.q' })}</Title>
          <Paragraph>
            {(() => {
              const pageErrorAnswer = intl.formatMessage({ id: 'pages.help.faq.pageError.a' });
              const lines = pageErrorAnswer.split('\n');
              return lines.map((line, index) => (
                <React.Fragment key={index}>
                  {line}
                  {index < lines.length - 1 && <br />}
                </React.Fragment>
              ));
            })()}
          </Paragraph>

          <Title level={5}>{intl.formatMessage({ id: 'pages.help.faq.switchLanguage.q' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.faq.switchLanguage.a' })}
          </Paragraph>

          <Title level={5}>{intl.formatMessage({ id: 'pages.help.faq.noTranslation.q' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.faq.noTranslation.a' })}
          </Paragraph>

          <Title level={5}>{intl.formatMessage({ id: 'pages.help.faq.taskManagement.q' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.faq.taskManagement.a' })}
          </Paragraph>

          <Title level={5}>{intl.formatMessage({ id: 'pages.help.faq.iotDevice.q' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.faq.iotDevice.a' })}
          </Paragraph>

          <Title level={5}>{intl.formatMessage({ id: 'pages.help.faq.ruleManagement.q' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.faq.ruleManagement.a' })}
          </Paragraph>

          <Title level={5}>{intl.formatMessage({ id: 'pages.help.faq.chat.q' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.faq.chat.a' })}
          </Paragraph>

          <Title level={5}>{intl.formatMessage({ id: 'pages.help.faq.switchCompany.q' })}</Title>
          <Paragraph>
            {intl.formatMessage({ id: 'pages.help.faq.switchCompany.a' })}
          </Paragraph>
        </div>
      ),
    },
    {
      key: 'tech',
      label: (
        <span>
          <ToolOutlined /> {intl.formatMessage({ id: 'pages.help.tab.tech' })}
        </span>
      ),
      children: (
        <div style={{ padding: '16px 0' }}>
          <Title level={5}>{intl.formatMessage({ id: 'pages.help.tech.docs.title' })}</Title>
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

          <Title level={5}>{intl.formatMessage({ id: 'pages.help.tech.contact.title' })}</Title>
          <Paragraph>
            <Space direction="vertical">
              <Text>📧 邮箱: support@example.com</Text>
              <Text>💬 在线客服: 工作日 9:00-18:00</Text>
              <Text>📞 电话: 400-XXX-XXXX</Text>
            </Space>
          </Paragraph>

          <Title level={5}>{intl.formatMessage({ id: 'pages.help.tech.version.title' })}</Title>
          <Paragraph>
            <Text type="secondary">
              {(() => {
                const versionContent = intl.formatMessage({ id: 'pages.help.tech.version.content' });
                const lines = versionContent.split('\n');
                return lines.map((line, index) => (
                  <React.Fragment key={index}>
                    {line}
                    {index < lines.length - 1 && <br />}
                  </React.Fragment>
                ));
              })()}
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
          <span>{intl.formatMessage({ id: 'pages.help.title' })}</span>
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
