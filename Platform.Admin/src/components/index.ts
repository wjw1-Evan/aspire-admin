/**
 * 这个文件作为组件的目录
 * 目的是统一管理对外输出的组件，方便分类
 */
/**
 * 布局组件
 */
import Footer from './Footer';
import { Question, SelectLang } from './RightContent';
import { AvatarDropdown, AvatarName } from './RightContent/AvatarDropdown';
import NoticeIcon from './NoticeIcon';
import { CompanySwitcher } from './CompanySwitcher';
import { JoinCompanyModal } from './JoinCompanyModal';
import AiAssistant from './AiAssistant';

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
};
