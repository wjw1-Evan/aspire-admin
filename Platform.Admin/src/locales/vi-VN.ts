import component from './vi-VN/component';
import globalHeader from './vi-VN/globalHeader';
import menu from './vi-VN/menu';
import auth from './vi-VN/modules/auth';
import cloudStorage from './vi-VN/modules/cloud-storage';
import company from './vi-VN/modules/company';
import dashboard from './vi-VN/modules/dashboard';
import document from './vi-VN/modules/document';
import help from './vi-VN/modules/help';
import iot from './vi-VN/modules/iot';
import missing from './vi-VN/modules/missing';
import organization from './vi-VN/modules/organization';
import other from './vi-VN/modules/other';
import park from './vi-VN/modules/park';
import project from './vi-VN/modules/project';
import role from './vi-VN/modules/role';
import task from './vi-VN/modules/task';
import user from './vi-VN/modules/user';
import webScraper from './vi-VN/modules/web-scraper';
import workflow from './vi-VN/modules/workflow';
import xiaoke from './vi-VN/modules/xiaoke';
import pages from './vi-VN/pages';
import pwa from './vi-VN/pwa';
import request from './vi-VN/request';
import settingDrawer from './vi-VN/settingDrawer';
import settings from './vi-VN/settings';
import welcome from './vi-VN/welcome';

export default {
  'navBar.lang': 'Ngôn ngữ',
  'layout.user.link.help': 'Trợ giúp',
  'layout.user.link.privacy': 'Quyền riêng tư',
  'layout.user.link.terms': 'Điều khoản',
  'app.preview.down.block': 'Tải trang này về dự án của bạn',
  'app.welcome.link.fetch-blocks': 'Lấy tất cả các khối',
  'app.welcome.link.block-list': 'Xây dựng nhanh các trang tiêu chuẩn dựa trên phát triển `block`',
  ...globalHeader,
  ...menu,
  ...settingDrawer,
  ...settings,
  ...pwa,
  ...component,
  ...request,
  ...pages,
  ...welcome,

  ...auth,
  ...cloudStorage,
  ...company,
  ...dashboard,
  ...document,
  ...help,
  ...iot,
  ...missing,
  ...organization,
  ...other,
  ...park,
  ...project,
  ...role,
  ...task,
  ...user,
  ...webScraper,
  ...workflow,
  ...xiaoke,
};
