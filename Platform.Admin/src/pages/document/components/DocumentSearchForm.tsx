import React from 'react';
import { Form, Input, Select, Space, Button } from 'antd';
import { useIntl } from '@umijs/max';
import SearchFormCard from '@/components/SearchFormCard';
import { DocumentStatus } from '@/services/document/api';
import { type FormInstance } from 'antd/es/form';

interface DocumentSearchFormProps {
    form: FormInstance;
    onSearch: (values: any) => void;
    onReset: () => void;
}

const DocumentSearchForm: React.FC<DocumentSearchFormProps> = ({ form, onSearch, onReset }) => {
    const intl = useIntl();

    return (
        <SearchFormCard>
            <Form
                form={form}
                layout="inline"
                onFinish={onSearch}
            >
                <Form.Item name="keyword" label={intl.formatMessage({ id: 'pages.document.search.keyword', defaultMessage: '关键词' })}>
                    <Input placeholder={intl.formatMessage({ id: 'pages.document.search.keywordPlaceholder', defaultMessage: '搜索标题或内容' })} />
                </Form.Item>
                <Form.Item name="status" label={intl.formatMessage({ id: 'pages.document.search.status', defaultMessage: '状态' })}>
                    <Select
                        allowClear
                        placeholder={intl.formatMessage({ id: 'pages.document.search.statusPlaceholder', defaultMessage: '请选择状态' })}
                        style={{ width: 120 }}
                        options={[
                            { label: intl.formatMessage({ id: 'pages.document.status.draft', defaultMessage: '草稿' }), value: DocumentStatus.Draft },
                            { label: intl.formatMessage({ id: 'pages.document.status.pending', defaultMessage: '审批中' }), value: DocumentStatus.Pending },
                            { label: intl.formatMessage({ id: 'pages.document.status.approved', defaultMessage: '已通过' }), value: DocumentStatus.Approved },
                            { label: intl.formatMessage({ id: 'pages.document.status.rejected', defaultMessage: '已驳回' }), value: DocumentStatus.Rejected },
                        ]}
                    />
                </Form.Item>
                <Form.Item>
                    <Space>
                        <Button type="primary" htmlType="submit">
                            {intl.formatMessage({ id: 'pages.search', defaultMessage: '查询' })}
                        </Button>
                        <Button onClick={onReset}>
                            {intl.formatMessage({ id: 'pages.reset', defaultMessage: '重置' })}
                        </Button>
                    </Space>
                </Form.Item>
            </Form>
        </SearchFormCard>
    );
};

export default DocumentSearchForm;
