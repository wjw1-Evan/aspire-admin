import { ProTable } from '@ant-design/pro-components/es/table';
import { useIntl } from '@umijs/max';
import { Modal, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import { getUserList } from '@/services/user/api';
import type { ActionType, ProColumns } from '@ant-design/pro-components/es/table';

interface UserItem {
  id: string;
  username: string;
  name?: string;
  email?: string;
  isActive: boolean;
}

interface Props {
  open: boolean;
  selectedIds: string[];
  onClose: () => void;
  onConfirm: (ids: string[]) => void;
}

const UserSelectorModal: React.FC<Props> = ({ open, selectedIds, onClose, onConfirm }) => {
  const intl = useIntl();
  const actionRef = useRef<ActionType>(undefined);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>(selectedIds);

  React.useEffect(() => {
    if (open) setSelectedRowKeys(selectedIds);
  }, [open, selectedIds]);

  const columns: ProColumns<UserItem>[] = [
    {
      title: intl.formatMessage({ id: 'pages.userManagement.username' }),
      dataIndex: 'username',
      width: 150,
    },
    {
      title: intl.formatMessage({ id: 'pages.userManagement.name' }),
      dataIndex: 'name',
      width: 120,
    },
    {
      title: intl.formatMessage({ id: 'pages.userManagement.email' }),
      dataIndex: 'email',
      width: 200,
    },
    {
      title: intl.formatMessage({ id: 'pages.userManagement.status' }),
      dataIndex: 'isActive',
      width: 80,
      render: (_, record) =>
        record.isActive ? (
          <Tag color="success">{intl.formatMessage({ id: 'pages.userManagement.status.active' })}</Tag>
        ) : (
          <Tag color="error">{intl.formatMessage({ id: 'pages.userManagement.status.inactive' })}</Tag>
        ),
    },
  ];

  return (
    <Modal
      title={intl.formatMessage({ id: 'pages.notificationManagement.selectUsers' })}
      open={open}
      onOk={() => onConfirm(selectedRowKeys as string[])}
      onCancel={onClose}
      width={720}
      okText={intl.formatMessage({ id: 'pages.button.confirm' })}
      cancelText={intl.formatMessage({ id: 'pages.button.cancel' })}
    >
      <ProTable<UserItem>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        request={async (params) => {
          const res = await getUserList({ ...params, pageSize: params.pageSize ?? 10 });
          return {
            data: res.data?.queryable || [],
            total: res.data?.rowCount || 0,
            success: res.success,
          };
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        search={false}
        pagination={{ pageSize: 10 }}
        scroll={{ y: 400 }}
        toolBarRender={false}
      />
    </Modal>
  );
};

export default UserSelectorModal;
