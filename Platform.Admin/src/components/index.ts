/**
 * 这个文件作为组件的目录
 * 目的是统一管理对外输出的组件，方便分类
 */
/**
 * 布局组件
 */

import AiAssistant from './AiAssistant';
import { CompanySwitcher } from './CompanySwitcher';
import Footer from './Footer';
import { JoinCompanyModal } from './JoinCompanyModal';
import NoticeIcon from './NoticeIcon';
import { Question } from './RightContent';
import { AvatarDropdown, AvatarName } from './RightContent/AvatarDropdown';
import SelectLang from './SelectLang';
import StatCard from './StatCard';
import { ThemeSettings } from './ThemeSettings';

export {
  AiAssistant, // AI 助手组件
  AvatarDropdown,
  AvatarName,
  CompanySwitcher, // v3.1: 企业切换器
  Footer,
  JoinCompanyModal,
  NoticeIcon,
  Question,
  SelectLang,
  StatCard, // 统一统计卡片组件
  ThemeSettings, // 主题设置组件（替代已移除的 SettingDrawer）
};
