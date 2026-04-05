import React, { useState, useRef, useEffect } from 'react';
import { Card, Row, Col, Space, Alert, theme, Button } from 'antd';
import { RocketOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { useIntl, history } from '@umijs/max';

import useCommonStyles from '@/hooks/useCommonStyles';
import QuickAction from './QuickAction';
import { getIconComponent, getMenuColor, flattenMenus } from '../utils';

interface QuickActionsPanelProps {
    readonly currentUser?: any;
    readonly allMenus?: any[];
}

const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({ currentUser, allMenus }) => {
    const intl = useIntl();
    const { token } = theme.useToken();
    const { styles } = useCommonStyles();
    const [collapsed, setCollapsed] = useState(true);
    const contentRef = useRef<HTMLDivElement>(null);
    const [hasMore, setHasMore] = useState(false);

    const getQuickActionMenus = (): any[] => {
        const menusSource = allMenus || currentUser?.menus;
        if (!menusSource) {
            return [];
        }

        const flatMenus = flattenMenus(menusSource);
        const filteredMenus = flatMenus.filter((menu: any) => menu.path !== '/welcome');

        return filteredMenus.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    };

    const quickActionMenus = getQuickActionMenus();

    const hasOverflow = quickActionMenus.length > 8;

    useEffect(() => {
        const checkOverflow = () => {
            if (contentRef.current && collapsed && hasOverflow) {
                const el = contentRef.current;
                const row = el.querySelector('.ant-row');
                if (row) {
                    const rowEl = row as HTMLElement;
                    setHasMore(rowEl.offsetHeight > el.clientHeight + 10);
                }
            } else if (!collapsed) {
                setHasMore(false);
            }
        };
        setTimeout(checkOverflow, 100);
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [collapsed, hasOverflow]);

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
            extra={
                hasOverflow ? (
                    <Button
                        type="link"
                        icon={collapsed ? <DownOutlined /> : <UpOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        {collapsed ? '展开' : '折叠'}
                    </Button>
                ) : null
            }
            className={styles.card}
            style={{ borderRadius: '16px' }}
        >
            {quickActionMenus.length > 0 ? (
                <div ref={contentRef} style={{ 
                    maxHeight: collapsed ? '220px' : 'none', 
                    overflowY: collapsed ? 'auto' : 'visible',
                    transition: 'max-height 0.3s ease' 
                }}>
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
                                    icon={getIconComponent(menu.icon || (menu as any).Icon || menu.rawIcon)}
                                    onClick={() => handleQuickAction(menu.path)}
                                    color={getMenuColor(menu.path)}
                                    token={token}
                                />
                            </Col>
                        );
                    })}
                </Row>
                </div>
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
