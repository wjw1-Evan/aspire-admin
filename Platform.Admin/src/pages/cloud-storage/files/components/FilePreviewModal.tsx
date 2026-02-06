/**
 * FilePreviewModal - 文件预览弹窗组件
 */

import React from 'react';
import { Modal, Button, Spin } from 'antd';
import { DownloadOutlined, FileOutlined, FileTextOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import type { FilePreviewModalProps } from '../types';
import { isOfficeFile, isVideoFile, isAudioFile } from '../utils';

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
    open,
    onClose,
    file,
    previewUrl,
    previewLoading,
    officeContent,
    markdownContent,
    onDownload,
    formatFileSize,
}) => {
    const intl = useIntl();

    const handleClose = () => {
        onClose();
    };

    const renderContent = () => {
        if (!previewUrl) {
            return (
                <div style={{ textAlign: 'center' }}>
                    <Spin size="large" tip={intl.formatMessage({ id: 'pages.cloud-storage.files.preview.loading' })} />
                </div>
            );
        }

        const mimeType = file?.mimeType?.toLowerCase() || '';

        // 视频预览
        if (isVideoFile(mimeType)) {
            return <video src={previewUrl} controls style={{ maxWidth: '100%', maxHeight: '100%' }} autoPlay />;
        }

        // 音频预览
        if (isAudioFile(mimeType)) {
            return <audio src={previewUrl} controls autoPlay />;
        }

        // PDF 预览
        if (mimeType === 'application/pdf') {
            return <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="pdf-preview" />;
        }

        // Office 文件预览
        const isOffice = isOfficeFile(mimeType, file?.name);

        if (isOffice && officeContent) {
            // Excel 预览
            if (officeContent.type === 'excel') {
                return (
                    <div style={{ width: '100%', height: '100%', overflow: 'auto', backgroundColor: '#fff', padding: 20 }}>
                        <style>{`
                            #excel-table table {
                                border-collapse: collapse;
                                width: 100%;
                            }
                            #excel-table td, #excel-table th {
                                border: 1px solid #d9d9d9;
                                padding: 8px;
                                text-align: left;
                            }
                            #excel-table th {
                                background-color: #fafafa;
                                font-weight: 600;
                            }
                        `}</style>
                        <div id="excel-table" dangerouslySetInnerHTML={{ __html: officeContent.content }} />
                    </div>
                );
            }
            // Word 预览
            if (officeContent.type === 'word') {
                return (
                    <div style={{ width: '100%', height: '100%', overflow: 'auto', backgroundColor: '#f5f5f5', padding: '40px 20px' }}>
                        <div
                            style={{
                                maxWidth: 800,
                                margin: '0 auto',
                                backgroundColor: '#fff',
                                padding: '40px 60px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                minHeight: '100%',
                                lineHeight: 1.6
                            }}
                            dangerouslySetInnerHTML={{ __html: officeContent.content }}
                        />
                    </div>
                );
            }
        }

        // Markdown 预览
        if (markdownContent !== null) {
            return (
                <div style={{ width: '100%', height: '100%', overflow: 'auto', backgroundColor: '#fff', padding: '20px' }}>
                    <style>{`
                        .markdown-preview {
                            line-height: 1.6;
                            color: #333;
                        }
                        .markdown-preview h1, .markdown-preview h2, .markdown-preview h3 {
                            border-bottom: 1px solid #eee;
                            padding-bottom: 0.3em;
                            margin-top: 1.5em;
                        }
                        .markdown-preview code {
                            background-color: #f6f8fa;
                            padding: 0.2em 0.4em;
                            border-radius: 3px;
                            font-family: monospace;
                        }
                        .markdown-preview pre {
                            background-color: #f6f8fa;
                            padding: 16px;
                            border-radius: 6px;
                            overflow: auto;
                        }
                        .markdown-preview blockquote {
                            border-left: 4px solid #dfe2e5;
                            color: #6a737d;
                            padding-left: 1em;
                            margin-left: 0;
                        }
                        .markdown-preview img {
                            max-width: 100%;
                        }
                    `}</style>
                    <div
                        className="markdown-preview"
                        style={{
                            maxWidth: 900,
                            margin: '0 auto',
                            padding: '20px 40px',
                        }}
                        dangerouslySetInnerHTML={{ __html: markdownContent || '' }}
                    />
                </div>
            );
        }

        // Office 文件未解析成功时的提示
        if (isOffice) {
            let fileTypeName = intl.formatMessage({ id: 'pages.cloud-storage.files.preview.type.office' });

            if (mimeType.includes('word') || file?.name?.match(/\.docx?$/i)) {
                fileTypeName = intl.formatMessage({ id: 'pages.cloud-storage.files.preview.type.word' });
            } else if (mimeType.includes('excel') || file?.name?.match(/\.xlsx?$/i)) {
                fileTypeName = intl.formatMessage({ id: 'pages.cloud-storage.files.preview.type.excel' });
            } else if (mimeType.includes('powerpoint') || file?.name?.match(/\.pptx?$/i)) {
                fileTypeName = intl.formatMessage({ id: 'pages.cloud-storage.files.preview.type.ppt' });
            }

            return (
                <div style={{ textAlign: 'center', padding: '60px 40px' }}>
                    <div style={{ fontSize: 72, color: '#1890ff', marginBottom: 24 }}>
                        <FileTextOutlined />
                    </div>
                    <h2 style={{ marginBottom: 16 }}>{fileTypeName}</h2>
                    <p style={{ color: '#666', fontSize: 16, marginBottom: 8 }}>
                        {file?.name}
                    </p>
                    <p style={{ color: '#999', marginBottom: 32 }}>
                        {intl.formatMessage({ id: 'pages.cloud-storage.files.preview.fileSize' })}：{formatFileSize(file?.size || 0)}
                    </p>
                    <div style={{
                        backgroundColor: '#f0f5ff',
                        padding: '16px 24px',
                        borderRadius: 8,
                        marginBottom: 32,
                        maxWidth: 500,
                        margin: '0 auto 32px'
                    }}>
                        <p style={{ margin: 0, color: '#666' }}>
                            💡 <strong>{intl.formatMessage({ id: 'pages.cloud-storage.files.preview.hint.title' })}</strong>
                            <br />
                            <span style={{ fontSize: 14 }}>
                                {intl.formatMessage({ id: 'pages.cloud-storage.files.preview.hint.desc' })}
                            </span>
                        </p>
                    </div>
                    <Button
                        type="primary"
                        icon={<DownloadOutlined />}
                        onClick={() => file && onDownload(file)}
                        size="large"
                    >
                        {intl.formatMessage({ id: 'pages.cloud-storage.files.preview.downloadNow' })}
                    </Button>
                </div>
            );
        }

        // 文本文件预览
        if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('javascript')) {
            return (
                <div style={{ width: '100%', height: '100%', backgroundColor: '#fff', padding: 20, overflow: 'auto' }}>
                    <iframe src={previewUrl} style={{ width: '100%', height: '100%', border: 'none' }} title="text-preview" />
                </div>
            );
        }

        // 不支持预览的文件
        return (
            <div style={{ textAlign: 'center' }}>
                <FileOutlined style={{ fontSize: 64, color: '#999', marginBottom: 16 }} />
                <h3>{intl.formatMessage({ id: 'pages.cloud-storage.files.preview.unsupported' })}</h3>
                <p>{intl.formatMessage({ id: 'pages.cloud-storage.files.preview.unsupportedDesc' })}</p>
            </div>
        );
    };

    return (
        <Modal
            title={file?.name || intl.formatMessage({ id: 'pages.cloud-storage.files.preview.title' })}
            open={open}
            onCancel={handleClose}
            footer={[
                <Button key="download" icon={<DownloadOutlined />} onClick={() => file && onDownload(file)}>
                    {intl.formatMessage({ id: 'pages.cloud-storage.files.preview.download' })}
                </Button>,
                <Button key="close" type="primary" onClick={handleClose}>
                    {intl.formatMessage({ id: 'pages.button.close' })}
                </Button>
            ]}
            width={1000}
            centered
            destroyOnHidden
            styles={{ body: { padding: 0, backgroundColor: '#f5f5f5', height: '70vh', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' } }}
        >
            {renderContent()}
        </Modal>
    );
};

export default FilePreviewModal;
