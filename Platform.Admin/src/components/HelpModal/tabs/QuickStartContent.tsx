/**
 * Quick Start Tab Content
 */

import React from 'react';
import { Typography } from 'antd';
import { useIntl } from '@umijs/max';
import Settings from '../../../../config/defaultSettings';

const { Title, Paragraph, Text } = Typography;

const QuickStartContent: React.FC = () => {
    const intl = useIntl();

    return (
        <div style={{ padding: '16px 0' }}>
            <Title level={4}>{intl.formatMessage({ id: 'pages.help.quickStart.welcome' }, { title: Settings.title })}</Title>
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
                <li><strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.userManagement' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.roleManagement' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.companyCollaboration' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.taskManagement' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.iotPlatform' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.ruleManagement' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.workflowManagement' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.realTimeChat' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.aiAssistant' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.activityLog' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.systemMonitor' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.passwordBook' })}</strong></li>
                <li><strong>云存储管理</strong> - 文件上传/下载、文件夹管理、文件搜索、回收站管理</li>
                <li><strong>存储配额管理</strong> - 配额设置与监控、配额警告、企业存储统计、使用量排行榜</li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.apiDocs' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.quickStart.feature.multilang' })}</strong></li>
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
            <Paragraph><strong>{intl.formatMessage({ id: 'pages.help.quickStart.highlights.multiTenant' })}</strong></Paragraph>
            <Paragraph><strong>{intl.formatMessage({ id: 'pages.help.quickStart.highlights.menuPermission' })}</strong></Paragraph>
            <Paragraph><strong>{intl.formatMessage({ id: 'pages.help.quickStart.highlights.realTime' })}</strong></Paragraph>
            <Paragraph><strong>{intl.formatMessage({ id: 'pages.help.quickStart.highlights.aiIntegration' })}</strong></Paragraph>
            <Paragraph><strong>{intl.formatMessage({ id: 'pages.help.quickStart.highlights.iot' })}</strong></Paragraph>
            <Paragraph><strong>{intl.formatMessage({ id: 'pages.help.quickStart.highlights.ruleEngine' })}</strong></Paragraph>

            <Title level={5}>{intl.formatMessage({ id: 'pages.help.quickStart.gettingStarted.title' })}</Title>
            <Paragraph>
                {intl.formatMessage({ id: 'pages.help.quickStart.gettingStarted.description' })}
            </Paragraph>
            <ol>
                <li><strong>{intl.formatMessage({ id: 'pages.help.quickStart.gettingStarted.step1' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.quickStart.gettingStarted.step2' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.quickStart.gettingStarted.step3' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.quickStart.gettingStarted.step4' })}</strong></li>
                <li><strong>{intl.formatMessage({ id: 'pages.help.quickStart.gettingStarted.step5' })}</strong></li>
            </ol>
            <Paragraph>
                <Text type="secondary">
                    💡 {intl.formatMessage({ id: 'pages.help.quickStart.gettingStarted.tip' })}
                </Text>
            </Paragraph>
        </div>
    );
};

export default QuickStartContent;
