import React, { useRef, useState } from 'react';
import {
  PlusOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Tag, Tooltip } from 'antd';
import { history } from '@umijs/max';
import {
  getPipelineList,
  executePipeline,
  pausePipeline,
  resumePipeline,
} from './service';

const DataPipelineList: React.FC = () => {
  const [createModalOpen, handleCreateModalOpen] = useState<boolean>(false);
  const [updateModalOpen, handleUpdateModalOpen] = useState<boolean>(false);
  const [currentRow, setCurrentRow] = useState<API.DataPipeline>();
  const actionRef = useRef<ActionType>();

  const handleExecute = async (record: API.DataPipeline) => {
    try {
      await executePipeline({ id: record.id! });
      message.success('管道执行成功');
      actionRef.current?.reload();
    } catch (error) {
      message.error('管道执行失败');
    }
  };

  const handlePause = async (record: API.DataPipeline) => {
    try {
      await pausePipeline({ id: record.id! });
      message.success('管道已暂停');
      actionRef.current?.reload();
    } catch (error) {
      message.error('暂停失败');
    }
  };

  const handleResume = async (record: API.DataPipeline) => {
    try {
      await resumePipeline({ id: record.id! });
      message.success('管道已恢复');
      actionRef.current?.reload();
    } catch (error) {
      message.error('恢复失败');
    }
  };

  const columns: ProColumns<API.DataPipeline>[] = [
    {
      title: '名称',
      dataIndex: 'name',
      tip: '数据管道名称',
    },
    {
      title: '标题',
      dataIndex: 'title',
      valueType: 'text',
    },
    {
      title: '调度策略',
      dataIndex: 'scheduleStrategy',
      valueType: 'select',
      valueEnum: {
        1: { text: '手动触发', status: 'Default' },
        2: { text: '定时调度', status: 'Processing' },
        3: { text: '事件触发', status: 'Success' },
        4: { text: '实时流处理', status: 'Error' },
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        1: { text: '草稿', status: 'Default' },
        2: { text: '活跃', status: 'Processing' },
        3: { text: '暂停', status: 'Warning' },
        4: { text: '错误', status: 'Error' },
        5: { text: '运行中', status: 'Success' },
      },
    },
    {
      title: '执行次数',
      dataIndex: 'executionCount',
      search: false,
    },
    {
      title: '最后执行时间',
      dataIndex: 'lastExecutedAt',
      valueType: 'dateTime',
      search: false,
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      render: (_, record) => [
        <Button
          key="execute"
          type="link"
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={() => handleExecute(record)}
        >
          执行
        </Button>,
        <Button
          key="pause"
          type="link"
          size="small"
          icon={<PauseCircleOutlined />}
          onClick={() => handlePause(record)}
        >
          暂停
        </Button>,
        <Button
          key="resume"
          type="link"
          size="small"
          onClick={() => handleResume(record)}
        >
          恢复
        </Button>,
        <Button
          key="edit"
          type="link"
          size="small"
          onClick={() => {
            setCurrentRow(record);
            handleUpdateModalOpen(true);
          }}
        >
          编辑
        </Button>,
      ],
    },
  ];

  return (
    <PageContainer
      header={{
        title: '数据管道',
        subTitle: '管理和监控数据管道执行',
      }}
    >
      <ProTable<API.DataPipeline, API.PageParams>
        headerTitle="数据管道列表"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => [
          <Button
            type="primary"
            key="primary"
            onClick={() => {
              handleCreateModalOpen(true);
            }}
          >
            <PlusOutlined /> 新建管道
          </Button>,
        ]}
        request={async (params, sort, filter) => {
          const response = await getPipelineList({
            ...params,
            keyword: params.name,
            status: params.status,
          });
          return {
            data: response.data.list,
            success: response.success,
            total: response.data.total,
          };
        }}
        columns={columns}
      />
    </PageContainer>
  );
};

export default DataPipelineList;
