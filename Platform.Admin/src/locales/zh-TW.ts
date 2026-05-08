import component from './zh-TW/component';
import globalHeader from './zh-TW/globalHeader';
import menu from './zh-TW/menu';
import pages from './zh-TW/pages';
import pwa from './zh-TW/pwa';
import settingDrawer from './zh-TW/settingDrawer';
import settings from './zh-TW/settings';
import welcome from './zh-TW/welcome';

import auth from './zh-TW/modules/auth';
import cloudStorage from './zh-TW/modules/cloud-storage';
import company from './zh-TW/modules/company';
import dashboard from './zh-TW/modules/dashboard';
import document from './zh-TW/modules/document';
import help from './zh-TW/modules/help';
import iot from './zh-TW/modules/iot';
import missing from './zh-TW/modules/missing';
import organization from './zh-TW/modules/organization';
import other from './zh-TW/modules/other';
import park from './zh-TW/modules/park';
import project from './zh-TW/modules/project';
import role from './zh-TW/modules/role';
import task from './zh-TW/modules/task';
import user from './zh-TW/modules/user';
import webScraper from './zh-TW/modules/web-scraper';
import workflow from './zh-TW/modules/workflow';
import xiaoke from './zh-TW/modules/xiaoke';

export default {
  'navBar.lang': '語言',
  'layout.user.link.help': '幫助',
  'layout.user.link.privacy': '隱私',
  'layout.user.link.terms': '條款',
  'app.preview.down.block': '下載此頁面到本地項目',
  ...pages,
  ...globalHeader,
  ...menu,
  ...settingDrawer,
  ...settings,
  ...pwa,
  ...component,
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
