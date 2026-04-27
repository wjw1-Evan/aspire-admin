/// <reference path="./.umi/exports.ts" />

declare module '*.css';
declare module '*.less';
declare module '*.scss';
declare module '*.sass';

// react-grid-layout 运行时版本与 @types/react-grid-layout 声明不一致
// 运行时无 WidthProvider，使用 useContainerWidth hook 替代
declare module 'react-grid-layout' {
  import * as React from 'react';

  export interface LayoutItem {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    static?: boolean;
  }

  export interface ResponsiveGridLayoutProps {
    className?: string;
    width: number;
    layouts?: Record<string, LayoutItem[]>;
    breakpoints?: Record<string, number>;
    cols?: Record<string, number>;
    rowHeight?: number;
    maxRows?: number;
    margin?: [number, number];
    containerPadding?: [number, number] | null;
    isDraggable?: boolean;
    isResizable?: boolean;
    compactType?: 'vertical' | 'horizontal' | null;
    onLayoutChange?: (layout: LayoutItem[], layouts: Record<string, LayoutItem[]>) => void;
    onBreakpointChange?: (newBreakpoint: string, newCols: number) => void;
    onWidthChange?: (containerWidth: number, margin: [number, number], cols: number) => void;
    children?: React.ReactNode;
  }

  export const ResponsiveGridLayout: React.FC<ResponsiveGridLayoutProps>;

  export function useContainerWidth(options?: {
    measureBeforeMount?: boolean;
    initialWidth?: number;
  }): {
    width: number;
    mounted: boolean;
    containerRef: React.RefObject<HTMLDivElement>;
    measureWidth: () => void;
  };
}
