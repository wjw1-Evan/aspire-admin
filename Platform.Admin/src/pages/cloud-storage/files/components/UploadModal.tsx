/**
 * UploadModal - 文件上传弹窗组件
 */

import React from 'react';
import { Modal, Upload, Progress } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useIntl } from '@umijs/max';
import type { UploadModalProps } from '../types';

const { Dragger } = Upload;

const UploadModal: React.FC<UploadModalProps> = ({
    open,
    onClose,
    uploadType,
    uploadProgress,
    maxUploadSizeLabel,
    onUpload,
    onBatchUpload,
}) => {
    const intl = useIntl();

    return (
        <Modal
            title={uploadType === 'folder'
                ? intl.formatMessage({ id: 'pages.cloud-storage.files.action.uploadFolder' })
                : intl.formatMessage({ id: 'pages.cloud-storage.files.action.uploadFile' })}
            open={open}
            onCancel={onClose}
            footer={null}
            width={600}
        >
            <Dragger
                name="file"
                multiple
                directory={uploadType === 'folder'}
                showUploadList={false}
                beforeUpload={(file, fileList) => {
                    // Antd 会对同一批次的每个文件逐个触发 beforeUpload，这里只在首个文件上触发自定义上传，避免重复提交
                    if (fileList && fileList[0] && file.uid !== fileList[0].uid) {
                        return false;
                    }

                    const list = fileList && fileList.length > 0 ? fileList : [file];
                    const hasDirectory = list.some((f) => (f as any).webkitRelativePath);

                    if (hasDirectory || list.length > 1) {
                        onBatchUpload(list as File[]);
                    } else {
                        onUpload(file as File);
                    }

                    return false; // 阻止默认上传行为
                }}
            >
                <p className="ant-upload-drag-icon">
                    <UploadOutlined />
                </p>
                <p className="ant-upload-text">{intl.formatMessage({ id: 'pages.cloud-storage.files.upload.dragText' })}</p>
                <p className="ant-upload-hint">
                    {intl.formatMessage({ id: 'pages.cloud-storage.files.upload.hint' }, { size: maxUploadSizeLabel })}
                </p>
            </Dragger>

            {/* 上传进度 */}
            {Object.keys(uploadProgress).length > 0 && (
                <div style={{ marginTop: 16 }}>
                    <h4>{intl.formatMessage({ id: 'pages.cloud-storage.files.upload.progress' })}</h4>
                    {Object.entries(uploadProgress).map(([uploadId, info]) => {
                        const { percent, label } = info;
                        return (
                            <div key={uploadId} style={{ marginBottom: 8 }}>
                                <div>{label}</div>
                                <Progress percent={percent} />
                            </div>
                        );
                    })}
                </div>
            )}
        </Modal>
    );
};

export default UploadModal;
