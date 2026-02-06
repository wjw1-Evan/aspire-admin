/**
 * Cloud Storage Files - Utility Functions
 */

import React from 'react';
import { FolderOutlined, FileOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { FileItem } from './types';

// 与后端保持一致的上传体积上限（5GB）
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024;

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化日期时间
 */
export function formatDateTime(dateTime: string | null | undefined): string {
    if (!dateTime) return '-';
    try {
        const date = dayjs(dateTime);
        if (!date.isValid()) return dateTime;
        return date.format('YYYY-MM-DD HH:mm:ss');
    } catch (error) {
        console.error('日期格式化错误:', error, dateTime);
        return dateTime || '-';
    }
}

/**
 * 获取文件图标
 */
export function getFileIcon(file: FileItem): React.ReactNode {
    if (file.isFolder) {
        return React.createElement(FolderOutlined, { style: { color: '#1890ff' } });
    }

    const ext = file.extension?.toLowerCase();
    switch (ext) {
        case 'pdf':
            return React.createElement(FileOutlined, { style: { color: '#ff4d4f' } });
        case 'doc':
        case 'docx':
            return React.createElement(FileTextOutlined, { style: { color: '#1890ff' } });
        case 'xls':
        case 'xlsx':
            return React.createElement(FileOutlined, { style: { color: '#52c41a' } });
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
            return React.createElement(FileOutlined, { style: { color: '#722ed1' } });
        default:
            return React.createElement(FileOutlined);
    }
}

/**
 * 转换后端文件数据到前端格式
 */
export function transformFileItem(item: any): FileItem {
    // 提取文件扩展名（如果还没有）
    const extension = item.extension || (() => {
        if (item.type === 'folder' || item.type === 1) return undefined;
        const nameParts = item.name?.split('.');
        return nameParts && nameParts.length > 1 ? nameParts[nameParts.length - 1].toLowerCase() : undefined;
    })();

    return {
        ...item,
        // 将 type 字段转换为 isFolder 布尔值
        isFolder: item.type === 'folder' || item.type === 1,
        // 确保字段名称匹配
        createdByName: item.createdByName || item.createdByUsername || '',
        updatedByName: item.updatedByName || item.updatedByUsername || '',
        // 确保 parentId 为空字符串时转换为 undefined
        parentId: item.parentId && item.parentId.trim() ? item.parentId : undefined,
        // 确保 extension 字段存在
        extension,
        // 确保 tags 是数组
        tags: Array.isArray(item.tags) ? item.tags : [],
        // 确保 isPublic 有默认值
        isPublic: item.isPublic !== undefined ? item.isPublic : false,
    };
}

/**
 * 检查是否为 Office 文件
 */
export function isOfficeFile(mimeType?: string, fileName?: string): boolean {
    const mt = mimeType?.toLowerCase() || '';
    return (
        mt.includes('word') ||
        mt.includes('excel') ||
        mt.includes('powerpoint') ||
        mt.includes('officedocument') ||
        mt === 'application/vnd.ms-excel' ||
        mt === 'application/vnd.ms-powerpoint' ||
        mt === 'application/msword' ||
        !!fileName?.match(/\.(docx?|xlsx?|pptx?|doc|xls|ppt)$/i)
    );
}

/**
 * 检查是否为图片文件
 */
export function isImageFile(mimeType?: string): boolean {
    return mimeType?.toLowerCase().startsWith('image/') || false;
}

/**
 * 检查是否为视频文件
 */
export function isVideoFile(mimeType?: string): boolean {
    return mimeType?.toLowerCase().startsWith('video/') || false;
}

/**
 * 检查是否为音频文件
 */
export function isAudioFile(mimeType?: string): boolean {
    return mimeType?.toLowerCase().startsWith('audio/') || false;
}
