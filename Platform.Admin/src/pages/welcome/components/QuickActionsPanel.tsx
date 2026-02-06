import React from 'react';
import { Card, Row, Col, Space, Alert, theme } from 'antd';
import { RocketOutlined } from '@ant-design/icons';
import { useIntl, history } from '@umijs/max';

import useCommonStyles from '@/hooks/useCommonStyles';
import QuickAction from './QuickAction';
import { getIconComponent, getMenuColor, flattenMenus } from '../utils';

interface QuickActionsPanelProps {
    readonly currentUser?: API.CurrentUser;
}

const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({ currentUser }) => {
    const intl = useIntl();
    const { token } = theme.useToken();
    const { styles } = useCommonStyles();

    // 从用户菜单中提取快速操作项
    const getQuickActionMenus = (): API.MenuTreeNode[] => {
        if (!currentUser?.menus) {
            return [];
        }

        // 扁平化菜单树
        const flatMenus = flattenMenus(currentUser.menus);

        // 按 sortOrder 排序，限制最多显示 12 个
        return flatMenus
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .slice(0, 12);
    };

    const quickActionMenus = getQuickActionMenus();

    // 快速操作处理
    const handleQuickAction = (path: string) => {
        history.push(path);
    };

    return (
        <Card
            title={
                <Space>
                    <RocketOutlined style={{ color: token.colorPrimary }} />
                    <span style={{ fontWeight: 600 }}>{intl.formatMessage({ id: 'pages.welcome.quickActions' })}</span>
                </Space>
            }
            className={styles.card}
            style={{ borderRadius: '16px' }}
        >
            {quickActionMenus.length > 0 ? (
                <Row gutter={[16, 16]}>
                    {quickActionMenus.map((menu) => {
                        // 生成 locale 键用于多语言
                        let localeKey = '';
                        if (menu.path.startsWith('/system/')) {
                            localeKey = `menu.system.${menu.name}`;
                        } else if (menu.path.startsWith('/iot-platform/')) {
                            const shortName = menu.name.replace(/^iot-platform-/, '');
                            localeKey = `menu.iot-platform.${shortName}`;
                        } else if (menu.path.startsWith('/project-management/')) {
                            const shortName = menu.name.replace(/^project-management-/, '');
                            localeKey = `menu.project-management.${shortName}`;
                        } else if (menu.path.startsWith('/xiaoke-management/') || menu.name.startsWith('xiaoke-management-')) {
                            const shortName = menu.name.replace(/^xiaoke-management-/, '');
                            localeKey = `menu.xiaoke-management.${shortName}`;
                        } else if (menu.path.startsWith('/workflow/') || menu.name.startsWith('workflow-') || menu.name.startsWith('workflow:')) {
                            const shortName = menu.name.replace(/^workflow[-:]/, '');
                            localeKey = `menu.workflow.${shortName}`;
                        } else if (menu.path.startsWith('/document/') || menu.name.startsWith('document-') || menu.name.startsWith('document:')) {
                            const shortName = menu.name.replace(/^document[-:]/, '');
                            localeKey = `menu.document.${shortName}`;
                        } else if (menu.path.startsWith('/account/')) {
                            localeKey = `menu.${menu.path.replace(/^\//, '').replaceAll('/', '.')}`;
                        } else {
                            localeKey = `menu.${menu.name}`;
                        }

                        // 尝试获取多语言标题，如果不存在则使用菜单的 title
                        const menuTitle = intl.formatMessage({ id: localeKey }, { defaultMessage: menu.title || menu.name });
                        const menuDescription = intl.formatMessage(
                            { id: `${localeKey}.desc` },
                            { defaultMessage: menuTitle }
                        );

                        return (
                            <Col
                                key={menu.path || menu.id}
                                xs={24}
                                sm={12}
                                md={8}
                                lg={6}
                                xl={4}
                            >
                                <QuickAction
                                    title={menuTitle}
                                    description={menuDescription}
                                    icon={getIconComponent(menu.icon)}
                                    onClick={() => handleQuickAction(menu.path)}
                                    color={getMenuColor(menu.path)}
                                    token={token}
                                />
                            </Col>
                        );
                    })}
                </Row>
            ) : (
                <Alert
                    title={intl.formatMessage({ id: 'pages.welcome.quickActions.empty' }, { defaultMessage: '暂无快速操作' })}
                    type="info"
                    showIcon
                />
            )}
        </Card>
    );
};

export default QuickActionsPanel;
