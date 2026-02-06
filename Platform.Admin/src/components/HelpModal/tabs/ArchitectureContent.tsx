/**
 * Architecture Tab Content
 */

import React from 'react';
import { Typography } from 'antd';
import { useIntl } from '@umijs/max';

const { Title, Paragraph, Text } = Typography;

const ArchitectureContent: React.FC = () => {
    const intl = useIntl();

    return (
        <div style={{ padding: '16px 0' }}>
            <Title level={4}>🏗️ {intl.formatMessage({ id: 'pages.help.architecture.title' })}</Title>
            <Paragraph>
                {intl.formatMessage({ id: 'pages.help.architecture.description' })}
            </Paragraph>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.architecture.overview.title' })}</Title>
            <Paragraph>
                {intl.formatMessage({ id: 'pages.help.architecture.overview.description' })}
            </Paragraph>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.architecture.frontend.title' })}</Title>
            <ul>
                <li><strong>{intl.formatMessage({ id: 'pages.help.architecture.frontend.item1' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.architecture.frontend.item2' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.architecture.frontend.item3' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.architecture.frontend.item4' })}</strong></li>
            </ul>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.architecture.backend.title' })}</Title>
            <ul>
                <li><strong>{intl.formatMessage({ id: 'pages.help.architecture.backend.item1' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.architecture.backend.item2' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.architecture.backend.item3' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.architecture.backend.item4' })}</strong></li>
            </ul>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.architecture.database.title' })}</Title>
            <ul>
                <li><strong>{intl.formatMessage({ id: 'pages.help.architecture.database.item1' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.architecture.database.item2' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.architecture.database.item3' })}</strong></li>
            </ul>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.architecture.infrastructure.title' })}</Title>
            <ul>
                <li><strong>{intl.formatMessage({ id: 'pages.help.architecture.infrastructure.item1' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.architecture.infrastructure.item2' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.architecture.infrastructure.item3' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.architecture.infrastructure.item4' })}</strong></li>
            </ul>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.architecture.dataFlow.title' })}</Title>
            <Paragraph>
                <Text code>用户 → 前端 → API Gateway → 后端服务 → MongoDB</Text>
            </Paragraph>
            <Paragraph>
                {intl.formatMessage({ id: 'pages.help.architecture.dataFlow.description' })}
            </Paragraph>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.architecture.security.title' })}</Title>
            <ul>
                <li><strong>{intl.formatMessage({ id: 'pages.help.architecture.security.item1' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.architecture.security.item2' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.architecture.security.item3' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.architecture.security.item4' })}</strong></li>
            </ul>
        </div>
    );
};

export default ArchitectureContent;
