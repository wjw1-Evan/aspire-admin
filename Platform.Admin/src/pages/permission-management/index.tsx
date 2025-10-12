import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { PageContainer, ProCard } from '@ant-design/pro-components';
import { Button, Collapse, message, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import React, { useEffect, useState } from 'react';
import { getPermissionsGrouped, initializePermissions } from '@/services/permission';
import type { Permission, PermissionGroup } from '@/services/permission/types';

const { Panel } = Collapse;

const PermissionManagement: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);

  /**
   * 加载权限数据
   */
  const loadPermissions = async () => {
    setLoading(true);
    try {
      const response = await getPermissionsGrouped();
      if (response.success && response.data) {
        setPermissionGroups(response.data);
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
      message.error('加载权限失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 初始化默认权限
   */
  const handleInitialize = async () => {
    setLoading(true);
    try {
      const response = await initializePermissions();
      if (response.success) {
        message.success('权限初始化成功');
        await loadPermissions();
      }
    } catch (error) {
      console.error('Failed to initialize permissions:', error);
      message.error('权限初始化失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const columns: ColumnsType<Permission> = [
    {
      title: '权限代码',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '操作',
      dataIndex: 'actionTitle',
      key: 'actionTitle',
      render: (text: string, record: Permission) => {
        const colors: Record<string, string> = {
          create: 'green',
          read: 'blue',
          update: 'orange',
          delete: 'red',
        };
        return <Tag color={colors[record.action] || 'default'}>{text}</Tag>;
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
  ];

  return (
    <PageContainer
      header={{
        title: '权限管理',
        subTitle: '系统权限配置和管理',
      }}
    >
      <ProCard>
        <Space style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={loadPermissions}
            loading={loading}
          >
            刷新
          </Button>
          <Button icon={<PlusOutlined />} onClick={handleInitialize} loading={loading}>
            初始化默认权限
          </Button>
        </Space>

        <Collapse defaultActiveKey={permissionGroups.map((g) => g.resourceName)}>
          {permissionGroups.map((group) => (
            <Panel
              header={
                <Space>
                  <strong>{group.resourceTitle}</strong>
                  <Tag>{group.permissions.length} 个权限</Tag>
                </Space>
              }
              key={group.resourceName}
            >
              <Table
                columns={columns}
                dataSource={group.permissions}
                rowKey="id"
                pagination={false}
                size="small"
              />
            </Panel>
          ))}
        </Collapse>

        {permissionGroups.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <p>暂无权限数据</p>
            <Button type="primary" onClick={handleInitialize}>
              初始化默认权限
            </Button>
          </div>
        )}
      </ProCard>
    </PageContainer>
  );
};

export default PermissionManagement;

