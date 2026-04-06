/**
 * 这个文件作为组件的目录
 * 目的是统一管理对外输出的组件，方便分类
 */
/**
 * 布局组件
 */
import Footer from './Footer';
import { Question } from './RightContent';
import SelectLang from './SelectLang';
import { AvatarDropdown, AvatarName } from './RightContent/AvatarDropdown';
import NoticeIcon from './NoticeIcon';
import { CompanySwitcher } from './CompanySwitcher';
import { JoinCompanyModal } from './JoinCompanyModal';
import AiAssistant from './AiAssistant';
import StatCard from './StatCard';
import { ThemeSettings } from './ThemeSettings';


export {
  AvatarDropdown,
  AvatarName,
  Footer,
  JoinCompanyModal,
  NoticeIcon,
  Question,
  SelectLang,
  CompanySwitcher, // v3.1: 企业切换器
  AiAssistant, // AI 助手组件
  StatCard, // 统一统计卡片组件
  ThemeSettings, // 主题设置组件（替代已移除的 SettingDrawer）
};
