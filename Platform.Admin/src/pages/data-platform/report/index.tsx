import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Button, Space } from 'antd';

const DataReportPage: React.FC = () => {
  return (
    <PageContainer
      header={{
        title: '数据报表',
        subTitle: '创建和管理数据报表',
      }}
    >
      <Card title="报表管理">
        <Space>
          <Button type="primary">新建报表</Button>
          <Button>报表模板</Button>
          <Button>导出报表</Button>
        </Space>
        <div
          style={{
            marginTop: 16,
            padding: 24,
            background: '#f5f5f5',
            borderRadius: 6,
          }}
        >
          <p>数据中台报表功能开发中，敬请期待...</p>
        </div>
      </Card>
    </PageContainer>
  );
};

export default DataReportPage;
