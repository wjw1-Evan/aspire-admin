import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from '@umijs/max';
import { Card, Space, Typography, Spin, Result, Input, Button, Tag, message } from 'antd';
import { accessShare, downloadSharedFile, type ShareAccessResponse } from '@/services/cloud-storage/shareApi';

const { Title, Text } = Typography;

const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const SharePage: React.FC = () => {
    const params = useParams();
    const token = params?.token as string | undefined;

    const [loading, setLoading] = useState(false);
    const [shareInfo, setShareInfo] = useState<ShareAccessResponse | null>(null);
    const [password, setPassword] = useState<string | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);

    const loadShare = useCallback(async (pwd?: string) => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const resp = await accessShare({ shareToken: token, password: pwd });
            if (resp.success && resp.data) {
                const d: any = resp.data;
                const accessType = (d.accessType || d.permission || 'view') as ShareAccessResponse['accessType'];
                const canDownload = d.canDownload !== undefined ? d.canDownload : accessType !== 'view';
                const mapped: ShareAccessResponse = {
                    fileId: d.fileId || d.id,
                    fileName: d.fileName || d.name || '未命名文件',
                    fileSize: d.fileSize || d.size || 0,
                    mimeType: d.mimeType,
                    accessType,
                    canDownload,
                    canView: d.canView !== undefined ? d.canView : true,
                    previewUrl: d.previewUrl || d.previewURL,
                    downloadUrl: d.downloadUrl || d.downloadURL,
                };
                setShareInfo(mapped);
                setError(null);
            } else {
                setShareInfo(null);
                setError((resp as any).message || (resp as any).msg || '无法访问分享');
            }
        } catch (e: any) {
            setShareInfo(null);
            setError(e?.message || '访问分享失败');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadShare();
    }, [loadShare]);

    const accessTag = useMemo(() => {
        if (!shareInfo) return null;
        const map: Record<string, { color: string; text: string }> = {
            view: { color: 'blue', text: '仅查看' },
            download: { color: 'green', text: '可下载' },
            edit: { color: 'orange', text: '可编辑' },
        };
        return <Tag color={map[shareInfo.accessType]?.color || 'default'}>{map[shareInfo.accessType]?.text || shareInfo.accessType}</Tag>;
    }, [shareInfo]);

    const renderContent = () => {
        if (loading) {
            return (
                <div style={{ textAlign: 'center', padding: 48 }}>
                    <Spin tip="加载分享信息..." />
                </div>
            );
        }

        if (!shareInfo) {
            return (
                <Result
                    status="warning"
                    title="分享不可用或需要密码"
                    subTitle={error || '请输入密码后重试，或联系分享者确认链接状态'}
                    extra={
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <Input.Password
                                placeholder="请输入分享密码（如果需要）"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <Button type="primary" onClick={() => loadShare(password)}>
                                重试访问
                            </Button>
                        </Space>
                    }
                />
            );
        }

        return (
            <Card bordered={false} style={{ maxWidth: 520, margin: '0 auto' }}>
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div>
                        <Title level={3} style={{ marginBottom: 4 }}>{shareInfo.fileName}</Title>
                        <Space>
                            {accessTag}
                            <Text type="secondary">大小：{formatFileSize(shareInfo.fileSize)}</Text>
                        </Space>
                    </div>

                    {shareInfo.previewUrl && (
                        <a href={shareInfo.previewUrl} target="_blank" rel="noreferrer">预览</a>
                    )}

                    <Space>
                        <Button
                            type="primary"
                            disabled={!shareInfo.canDownload}
                            onClick={async () => {
                                if (!shareInfo.canDownload) return;
                                try {
                                    await downloadSharedFile(token!, password, shareInfo.fileName);
                                } catch (e: any) {
                                    message.error(e?.message || '下载失败');
                                }
                            }}
                        >
                            {shareInfo.canDownload ? '下载文件' : '不可下载（仅查看权限）'}
                        </Button>
                        {shareInfo.accessType && (
                            <Text type="secondary">权限：{shareInfo.accessType}</Text>
                        )}
                    </Space>

                    <Space direction="vertical" size={4}>
                        <Text type="secondary">分享链接：{window.location.href}</Text>
                        <Text type="secondary">可查看：{shareInfo.canView ? '是' : '否'}</Text>
                    </Space>

                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Text type="secondary">如需密码，请在下方输入后重新访问：</Text>
                        <Input.Password
                            placeholder="分享密码（如果需要）"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <Button onClick={() => loadShare(password)}>重新验证</Button>
                    </Space>
                </Space>
            </Card>
        );
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            {renderContent()}
        </div>
    );
};

export default SharePage;
