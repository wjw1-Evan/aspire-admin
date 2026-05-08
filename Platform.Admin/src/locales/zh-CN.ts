import component from './zh-CN/component';
import globalHeader from './zh-CN/globalHeader';
import menu from './zh-CN/menu';
import pages from './zh-CN/pages';
import pwa from './zh-CN/pwa';
import settingDrawer from './zh-CN/settingDrawer';
import settings from './zh-CN/settings';
import request from './zh-CN/request';
import welcome from './zh-CN/welcome';

import auth from './zh-CN/modules/auth';
import cloudStorage from './zh-CN/modules/cloud-storage';
import company from './zh-CN/modules/company';
import dashboard from './zh-CN/modules/dashboard';
import document from './zh-CN/modules/document';
import help from './zh-CN/modules/help';
import iot from './zh-CN/modules/iot';
import missing from './zh-CN/modules/missing';
import organization from './zh-CN/modules/organization';
import other from './zh-CN/modules/other';
import park from './zh-CN/modules/park';
import project from './zh-CN/modules/project';
import role from './zh-CN/modules/role';
import task from './zh-CN/modules/task';
import userLog from './zh-CN/modules/user-log';
import user from './zh-CN/modules/user';
import webScraper from './zh-CN/modules/web-scraper';
import workflow from './zh-CN/modules/workflow';
import xiaoke from './zh-CN/modules/xiaoke';

export default {
  'navBar.lang': '语言',
  'layout.user.link.help': '帮助',
  'layout.user.link.privacy': '隐私',
  'layout.user.link.terms': '条款',
  'app.preview.down.block': '下载此页面到本地项目',
  'app.welcome.link.fetch-blocks': '获取全部区块',
  'app.welcome.link.block-list': '基于 block 开发，快速构建标准页面',
  ...pages,
  ...globalHeader,
  ...menu,
  ...settingDrawer,
  ...settings,
  ...pwa,
  ...component,
  ...request,
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
  ...userLog,
  ...user,
  ...webScraper,
  ...workflow,
  ...xiaoke,
};
