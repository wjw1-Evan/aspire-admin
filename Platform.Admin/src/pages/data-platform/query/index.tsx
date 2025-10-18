import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Button, Space } from 'antd';

const DataQueryPage: React.FC = () => {
  return (
    <PageContainer
      header={{
        title: '数据查询',
        subTitle: '查询和分析数据',
      }}
    >
      <Card title="数据查询工具">
        <Space>
          <Button type="primary">新建查询</Button>
          <Button>保存查询</Button>
          <Button>导出结果</Button>
        </Space>
        <div
          style={{
            marginTop: 16,
            padding: 24,
            background: '#f5f5f5',
            borderRadius: 6,
          }}
        >
          <p>数据中台查询功能开发中，敬请期待...</p>
        </div>
      </Card>
    </PageContainer>
  );
};

export default DataQueryPage;
