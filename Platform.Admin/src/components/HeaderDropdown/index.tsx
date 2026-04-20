import { Dropdown } from 'antd';
import type { DropDownProps } from 'antd/es/dropdown';
import { createStyles } from 'antd-style';
import classNames from 'classnames';
import React from 'react';

const useStyles = createStyles(({ token, css }) => {
  return {
    popupWrapper: css`
      background-color: ${token.colorBgElevated};
      border-radius: ${token.borderRadiusLG}px;
      box-shadow: ${token.boxShadowSecondary};
      border: 1px solid ${token.colorBorderSecondary};
      overflow: hidden;
    `,
  };
});

export type HeaderDropdownProps = {
  /**
   * antd v6: overlayClassName 已弃用，改用 classNames.root
   * 为兼容旧代码，保留该属性并映射到 classNames.root
   */
  overlayClassName?: string;
  /**
   * antd v6: overlayStyle 已弃用，改用 styles.root
   * 为兼容旧代码，保留该属性并映射到 styles.root
   */
  overlayStyle?: React.CSSProperties;
  placement?:
  | 'bottomLeft'
  | 'bottomRight'
  | 'topLeft'
  | 'topCenter'
  | 'topRight'
  | 'bottomCenter'
  | 'bottom';
  /** 传递给 antd Dropdown 的 classNames */
  classNames?: DropDownProps['classNames'];
  /** 传递给 antd Dropdown 的 styles */
  styles?: DropDownProps['styles'];
  /** 支持复杂内容的渲染 */
  dropdownRender?: DropDownProps['dropdownRender'];
} & Omit<DropDownProps, 'overlay'>;

const DEFAULT_TRIGGER: ('contextMenu' | 'click' | 'hover')[] = ['click'];

const HeaderDropdown: React.FC<HeaderDropdownProps> = ({
  overlayClassName: cls,
  overlayStyle: style,
  classNames: customClassNames,
  styles: customStyles,
  dropdownRender,
  ...restProps
}) => {
  const { styles } = useStyles();

  return (
    <Dropdown
      trigger={DEFAULT_TRIGGER}
      classNames={{ root: classNames(cls) }}
      styles={{ root: style }}
      arrow={{ pointAtCenter: true }}
      transitionName=""
      popupRender={(menu) => (
        <div className={styles.popupWrapper}>
          {dropdownRender ? dropdownRender(menu) : menu}
        </div>
      )}
      {...restProps}
    />
  );
};

export default HeaderDropdown;
