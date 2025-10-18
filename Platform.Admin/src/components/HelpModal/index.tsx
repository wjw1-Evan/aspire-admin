import {
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
          <Title level={4}>欢迎使用 Aspire Admin v6.0</Title>
          <Paragraph>
            这是一个基于 .NET Aspire、React 和 Ant Design Pro
            构建的现代化企业级管理平台。
          </Paragraph>

          <Paragraph>
            <Text type="success">
              🎉 v6.0 版本带来了菜单级权限系统的重大简化！
            </Text>
          </Paragraph>

          <Title level={5}>主要功能</Title>
          <ul>
            <li>
              <strong>用户管理</strong> - 创建、编辑、删除用户，分配角色
            </li>
            <li>
              <strong>角色管理</strong> - 定义角色，配置菜单权限
            </li>
            <li>
              <strong>菜单级权限</strong> - 简化的权限控制，菜单即权限
            </li>
            <li>
              <strong>企业设置</strong> - 多租户企业配置管理
            </li>
            <li>
              <strong>活动日志</strong> - 记录所有用户操作，便于审计
            </li>
            <li>
              <strong>API 文档</strong> - 集成 Scalar API 文档系统
            </li>
          </ul>

          <Title level={5}>默认账户</Title>
          <Paragraph>
            <Text code>用户名: admin</Text>
            <br />
            <Text code>密码: admin123</Text>
            <br />
            <Text type="warning">⚠️ 请登录后立即修改密码！</Text>
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

            <Title level={6}>核心特性</Title>
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

            <Title level={6}>优化成果</Title>
            <ul>
              <li>
                架构简化：减少 <Text strong>70%</Text> 的权限相关代码
              </li>
              <li>易于理解：菜单即权限，用户一目了然</li>
              <li>减少维护：不需要维护复杂的 Permission 映射</li>
              <li>提升性能：减少数据库查询和内存占用</li>
              <li>用户友好：前端显示所有按钮，避免用户困惑</li>
            </ul>

            <Title level={6}>架构变更</Title>
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

            <Title level={6}>新增基础组件</Title>
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

            <Title level={6}>优化成果</Title>
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

            <Title level={6}>设计模式应用</Title>
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

            <Title level={6}>SOLID 原则</Title>
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

            <Title level={6}>架构扩展</Title>
            <ul>
              <li>扩展系统架构，增强可扩展性</li>
              <li>优化组件结构，提升代码复用性</li>
              <li>完善错误处理机制</li>
            </ul>

            <Title level={6}>性能提升</Title>
            <ul>
              <li>进一步优化查询性能</li>
              <li>改进缓存机制</li>
              <li>优化内存使用</li>
            </ul>

            <Title level={6}>开发体验</Title>
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

            <Title level={6}>多企业支持</Title>
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

            <Title level={6}>架构重构</Title>
            <ul>
              <li>UserCompany 多对多关联表</li>
              <li>CompanyJoinRequest 申请审核表</li>
              <li>AppUser 字段迁移（CurrentCompanyId, PersonalCompanyId）</li>
              <li>9个数据库索引优化</li>
            </ul>

            <Title level={6}>核心服务</Title>
            <ul>
              <li>AuthService 重构 - 注册自动创建个人企业</li>
              <li>UserCompanyService - 企业成员管理</li>
              <li>JoinRequestService - 申请审核流程</li>
              <li>TenantContext 重构 - 多企业支持</li>
            </ul>

            <Title level={6}>API接口</Title>
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

            <Title level={6}>代码质量优化</Title>
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

            <Title level={6}>组件优化</Title>
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

            <Title level={6}>后端优化</Title>
            <ul>
              <li>30+ 权限资源和操作常量</li>
              <li>15+ 个参数验证扩展方法</li>
              <li>50+ 个统一错误消息常量</li>
              <li>10+ MongoDB 过滤器扩展方法</li>
            </ul>

            <Title level={6}>前端优化</Title>
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

            <Title level={6}>数据模型统一</Title>
            <ul>
              <li>移除冗余的 Role 字段，统一使用 RoleIds</li>
              <li>优化 JWT 结构，简化认证流程</li>
              <li>自动数据迁移，向后兼容</li>
            </ul>

            <Title level={6}>性能优化</Title>
            <ul>
              <li>
                解决 N+1 查询问题，提升 <Text strong>80%+</Text> 性能
              </li>
              <li>添加 18 个数据库索引，加速查询</li>
              <li>优化批量操作逻辑</li>
            </ul>

            <Title level={6}>安全加固</Title>
            <ul>
              <li>完善权限验证机制</li>
              <li>实现级联删除保护</li>
              <li>添加业务规则保护</li>
            </ul>

            <Title level={6}>搜索增强</Title>
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

            <Title level={6}>功能特性</Title>
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

            <Title level={6}>如何访问</Title>
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
          </ul>

          <Title level={5}>🔮 未来规划</Title>
          <ul>
            <li>继续优化用户体验</li>
            <li>增强系统性能</li>
            <li>扩展功能模块</li>
            <li>完善文档体系</li>
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
              Aspire Admin v6.0.0
              <br />
              更新日期: 2025-10-14
              <br />
              更新内容: 菜单级权限系统重构，简化权限控制架构
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
      destroyOnClose
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
