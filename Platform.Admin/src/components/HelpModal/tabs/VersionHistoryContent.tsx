/**
 * Version History Tab Content
 */

import { useIntl } from '@umijs/max';
import { Typography } from 'antd';
import React from 'react';

const { Title, Paragraph, Text } = Typography;

const cardStyle = {
  marginBottom: 32,
  padding: 16,
  border: '1px solid #f0f0f0',
  borderRadius: 8,
};

const VersionHistoryContent: React.FC = () => {
  const intl = useIntl();

  return (
    <div style={{ padding: '16px 0' }}>
      <Title level={4}>📚 {intl.formatMessage({ id: 'pages.help.versionHistory.title' })}</Title>
      <Paragraph>{intl.formatMessage({ id: 'pages.help.versionHistory.description' })}</Paragraph>

      {/* v6.2 版本 */}
      <div style={{ ...cardStyle, backgroundColor: '#e6f7ff' }}>
        <Title level={5} style={{ color: '#1890ff', marginBottom: 16 }}>
          ⚡ {intl.formatMessage({ id: 'pages.help.versionHistory.v6_2.title' })}
        </Title>
        <Title level={5}>{intl.formatMessage({ id: 'pages.help.versionHistory.v6_2.workflow.title' })}</Title>
        <ul>
          <li>{intl.formatMessage({ id: 'pages.help.versionHistory.v6_2.workflow.feature1' })}</li>
          <li>{intl.formatMessage({ id: 'pages.help.versionHistory.v6_2.workflow.feature2' })}</li>
          <li>{intl.formatMessage({ id: 'pages.help.versionHistory.v6_2.workflow.feature3' })}</li>
          <li>{intl.formatMessage({ id: 'pages.help.versionHistory.v6_2.workflow.feature4' })}</li>
        </ul>
        <Title level={5}>{intl.formatMessage({ id: 'pages.help.versionHistory.v6_2.ui.title' })}</Title>
        <ul>
          <li>{intl.formatMessage({ id: 'pages.help.versionHistory.v6_2.ui.feature1' })}</li>
          <li>{intl.formatMessage({ id: 'pages.help.versionHistory.v6_2.ui.feature2' })}</li>
        </ul>
      </div>

      {/* 最新版本 */}
      <div style={{ ...cardStyle, backgroundColor: '#f6ffed' }}>
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
            <strong>实时聊天</strong> - SSE 实时通信，支持会话管理、消息撤回、已读状态
          </li>
          <li>
            <strong>AI 智能助手</strong> - 智能回复、匹配推荐、话题引导、附件处理
          </li>
          <li>
            <strong>密码本管理</strong> - AES-256-GCM 加密存储、密码生成器、强度检测、数据导出
          </li>
          <li>
            <strong>云存储管理</strong> - 文件上传/下载、文件夹管理、文件搜索、回收站管理
          </li>
          <li>
            <strong>存储配额管理</strong> - 配额设置与监控、配额警告、企业存储统计、使用量排行榜
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
      <div style={cardStyle}>
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
      <div style={cardStyle}>
        <Title level={5} style={{ color: '#1890ff', marginBottom: 16 }}>
          🎯 {intl.formatMessage({ id: 'pages.help.versionHistory.v6_0.title' })}
        </Title>
        <Title level={5}>核心特性</Title>
        <ul>
          <li>
            <strong>菜单即权限</strong> - 能访问菜单，就能使用该功能
          </li>
          <li>
            <strong>后端验证</strong> - 使用 [RequireMenu(&quot;menu-name&quot;)] 特性
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
          移除了复杂的 Permission 实体和操作级权限管理，统一使用菜单级权限控制。
        </Paragraph>
      </div>

      {/* v5.0 版本 */}
      <div style={cardStyle}>
        <Title level={5} style={{ color: '#52c41a', marginBottom: 16 }}>
          🚀 {intl.formatMessage({ id: 'pages.help.versionHistory.v5_0.title' })}
        </Title>
        <Title level={5}>新增基础组件</Title>
        <ul>
          <li>
            <strong>BaseService</strong> - 服务基类，统一公共功能
          </li>
          <li>
            <strong>BaseRepository&lt;T&gt;</strong> - 泛型仓储，提供 14 个通用 CRUD 方法
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
      </div>

      {/* v4.0 版本 */}
      <div style={cardStyle}>
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
      </div>

      {/* v3.1 版本 */}
      <div style={cardStyle}>
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
      </div>

      {/* v3.0 版本 */}
      <div style={cardStyle}>
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
      </div>

      {/* v2.0 版本 */}
      <div style={cardStyle}>
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
      </div>

      {/* API 文档功能 */}
      <div style={cardStyle}>
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
            启动应用 - 运行 <Text code>dotnet run --project Platform.AppHost</Text>
          </li>
          <li>
            打开 Aspire Dashboard - 访问 <Text code>http://localhost:15003</Text>
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
        <li>
          <strong>v6.2</strong> - {intl.formatMessage({ id: 'pages.help.versionHistory.v6_2.summary' })}
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
  );
};

export default VersionHistoryContent;
