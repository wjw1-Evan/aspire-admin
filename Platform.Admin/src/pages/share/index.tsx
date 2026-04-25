import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams } from '@umijs/max';
import { Space, Typography, Spin, Result, Input, Button, Tag, message } from 'antd';
import { ProCard } from '@ant-design/pro-components';
import { request } from '@umijs/max';
import { ApiResponse } from '@/types';
import { getIntl } from '@umijs/max';

const { Title, Text } = Typography;

interface ShareAccessResponse {
    fileId: string;
    fileName: string;
    fileSize: number;
    mimeType?: string;
    accessType: 'view' | 'download' | 'edit';
    canDownload: boolean;
    canView: boolean;
    previewUrl?: string;
    downloadUrl?: string;
}

interface ShareAccessRequest {
    shareToken: string;
    password?: string;
}

const api = {
    access: (data: ShareAccessRequest) =>
        request<ApiResponse<ShareAccessResponse>>(`/apiservice/api/file-share/public/${encodeURIComponent(data.shareToken)}`, {
            method: 'GET',
            params: data.password ? { password: data.password } : {},
        }),
    download: (shareToken: string, password?: string, fallbackName?: string) => {
        const qs = password ? `?password=${encodeURIComponent(password)}` : '';
        return request<any>(`/apiservice/api/file-share/public/${encodeURIComponent(shareToken)}/download${qs}`, {
            method: 'GET',
            responseType: 'blob',
            getResponse: true,
        });
    },
};

const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const SharePage: React.FC = () => {
    const intl = getIntl();
    const params = useParams();
    const token = params?.token as string | undefined;

    const [state, setState] = useState({
        loading: false,
        shareInfo: null as ShareAccessResponse | null,
        password: undefined as string | undefined,
        error: null as string | null,
    });
    const set = useCallback((partial: Partial<typeof state>) => setState(prev => ({ ...prev, ...partial })), []);

    const loadShare = async (pwd?: string) => {
        if (!token) return;
        set({ loading: true, error: null });
        try {
            const resp = await api.access({ shareToken: token, password: pwd });
            if (resp.success && resp.data) {
                const d: any = resp.data;
                const accessType = (d.accessType || d.permission || 'view') as ShareAccessResponse['accessType'];
                const canDownload = d.canDownload !== undefined ? d.canDownload : accessType !== 'view';
                const mapped: ShareAccessResponse = {
                    fileId: d.fileId || d.id,
                    fileName: d.fileName || d.name || intl.formatMessage({ id: 'pages.share.unnamedFile' }),
                    fileSize: d.fileSize || d.size || 0,
                    mimeType: d.mimeType,
                    accessType,
                    canDownload,
                    canView: d.canView !== undefined ? d.canView : true,
                    previewUrl: d.previewUrl || d.previewURL,
                    downloadUrl: d.downloadUrl || d.downloadURL,
                };
                set({ shareInfo: mapped, error: null });
            } else {
                set({ shareInfo: null, error: (resp as any).message || (resp as any).msg || intl.formatMessage({ id: 'pages.share.error.cannotAccess' }) });
            }
        } catch (e: any) {
            set({ shareInfo: null, error: e?.message || intl.formatMessage({ id: 'pages.share.error.accessFailed' }) });
        } finally {
            set({ loading: false });
        }
    };

    useEffect(() => {
        loadShare();
    }, [token]);

    const accessTag = useMemo(() => {
        if (!state.shareInfo) return null;
        const map: Record<string, { color: string; text: string }> = {
            view: { color: 'blue', text: intl.formatMessage({ id: 'pages.share.accessType.view' }) },
            download: { color: 'green', text: intl.formatMessage({ id: 'pages.share.accessType.download' }) },
            edit: { color: 'orange', text: intl.formatMessage({ id: 'pages.share.accessType.edit' }) },
        };
        return <Tag color={map[state.shareInfo.accessType]?.color || 'default'}>{map[state.shareInfo.accessType]?.text || state.shareInfo.accessType}</Tag>;
    }, [state.shareInfo, intl]);

    const handleDownload = async () => {
        if (!state.shareInfo || !state.shareInfo.canDownload || !token) return;
        try {
            const response = await api.download(token, state.password, state.shareInfo.fileName);
            const blob = response?.data;
            if (!blob) throw new Error('未获取到文件数据');
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const contentDisposition = response.headers['content-disposition'];
            let filename = state.shareInfo.fileName || 'download';
            if (contentDisposition) {
                const fnameStar = contentDisposition.match(/filename\*\s*=\s*([^;]+)/i);
                if (fnameStar && fnameStar[1]) {
                    const starValue = fnameStar[1].trim().replace(/^UTF-8''/i, '');
                    try {
                        filename = decodeURIComponent(starValue);
                    } catch {
                        filename = starValue;
                    }
                } else {
                    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/i);
                    if (filenameMatch && filenameMatch[1]) {
                        filename = filenameMatch[1].replace(/['"]/g, '');
                    }
                }
            }
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (e: any) {
            const status = (e as any)?.response?.status;
            const msg = (e as any)?.data?.message || (e as any)?.data?.msg || e?.message;
            const friendly = status === 403 ? intl.formatMessage({ id: 'pages.share.error.noPermission' }) : status === 404 ? intl.formatMessage({ id: 'pages.share.error.notFound' }) : msg || intl.formatMessage({ id: 'pages.share.error.downloadFailed' });
            message.error(friendly);
        }
    };

    const renderContent = () => {
        if (state.loading) {
            return (
                <div style={{ textAlign: 'center', padding: 48 }}>
                    <Spin tip={intl.formatMessage({ id: 'pages.share.loading' })} />
                </div>
            );
        }

        if (!state.shareInfo) {
            return (
                <Result
                    status="warning"
                    title={intl.formatMessage({ id: 'pages.share.result.title' })}
                    subTitle={state.error || intl.formatMessage({ id: 'pages.share.result.subTitle' })}
                    extra={
                        <Space orientation="vertical" style={{ width: '100%' }}>
                            <Input.Password
                                placeholder={intl.formatMessage({ id: 'pages.share.input.passwordPlaceholder' })}
                                value={state.password}
                                onChange={(e) => set({ password: e.target.value })}
                            />
                            <Button type="primary" onClick={() => loadShare(state.password)}>
                                {intl.formatMessage({ id: 'pages.share.button.retry' })}
                            </Button>
                        </Space>
                    }
                />
            );
        }

        return (
            <ProCard style={{ maxWidth: 520, margin: '0 auto' }}>
                <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                    <div>
                        <Title level={3} style={{ marginBottom: 4 }}>{state.shareInfo.fileName}</Title>
                        <Space>
                            {accessTag}
                            <Text type="secondary">{intl.formatMessage({ id: 'pages.share.fileSize' })}：{formatFileSize(state.shareInfo.fileSize)}</Text>
                        </Space>
                    </div>

                    {state.shareInfo.previewUrl && (
                        <a href={state.shareInfo.previewUrl} target="_blank" rel="noreferrer">{intl.formatMessage({ id: 'pages.share.preview' })}</a>
                    )}

                    <Space>
                        <Button
                            type="primary"
                            disabled={!state.shareInfo.canDownload}
                            onClick={handleDownload}
                        >
                            {state.shareInfo.canDownload ? intl.formatMessage({ id: 'pages.share.button.download' }) : intl.formatMessage({ id: 'pages.share.button.cannotDownload' })}
                        </Button>
                        {state.shareInfo.accessType && (
                            <Text type="secondary">{intl.formatMessage({ id: 'pages.share.permission' })}：{state.shareInfo.accessType}</Text>
                        )}
                    </Space>

                    <Space orientation="vertical" size={4}>
                        <Text type="secondary">{intl.formatMessage({ id: 'pages.share.shareLink' })}：{window.location.href}</Text>
                        <Text type="secondary">{intl.formatMessage({ id: 'pages.share.canView' })}：{state.shareInfo.canView ? intl.formatMessage({ id: 'pages.share.yes' }) : intl.formatMessage({ id: 'pages.share.no' })}</Text>
                    </Space>

                    <Space orientation="vertical" style={{ width: '100%' }}>
                        <Text type="secondary">{intl.formatMessage({ id: 'pages.share.passwordHint' })}：</Text>
                        <Input.Password
                            placeholder={intl.formatMessage({ id: 'pages.share.input.passwordPlaceholder' })}
                            value={state.password}
                            onChange={(e) => set({ password: e.target.value })}
                        />
                        <Button onClick={() => loadShare(state.password)}>{intl.formatMessage({ id: 'pages.share.button.reverify' })}</Button>
                    </Space>
                </Space>
            </ProCard>
        );
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            {renderContent()}
        </div>
    );
};

export default SharePage;