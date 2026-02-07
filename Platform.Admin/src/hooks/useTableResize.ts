import { useEffect, useRef } from 'react';

/**
 * 表格列宽度调整 Hook
 * 为表格头部添加拖拽调整宽度的功能
 * 
 * @param tableRef 表格容器的 ref
 * @param enabled 是否启用
 */
export function useTableResize(
    tableRef: React.RefObject<HTMLElement | null>,
    enabled: boolean = true
) {
    useEffect(() => {
        if (!enabled || !tableRef.current) return;

        let isResizing = false;

        const initResizeHandlers = () => {
            const table = tableRef.current;
            if (!table) return;

            const thead = table.querySelector('thead');
            if (!thead) return;

            const headers = thead.querySelectorAll('th');

            const handleMouseDown = (e: MouseEvent, header: HTMLElement) => {
                const rect = header.getBoundingClientRect();
                const edgeThreshold = 10;
                const isNearRightEdge = e.clientX >= rect.right - edgeThreshold;

                if (!isNearRightEdge) return;

                isResizing = true;
                const startX = e.clientX;
                const startWidth = rect.width;

                const handleMouseMoveGlobal = (moveEvent: MouseEvent) => {
                    if (!isResizing) return;
                    const currentX = moveEvent.clientX;
                    const diffX = currentX - startX;
                    const newWidth = Math.max(50, startWidth + diffX);
                    header.style.width = `${newWidth}px`;
                    header.style.minWidth = `${newWidth}px`;
                };

                const handleMouseUpGlobal = () => {
                    isResizing = false;
                    document.removeEventListener('mousemove', handleMouseMoveGlobal);
                    document.removeEventListener('mouseup', handleMouseUpGlobal);
                    document.body.style.cursor = '';
                };

                document.addEventListener('mousemove', handleMouseMoveGlobal);
                document.addEventListener('mouseup', handleMouseUpGlobal);
                document.body.style.cursor = 'col-resize';
            };

            headers.forEach((header) => {
                const headerEl = header as HTMLElement;
                headerEl.style.position = 'relative';
                headerEl.style.cursor = 'default';

                // 移除旧的监听器（如果有）
                if ((headerEl as any)._mouseMoveHandler) {
                    headerEl.removeEventListener('mousemove', (headerEl as any)._mouseMoveHandler);
                }
                if ((headerEl as any)._mouseDownHandler) {
                    headerEl.removeEventListener('mousedown', (headerEl as any)._mouseDownHandler);
                }

                const mouseMoveHandler = (e: MouseEvent) => {
                    const rect = headerEl.getBoundingClientRect();
                    const edgeThreshold = 5;
                    const isNearRightEdge = e.clientX >= rect.right - edgeThreshold;

                    if (isNearRightEdge && !isResizing) {
                        headerEl.style.cursor = 'col-resize';
                    } else if (!isResizing) {
                        headerEl.style.cursor = 'default';
                    }
                };

                headerEl.addEventListener('mousemove', mouseMoveHandler);
                (headerEl as any)._mouseMoveHandler = mouseMoveHandler;

                const mouseDownHandler = (e: MouseEvent) => {
                    handleMouseDown(e, headerEl);
                };
                headerEl.addEventListener('mousedown', mouseDownHandler);
                (headerEl as any)._mouseDownHandler = mouseDownHandler;
            });
        };

        // 延迟初始化，确保表格已渲染，并使用防抖
        let timer: NodeJS.Timeout | null = setTimeout(() => {
            initResizeHandlers();
        }, 500);

        const observer = new MutationObserver(() => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                initResizeHandlers();
            }, 500);
        });

        observer.observe(tableRef.current, {
            childList: true,
            subtree: true,
        });

        return () => {
            if (timer) clearTimeout(timer);
            observer.disconnect();

            if (tableRef.current) {
                const thead = tableRef.current.querySelector('thead');
                if (thead) {
                    const headers = thead.querySelectorAll('th');
                    headers.forEach((header) => {
                        const headerEl = header as HTMLElement;
                        if ((headerEl as any)._mouseMoveHandler) {
                            headerEl.removeEventListener('mousemove', (headerEl as any)._mouseMoveHandler);
                        }
                        if ((headerEl as any)._mouseDownHandler) {
                            headerEl.removeEventListener('mousedown', (headerEl as any)._mouseDownHandler);
                        }
                    });
                }
            }
        };
    }, [enabled, tableRef]);
}
