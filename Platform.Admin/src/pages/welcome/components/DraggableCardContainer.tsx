import React, { useState, useCallback } from 'react';
import { Button, Tooltip } from 'antd';
import { DragOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import type { CardLayoutConfig } from '@/services/welcome/layout';

interface DraggableCardContainerProps {
    children: React.ReactNode;
    column: 'left' | 'right';
    cardId: string;
    isDragging: boolean;
    onDragStart: (cardId: string, column: 'left' | 'right') => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (cardId: string, column: 'left' | 'right') => void;
    onLayoutChange: (layouts: CardLayoutConfig[]) => void;
}

const DraggableCardContainer: React.FC<DraggableCardContainerProps> = ({
    children,
    column,
    cardId,
    isDragging,
    onDragStart,
    onDragOver,
    onDrop,
}) => {
    const [isEditMode, setIsEditMode] = useState(false);

    const handleDragStart = (e: React.DragEvent) => {
        if (!isEditMode) return;
        e.dataTransfer!.effectAllowed = 'move';
        e.dataTransfer!.setData('cardId', cardId);
        e.dataTransfer!.setData('column', column);
        onDragStart(cardId, column);
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (!isEditMode) return;
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
        onDragOver(e);
    };

    const handleDrop = (e: React.DragEvent) => {
        if (!isEditMode) return;
        e.preventDefault();
        const draggedCardId = e.dataTransfer!.getData('cardId');
        onDrop(draggedCardId, column);
    };

    return (
        <div
            draggable={isEditMode}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{
                opacity: isDragging ? 0.5 : 1,
                cursor: isEditMode ? 'grab' : 'default',
                transition: 'opacity 0.2s',
                position: 'relative',
            }}
        >
            {isEditMode && (
                <div
                    style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        zIndex: 10,
                        display: 'flex',
                        gap: '4px',
                    }}
                >
                    <Tooltip title="拖动调整位置">
                        <DragOutlined style={{ cursor: 'grab', fontSize: '14px', color: '#1890ff' }} />
                    </Tooltip>
                </div>
            )}
            {children}
            <div
                style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 10,
                }}
            >
                <Button
                    type="text"
                    size="small"
                    icon={isEditMode ? <LockOutlined /> : <UnlockOutlined />}
                    onClick={() => setIsEditMode(!isEditMode)}
                    title={isEditMode ? '锁定布局' : '编辑布局'}
                />
            </div>
        </div>
    );
};

export default DraggableCardContainer;
