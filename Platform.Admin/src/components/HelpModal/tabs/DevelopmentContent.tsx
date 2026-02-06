/**
 * Development Tab Content
 */

import React from 'react';
import { Typography } from 'antd';
import { useIntl } from '@umijs/max';
import Settings from '../../../../config/defaultSettings';

const { Title, Paragraph } = Typography;

const DevelopmentContent: React.FC = () => {
    const intl = useIntl();

    return (
        <div style={{ padding: '16px 0' }}>
            <Title level={4}>🔧 {intl.formatMessage({ id: 'pages.help.development.title' })}</Title>
            <Paragraph>
                {intl.formatMessage({ id: 'pages.help.development.description' }, { title: Settings.title })}
            </Paragraph>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.development.architecture.title' })}</Title>
            <Paragraph>{intl.formatMessage({ id: 'pages.help.development.architecture.description' })}</Paragraph>
            <ul>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.architecture.backend' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.architecture.frontend' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.architecture.mobile' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.architecture.infrastructure' })}</strong></li>
            </ul>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.development.guide.title' })}</Title>
            <Paragraph>{intl.formatMessage({ id: 'pages.help.development.guide.description' })}</Paragraph>
            <ol>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.guide.step1' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.guide.step2' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.guide.step3' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.guide.step4' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.guide.step5' })}</strong></li>
            </ol>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.development.api.title' })}</Title>
            <Paragraph>{intl.formatMessage({ id: 'pages.help.development.api.description' })}</Paragraph>
            <ul>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.api.unified' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.api.permission' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.api.multitenant' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.api.audit' })}</strong></li>
            </ul>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.development.database.title' })}</Title>
            <Paragraph>{intl.formatMessage({ id: 'pages.help.development.database.description' })}</Paragraph>
            <ul>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.database.factory' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.database.builder' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.database.softdelete' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.database.audit' })}</strong></li>
            </ul>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.development.frontend.title' })}</Title>
            <Paragraph>{intl.formatMessage({ id: 'pages.help.development.frontend.description' })}</Paragraph>
            <ul>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.frontend.component' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.frontend.hook' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.frontend.service' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.frontend.i18n' })}</strong></li>
            </ul>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.development.bestPractices.title' })}</Title>
            <Paragraph>{intl.formatMessage({ id: 'pages.help.development.bestPractices.description' })}</Paragraph>
            <ul>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.bestPractices.rule1' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.bestPractices.rule2' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.bestPractices.rule3' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.bestPractices.rule4' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.development.bestPractices.rule5' })}</strong></li>
            </ul>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.development.resources.title' })}</Title>
            <Paragraph>{intl.formatMessage({ id: 'pages.help.development.resources.description' })}</Paragraph>
            <ul>
                <li>
                    <a href="https://github.com/your-repo/aspire-admin/blob/main/docs/features/BACKEND-RULES.md" target="_blank" rel="noreferrer">
                        {intl.formatMessage({ id: 'pages.help.development.resources.backendRules' })}
                    </a>
                </li>
                <li>
                    <a href="https://github.com/your-repo/aspire-admin/blob/main/docs/features/API-RESPONSE-RULES.md" target="_blank" rel="noreferrer">
                        {intl.formatMessage({ id: 'pages.help.development.resources.apiRules' })}
                    </a>
                </li>
                <li>
                    <a href="https://github.com/your-repo/aspire-admin/blob/main/docs/features/MENU-LEVEL-PERMISSION-GUIDE.md" target="_blank" rel="noreferrer">
                        {intl.formatMessage({ id: 'pages.help.development.resources.permissionGuide' })}
                    </a>
                </li>
                <li>
                    <a href="https://github.com/your-repo/aspire-admin/blob/main/docs/features/FRONTEND-RULES.md" target="_blank" rel="noreferrer">
                        {intl.formatMessage({ id: 'pages.help.development.resources.frontendRules' })}
                    </a>
                </li>
                <li>
                    <a href="https://github.com/your-repo/aspire-admin/blob/main/docs/features/DATABASE-OPERATION-FACTORY-GUIDE.md" target="_blank" rel="noreferrer">
                        {intl.formatMessage({ id: 'pages.help.development.resources.databaseGuide' })}
                    </a>
                </li>
            </ul>
        </div>
    );
};

export default DevelopmentContent;
