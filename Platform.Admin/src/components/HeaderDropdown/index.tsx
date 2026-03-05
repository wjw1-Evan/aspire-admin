import { Dropdown } from 'antd';
import type { DropDownProps } from 'antd/es/dropdown';
import { createStyles } from 'antd-style';
import classNames from 'classnames';
import React from 'react';

const useStyles = createStyles(({ token }) => {
  return {
    dropdown: {
      [`@media screen and (max-width: ${token.screenXS}px)`]: {
        width: '100%',
      },
    },
  };
});

export type HeaderDropdownProps = {
  /**
   * antd v6: overlayClassName 已弃用，改用 classNames.root
   * 为兼容旧代码，保留该属性并映射到 classNames.root
   */
  overlayClassName?: string;
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
  /** 支持复杂内容的渲染 */
  dropdownRender?: DropDownProps['dropdownRender'];
} & Omit<DropDownProps, 'overlay'>;

const HeaderDropdown: React.FC<HeaderDropdownProps> = ({
  overlayClassName: cls,
  classNames: customClassNames,
  dropdownRender,
  ...restProps
}) => {
  const { styles } = useStyles();

  return (
    <Dropdown
      overlayClassName={classNames('premium-popup', styles.dropdown, cls)}
      classNames={customClassNames}
      arrow={{ pointAtCenter: true }}
      transitionName=""
      dropdownRender={dropdownRender}
      {...restProps}
    />
  );
};

export default HeaderDropdown;
