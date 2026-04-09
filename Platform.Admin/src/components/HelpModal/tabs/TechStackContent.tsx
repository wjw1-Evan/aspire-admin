/**
 * Tech Stack Tab Content
 */

import React from 'react';
import { Space, Typography } from 'antd';
import { useIntl } from '@umijs/max';
import Settings from '../../../../config/defaultSettings';

const { Title, Paragraph, Text } = Typography;

const TechStackContent: React.FC = () => {
    const intl = useIntl();

    return (
        <div style={{ padding: '16px 0' }}>
            <Title level={4}>🛠️ {intl.formatMessage({ id: 'pages.help.tech.title' })}</Title>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.tech.backend.title' })}</Title>
            <ul>
                <li><strong>.NET 10.0</strong> - 最新的 .NET 平台，高性能 Web API</li>
                <li><strong>ASP.NET Core</strong> - 跨平台 Web 框架</li>
                <li><strong>.NET Aspire</strong> - 云原生应用开发框架</li>
                <li><strong>MongoDB</strong> - 文档数据库，灵活的数据模型</li>
                <li><strong>Redis</strong> - 高性能缓存和会话存储</li>
                <li><strong>JWT</strong> - 无状态身份验证</li>
                <li><strong>OpenTelemetry</strong> - 分布式追踪和监控</li>
            </ul>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.tech.frontend.title' })}</Title>
            <ul>
                <li><strong>React 18</strong> - 现代化前端框架</li>
                <li><strong>TypeScript 5</strong> - 类型安全的 JavaScript</li>
                <li><strong>Ant Design 5</strong> - 企业级 UI 组件库</li>
                <li><strong>Ant Design Pro</strong> - 开箱即用的中后台解决方案</li>
                <li><strong>UmiJS 4</strong> - 企业级前端框架</li>
                <li><strong>React Query</strong> - 数据获取和缓存管理</li>
            </ul>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.tech.mobile.title' })}</Title>
            <ul>
                <li><strong>React Native</strong> - 跨平台移动应用开发</li>
                <li><strong>Expo</strong> - React Native 开发工具链</li>
                <li><strong>TypeScript</strong> - 类型安全</li>
            </ul>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.tech.devtools.title' })}</Title>
            <ul>
                <li><strong>Scalar</strong> - OpenAPI 交互式文档</li>
                <li><strong>Aspire Dashboard</strong> - 服务监控和追踪</li>
                <li><strong>ESLint + Prettier</strong> - 代码规范和格式化</li>
                <li><strong>Docker</strong> - 容器化部署</li>
            </ul>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.tech.docs.title' })}</Title>
            <Paragraph><strong>项目文档</strong></Paragraph>
            <ul>
                <li>
                    <a href="https://github.com/your-repo/aspire-admin/blob/main/docs/DEV-ENVIRONMENT.md" target="_blank" rel="noreferrer">
                        开发环境设置指南
                    </a>
                </li>
                <li>
                    <a href="https://github.com/your-repo/aspire-admin/blob/main/docs/features/PERMISSION-SYSTEM-MIGRATION.md" target="_blank" rel="noreferrer">
                        权限系统迁移指南
                    </a>
                </li>
                <li>
                    <a href="https://github.com/your-repo/aspire-admin/blob/main/docs/features/SSE-REALTIME-COMMUNICATION.md" target="_blank" rel="noreferrer">
                        SSE 实时通信指南
                    </a>
                </li>
                <li>
                    <a href="https://github.com/your-repo/aspire-admin/blob/main/docs/features/PASSWORD-BOOK-GUIDE.md" target="_blank" rel="noreferrer">
                        密码本功能使用指南
                    </a>
                </li>
                <li>
                    <a href="https://github.com/your-repo/aspire-admin/blob/main/docs/features/TASK-PROJECT-MANAGEMENT.md" target="_blank" rel="noreferrer">
                        任务与项目管理指南
                    </a>
                </li>
            </ul>
            <Paragraph><strong>技术文档</strong></Paragraph>
            <ul>
                <li><a href="https://pro.ant.design" target="_blank" rel="noreferrer">Ant Design Pro 文档</a></li>
                <li><a href="https://ant.design" target="_blank" rel="noreferrer">Ant Design 组件库</a></li>
                <li><a href="https://learn.microsoft.com/zh-cn/dotnet/aspire" target="_blank" rel="noreferrer">.NET Aspire 文档</a></li>
                <li><a href="https://www.mongodb.com/docs" target="_blank" rel="noreferrer">MongoDB 文档</a></li>
            </ul>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.tech.contact.title' })}</Title>
            <Paragraph>
                <Space orientation="vertical">
                    <Text>📧 邮箱: fsy_008@163.com</Text>
                    <Text>💬 在线客服: 工作日 9:00-18:00</Text>
                    <Text>📞 电话: 400-XXX-XXXX</Text>
                </Space>
            </Paragraph>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.tech.version.title' })}</Title>
            <Paragraph>
                <Text type="secondary">
                    {(() => {
                        const versionContent = intl.formatMessage({ id: 'pages.help.tech.version.content' }, { title: Settings.title });
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

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.tech.development.title' })}</Title>
            <Paragraph>
                <Text type="secondary">
                    {intl.formatMessage({ id: 'pages.help.tech.development.content' })}
                </Text>
            </Paragraph>
        </div>
    );
};

export default TechStackContent;
