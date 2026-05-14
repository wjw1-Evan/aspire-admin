import {
  SendOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { ModalForm, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components/es/form';
import { PageContainer } from '@ant-design/pro-components/es/layout';
import { useIntl } from '@umijs/max';
import { Button, Form, Input, message, Modal, Radio, Space, Tag, Typography } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import SendDetailDrawer from './components/SendDetailDrawer';
import SendHistoryTable from './components/SendHistoryTable';
import UserSelectorModal from './components/UserSelectorModal';
import type { NotificationManageStatistics } from '@/services/notification-manage/api';
import { NotificationCategory, NotificationLevel, notificationManageApi } from '@/services/notification-manage/api';

const { Text } = Typography;

interface SendFormValues {
  title: string;
  content: string;
  category: NotificationCategory;
  level: NotificationLevel;
  actionUrl?: string;
}

const categoryOptions = [
  { label: '系统', value: NotificationCategory.System },
  { label: '工作', value: NotificationCategory.Work },
  { label: '社交', value: NotificationCategory.Social },
  { label: '安全', value: NotificationCategory.Security },
];

const levelOptions = [
  { label: '信息', value: NotificationLevel.Info, color: 'blue' },
  { label: '成功', value: NotificationLevel.Success, color: 'green' },
  { label: '警告', value: NotificationLevel.Warning, color: 'orange' },
  { label: '错误', value: NotificationLevel.Error, color: 'red' },
];

const NotificationManagement: React.FC = () => {
  const intl = useIntl();
  const [sendModalVisible, setSendModalVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailRecordId, setDetailRecordId] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<NotificationManageStatistics | null>(null);
  const [search, setSearch] = useState('');

  const [targetType, setTargetType] = useState<'specific' | 'all'>('specific');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUserNames, setSelectedUserNames] = useState<string[]>([]);
  const [selectorVisible, setSelectorVisible] = useState(false);

  const loadStatistics = useCallback(() => {
    notificationManageApi.statistics().then((r) => {
      if (r.success && r.data) setStatistics(r.data);
    });
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  const openSendModal = () => {
    setSelectedUserIds([]);
    setSelectedUserNames([]);
    setTargetType('specific');
    setSendModalVisible(true);
  };

  const handleSend = async (values: SendFormValues): Promise<boolean> => {
    if (targetType === 'specific' && selectedUserIds.length === 0) {
      message.warning(intl.formatMessage({ id: 'pages.notificationManagement.pleaseSelectUsers' }));
      return false;
    }

    if (targetType === 'all') {
      const confirmed = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: intl.formatMessage({ id: 'pages.notificationManagement.sendBroadcastConfirm' }),
          content: `"${values.title}"`,
          okText: intl.formatMessage({ id: 'pages.button.confirm' }),
          cancelText: intl.formatMessage({ id: 'pages.button.cancel' }),
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!confirmed) return false;
    }

    try {
      const res = await (targetType === 'all'
        ? notificationManageApi.broadcast({
          title: values.title,
          content: values.content,
          category: values.category,
          level: values.level,
          actionUrl: values.actionUrl || undefined,
        })
        : notificationManageApi.send({
          recipientIds: selectedUserIds,
          title: values.title,
          content: values.content,
          category: values.category,
          level: values.level,
          actionUrl: values.actionUrl || undefined,
        }));
      if (res.success) {
        message.success(intl.formatMessage({ id: 'pages.notificationManagement.sendSuccess' }));
        setRefreshKey((prev) => prev + 1);
        return true;
      }
      message.error(res.message || intl.formatMessage({ id: 'pages.notificationManagement.sendFailed' }));
      return false;
    } catch {
      message.error(intl.formatMessage({ id: 'pages.notificationManagement.sendFailed' }));
      return false;
    }
  };

  const handleUserSelect = (ids: string[], names?: string[]) => {
    setSelectedUserIds(ids);
    if (names) setSelectedUserNames(names);
    setSelectorVisible(false);
  };

  return (
    <PageContainer>
      <SendHistoryTable
        onViewDetail={(id) => setDetailRecordId(id)}
        refreshKey={refreshKey}
        search={search}
        headerStats={
          <Space size={12}>
            <Tag color="blue">
              {intl.formatMessage({ id: 'pages.notificationManagement.statistics.totalSent' })}{' '}
              {statistics?.totalSent || 0}
            </Tag>
            <Tag color="green">
              {intl.formatMessage({ id: 'pages.notificationManagement.statistics.totalSuccess' })}{' '}
              {statistics?.totalSuccess || 0}
            </Tag>
            <Tag color="red">
              {intl.formatMessage({ id: 'pages.notificationManagement.statistics.totalFailed' })}{' '}
              {statistics?.totalFailed || 0}
            </Tag>
            <Tag color="purple">
              {intl.formatMessage({ id: 'pages.notificationManagement.statistics.totalRecipients' })}{' '}
              {statistics?.totalRecipients || 0}
            </Tag>
          </Space>
        }
        toolbar={
          <Space>
            <Input.Search
              placeholder={intl.formatMessage({ id: 'pages.common.search' })}
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onSearch={(value) => {
                setSearch(value);
              }}
              style={{ width: 260 }}
            />
            <Button type="primary" icon={<SendOutlined />} onClick={openSendModal}>
              {intl.formatMessage({ id: 'pages.notificationManagement.send' })}
            </Button>
          </Space>
        }
      />

      <ModalForm
        title={intl.formatMessage({ id: 'pages.notificationManagement.send' })}
        open={sendModalVisible}
        onOpenChange={(visible) => {
          if (!visible) {
            setSendModalVisible(false);
            setSelectedUserIds([]);
            setSelectedUserNames([]);
          }
        }}
        onFinish={handleSend}
        autoFocusFirstInput
        width={640}
        initialValues={{
          category: NotificationCategory.System,
          level: NotificationLevel.Info,
        }}
      >
        <Form.Item label={intl.formatMessage({ id: 'pages.notificationManagement.targetType' })}>
          <Radio.Group value={targetType} onChange={(e) => setTargetType(e.target.value)}>
            <Radio.Button value="specific">
              <UserOutlined /> {intl.formatMessage({ id: 'pages.notificationManagement.targetType.specific' })}
            </Radio.Button>
            <Radio.Button value="all">
              <TeamOutlined /> {intl.formatMessage({ id: 'pages.notificationManagement.targetType.all' })}
            </Radio.Button>
          </Radio.Group>
        </Form.Item>

        {targetType === 'specific' && (
          <Form.Item
            label={intl.formatMessage({ id: 'pages.notificationManagement.recipients' })}
            required
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button icon={<UserOutlined />} onClick={() => setSelectorVisible(true)}>
                {intl.formatMessage({ id: 'pages.notificationManagement.selectUsers' })}
                {selectedUserIds.length > 0 && (
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    ({intl.formatMessage({ id: 'pages.notificationManagement.selectedUsers' }, { count: selectedUserIds.length })})
                  </Text>
                )}
              </Button>
              {selectedUserNames.length > 0 && (
                <Space wrap>
                  {selectedUserNames.map((name) => (
                    <Tag
                      key={name}
                      closable
                      onClose={() => {
                        const idx = selectedUserNames.indexOf(name);
                        setSelectedUserIds(selectedUserIds.filter((_, i) => i !== idx));
                        setSelectedUserNames(selectedUserNames.filter((_, i) => i !== idx));
                      }}
                    >
                      {name}
                    </Tag>
                  ))}
                </Space>
              )}
            </Space>
          </Form.Item>
        )}

        {targetType === 'all' && (
          <div style={{ marginBottom: 16 }}>
            <Tag icon={<TeamOutlined />} color="blue">
              {intl.formatMessage({ id: 'pages.notificationManagement.allUsersHint' })}
            </Tag>
          </div>
        )}

        <ProFormText
          name="title"
          label={intl.formatMessage({ id: 'pages.notificationManagement.title' })}
          placeholder={intl.formatMessage({ id: 'pages.notificationManagement.titlePlaceholder' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.notificationManagement.titleRequired' }) }]}
        />

        <Space style={{ width: '100%' }} size={16}>
          <ProFormSelect
            name="category"
            label={intl.formatMessage({ id: 'pages.notificationManagement.category' })}
            style={{ width: 200 }}
            options={categoryOptions}
          />
          <ProFormSelect
            name="level"
            label={intl.formatMessage({ id: 'pages.notificationManagement.level' })}
            style={{ width: 200 }}
            options={levelOptions.map((o) => ({ ...o, label: <Tag color={o.color}>{o.label}</Tag> }))}
          />
        </Space>

        <ProFormText
          name="actionUrl"
          label={intl.formatMessage({ id: 'pages.notificationManagement.actionUrl' })}
          placeholder={intl.formatMessage({ id: 'pages.notificationManagement.actionUrlPlaceholder' })}
        />

        <ProFormTextArea
          name="content"
          label={intl.formatMessage({ id: 'pages.notificationManagement.content' })}
          placeholder={intl.formatMessage({ id: 'pages.notificationManagement.contentPlaceholder' })}
          rules={[{ required: true, message: intl.formatMessage({ id: 'pages.notificationManagement.contentRequired' }) }]}
          fieldProps={{ rows: 6 }}
        />
      </ModalForm>

      <UserSelectorModal
        open={selectorVisible}
        selectedIds={selectedUserIds}
        onClose={() => setSelectorVisible(false)}
        onConfirm={(ids) => {
          handleUserSelect(ids, ids);
        }}
      />

      <SendDetailDrawer
        recordId={detailRecordId}
        onClose={() => setDetailRecordId(null)}
      />
    </PageContainer>
  );
};

export default NotificationManagement;
