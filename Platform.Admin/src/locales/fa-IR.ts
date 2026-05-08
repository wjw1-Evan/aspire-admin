import component from './fa-IR/component';
import globalHeader from './fa-IR/globalHeader';
import menu from './fa-IR/menu';
import pages from './fa-IR/pages';
import pwa from './fa-IR/pwa';
import settingDrawer from './fa-IR/settingDrawer';
import settings from './fa-IR/settings';
import welcome from './fa-IR/welcome';

import auth from './fa-IR/modules/auth';
import cloudStorage from './fa-IR/modules/cloud-storage';
import company from './fa-IR/modules/company';
import dashboard from './fa-IR/modules/dashboard';
import document from './fa-IR/modules/document';
import help from './fa-IR/modules/help';
import iot from './fa-IR/modules/iot';
import missing from './fa-IR/modules/missing';
import organization from './fa-IR/modules/organization';
import other from './fa-IR/modules/other';
import park from './fa-IR/modules/park';
import project from './fa-IR/modules/project';
import role from './fa-IR/modules/role';
import task from './fa-IR/modules/task';
import user from './fa-IR/modules/user';
import webScraper from './fa-IR/modules/web-scraper';
import workflow from './fa-IR/modules/workflow';
import xiaoke from './fa-IR/modules/xiaoke';

export default {
  'navBar.lang': 'زبان ها  ',
  'layout.user.link.help': 'کمک',
  'layout.user.link.privacy': 'حریم خصوصی',
  'layout.user.link.terms': 'مقررات',
  'app.preview.down.block': 'این صفحه را در پروژه محلی خود بارگیری کنید',
  'app.welcome.link.fetch-blocks': 'دریافت تمام بلوک',
  'app.welcome.link.block-list':
    'به سرعت صفحات استاندارد مبتنی بر توسعه "بلوک" را بسازید',
  ...globalHeader,
  ...menu,
  ...settingDrawer,
  ...settings,
  ...pwa,
  ...component,
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
