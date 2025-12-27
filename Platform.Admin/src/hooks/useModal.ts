import { App } from 'antd';

/**
 * 使用 App 组件提供的 Modal 上下文
 * 替代 Modal.confirm 等静态方法，避免无法消费动态主题的警告
 */
export const useModal = () => {
    const { modal } = App.useApp();
    return modal;
};