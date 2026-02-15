/**
 * FileDetailDrawer - 文件详情抽屉组件
 */

import React from 'react';
import { Drawer, Card, Descriptions, Space, Tag, Spin, Button } from 'antd';
import {
    FileOutlined,
    FolderOutlined,
    TagOutlined,
    CloudOutlined,
    CalendarOutlined,
    UserOutlined,
    EyeOutlined,
} from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import type { FileDetailDrawerProps } from '../types';

const FileDetailDrawer: React.FC<FileDetailDrawerProps> = ({
    open,
    onClose,
    file,
    versionList,
    versionLoading,
    previewUrl,
    previewLoading,
    isMobile,
    formatFileSize,
    formatDateTime,
    onPreview,
    onDownloadVersion,
    onRestoreVersion,
}) => {
    const intl = useIntl();

    return (
        <Drawer
            title={intl.formatMessage({ id: 'pages.cloud-storage.files.drawer.title' })}
            placement="right"
            onClose={onClose}
            open={open}
            size={isMobile ? 'large' : 600}
        >
            <Spin spinning={!file}>
                {file ? (
                    <>
                        <Card title={intl.formatMessage({ id: 'pages.cloud-storage.files.drawer.basicInfo' })} style={{ marginBottom: 16 }}>
                            <Descriptions column={isMobile ? 1 : 2} size="small">
                                <Descriptions.Item
                                    label={<Space><FileOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.files.field.name' })}</Space>}
                                    span={2}
                                >
                                    {file.name}
                                </Descriptions.Item>
                                <Descriptions.Item
                                    label={<Space><TagOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.files.field.type' })}</Space>}
                                >
                                    {file.isFolder ? intl.formatMessage({ id: 'pages.cloud-storage.files.field.type.folder' }) : (file.mimeType || intl.formatMessage({ id: 'pages.cloud-storage.files.field.type.file' }))}
                                </Descriptions.Item>
                                <Descriptions.Item
                                    label={<Space><CloudOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.files.field.size' })}</Space>}
                                >
                                    {file.isFolder ? '-' : formatFileSize(file.size)}
                                </Descriptions.Item>
                                <Descriptions.Item
                                    label={<Space><CalendarOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.files.field.createdAt' })}</Space>}
                                >
                                    {formatDateTime(file.createdAt)}
                                </Descriptions.Item>
                                <Descriptions.Item
                                    label={<Space><CalendarOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.files.field.updatedAt' })}</Space>}
                                >
                                    {formatDateTime(file.updatedAt)}
                                </Descriptions.Item>
                                <Descriptions.Item
                                    label={<Space><UserOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.files.field.creator' })}</Space>}
                                >
                                    {file.createdByName || file.createdByUsername || '-'}
                                </Descriptions.Item>
                                <Descriptions.Item
                                    label={<Space><UserOutlined />{intl.formatMessage({ id: 'pages.cloud-storage.files.field.modifier' })}</Space>}
                                >
                                    {file.updatedByName || file.updatedByUsername || '-'}
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>

                        {file.description && (
                            <Card title={intl.formatMessage({ id: 'pages.cloud-storage.files.field.description' })} style={{ marginBottom: 16 }}>
                                <p>{file.description}</p>
                            </Card>
                        )}

                        {file.tags && file.tags.length > 0 && (
                            <Card title={intl.formatMessage({ id: 'pages.cloud-storage.files.field.tags' })} style={{ marginBottom: 16 }}>
                                <Space wrap>
                                    {file.tags.map((tag, index) => (
                                        <Tag key={index}>{tag}</Tag>
                                    ))}
                                </Space>
                            </Card>
                        )}

                        {!file.isFolder && (
                            <Card title={intl.formatMessage({ id: 'pages.cloud-storage.files.field.versionHistory' })} style={{ marginBottom: 16 }}>
                                <Spin spinning={versionLoading}>
                                    {versionList.length === 0 ? (
                                        <div style={{ color: '#999' }}>{intl.formatMessage({ id: 'pages.cloud-storage.files.message.noVersions' })}</div>
                                    ) : (
                                        <Space direction="vertical" style={{ width: '100%' }} size={12}>
                                            {versionList.map((record) => (
                                                <div
                                                    key={record.id}
                                                    style={{
                                                        border: '1px solid #f0f0f0',
                                                        borderRadius: 8,
                                                        padding: 12,
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        gap: 12,
                                                        flexWrap: 'wrap',
                                                    }}
                                                >
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <div style={{ fontWeight: 600 }}>{intl.formatMessage({ id: 'pages.cloud-storage.files.field.version' })} {record.versionNumber}</div>
                                                        <div style={{ color: '#666', fontSize: 12 }}>
                                                            {formatFileSize(record.size)} · {formatDateTime(record.createdAt)} · {record.createdByName || '-'}
                                                        </div>
                                                        {record.comment && (
                                                            <div style={{ marginTop: 4, color: '#555' }}>{intl.formatMessage({ id: 'pages.cloud-storage.files.field.comment' })}：{record.comment}</div>
                                                        )}
                                                    </div>
                                                    <Space size="small" wrap>
                                                        <Button
                                                            size="small"
                                                            onClick={() => onDownloadVersion(record.id, `${file.name}_v${record.versionNumber}`)}
                                                        >
                                                            {intl.formatMessage({ id: 'pages.cloud-storage.files.action.download' })}
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            type="primary"
                                                            onClick={() => onRestoreVersion(record.id)}
                                                        >
                                                            {intl.formatMessage({ id: 'pages.cloud-storage.files.action.restore' })}
                                                        </Button>
                                                    </Space>
                                                </div>
                                            ))}
                                        </Space>
                                    )}
                                </Spin>
                            </Card>
                        )}

                        {!file.isFolder && (
                            <Card title={intl.formatMessage({ id: 'pages.cloud-storage.files.drawer.preview' })} style={{ marginBottom: 16 }}>
                                <Button
                                    type="primary"
                                    block
                                    icon={<EyeOutlined />}
                                    onClick={onPreview}
                                    disabled={!previewUrl && !previewLoading}
                                    loading={previewLoading}
                                >
                                    {intl.formatMessage({ id: 'pages.cloud-storage.files.action.previewNow' })}
                                </Button>
                            </Card>
                        )}
                    </>
                ) : (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                        {intl.formatMessage({ id: 'pages.cloud-storage.files.drawer.noData' })}
                    </div>
                )}
            </Spin>
        </Drawer>
    );
};

export default FileDetailDrawer;
