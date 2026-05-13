/**
 * Features Tab Content
 */

import { useIntl } from '@umijs/max';
import { Typography } from 'antd';
import React from 'react';

const { Title, Paragraph, Text } = Typography;

const FeaturesContent: React.FC = () => {
  const intl = useIntl();

  return (
    <div style={{ padding: '16px 0' }}>
      <Title level={4}>📋 {intl.formatMessage({ id: 'pages.help.features.title' })}</Title>

      <Title level={5}>👥 {intl.formatMessage({ id: 'pages.help.features.userManagement.title' })}</Title>
      <Paragraph>{intl.formatMessage({ id: 'pages.help.features.userManagement.description' })}</Paragraph>
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
      <Paragraph>{intl.formatMessage({ id: 'pages.help.features.roleManagement.description' })}</Paragraph>
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
        <Text type="secondary">💡 提示：v6.0 版本简化了权限模型，移除了复杂的操作级权限，统一使用菜单级权限控制。</Text>
      </Paragraph>

      <Title level={5}>🏢 {intl.formatMessage({ id: 'pages.help.features.companyCollaboration.title' })}</Title>
      <Paragraph>{intl.formatMessage({ id: 'pages.help.features.companyCollaboration.description' })}</Paragraph>
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
      <Paragraph>{intl.formatMessage({ id: 'pages.help.features.taskManagement.description' })}</Paragraph>
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

      <Title level={5}>🌿 {intl.formatMessage({ id: 'pages.help.features.workflowManagement.title' })}</Title>
      <Paragraph>{intl.formatMessage({ id: 'pages.help.features.workflowManagement.description' })}</Paragraph>
      <ul>
        <li>{intl.formatMessage({ id: 'pages.help.features.workflowManagement.item1' })}</li>
        <li>{intl.formatMessage({ id: 'pages.help.features.workflowManagement.item2' })}</li>
        <li>{intl.formatMessage({ id: 'pages.help.features.workflowManagement.item3' })}</li>
        <li>{intl.formatMessage({ id: 'pages.help.features.workflowManagement.item4' })}</li>
        <li>{intl.formatMessage({ id: 'pages.help.features.workflowManagement.item5' })}</li>
      </ul>

      <Title level={5}>🌐 {intl.formatMessage({ id: 'pages.help.features.iotPlatform.title' })}</Title>
      <Paragraph>{intl.formatMessage({ id: 'pages.help.features.iotPlatform.description' })}</Paragraph>
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
        <Text type="secondary">💡 提示：IoT 平台支持多租户数据隔离，每个企业只能管理自己的设备。</Text>
      </Paragraph>

      <Title level={5}>⚙️ {intl.formatMessage({ id: 'pages.help.features.ruleManagement.title' })}</Title>
      <Paragraph>{intl.formatMessage({ id: 'pages.help.features.ruleManagement.description' })}</Paragraph>
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
      <Paragraph>{intl.formatMessage({ id: 'pages.help.features.realTimeChat.description' })}</Paragraph>
      <ul>
        <li>
          <strong>创建会话</strong> - 与团队成员创建聊天会话
        </li>
        <li>
          <strong>实时消息</strong> - SSE 实时推送消息，支持自动重连
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
      <Paragraph>{intl.formatMessage({ id: 'pages.help.features.aiAssistant.description' })}</Paragraph>
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
      <Paragraph>{intl.formatMessage({ id: 'pages.help.features.activityLog.description' })}</Paragraph>
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
      <Paragraph>{intl.formatMessage({ id: 'pages.help.features.systemMonitor.description' })}</Paragraph>
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

      <Title level={5}>🔐 {intl.formatMessage({ id: 'pages.help.features.passwordBook.title' })}</Title>
      <Paragraph>{intl.formatMessage({ id: 'pages.help.features.passwordBook.description' })}</Paragraph>
      <ul>
        <li>
          <strong>密码存储</strong> - 使用 AES-256-GCM 加密算法，每个用户使用独立密钥
        </li>
        <li>
          <strong>密码生成器</strong> - 自定义长度、字符类型，一键生成强密码
        </li>
        <li>
          <strong>强度检测</strong> - 实时检测密码强度，提供改进建议
        </li>
        <li>
          <strong>分类管理</strong> - 支持自定义分类，便于组织和查找
        </li>
        <li>
          <strong>数据导出</strong> - 支持加密导出，便于备份和迁移
        </li>
      </ul>

      <Title level={5}>☁️ 云存储管理</Title>
      <Paragraph>企业级云存储解决方案，支持文件管理、分享、回收站等完整功能。</Paragraph>
      <ul>
        <li>
          <strong>文件上传/下载</strong> - 支持批量上传、断点续传、文件预览
        </li>
        <li>
          <strong>文件夹管理</strong> - 创建、重命名、移动文件夹
        </li>
        <li>
          <strong>文件搜索</strong> - 按名称、类型、日期范围搜索
        </li>
        <li>
          <strong>文件分享</strong> - 生成分享链接，设置有效期和访问密码
        </li>
        <li>
          <strong>回收站</strong> - 已删除文件进入回收站，支持恢复和永久删除
        </li>
        <li>
          <strong>配额管理</strong> - 查看存储使用量，设置存储配额和警告阈值
        </li>
      </ul>
    </div>
  );
};

export default FeaturesContent;
