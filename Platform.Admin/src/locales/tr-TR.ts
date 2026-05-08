import component from './tr-TR/component';
import globalHeader from './tr-TR/globalHeader';
import menu from './tr-TR/menu';
import pages from './tr-TR/pages';
import pwa from './tr-TR/pwa';
import settingDrawer from './tr-TR/settingDrawer';
import settings from './tr-TR/settings';
import request from './tr-TR/request';
import welcome from './tr-TR/welcome';

import auth from './tr-TR/modules/auth';
import cloudStorage from './tr-TR/modules/cloud-storage';
import company from './tr-TR/modules/company';
import dashboard from './tr-TR/modules/dashboard';
import document from './tr-TR/modules/document';
import help from './tr-TR/modules/help';
import iot from './tr-TR/modules/iot';
import missing from './tr-TR/modules/missing';
import organization from './tr-TR/modules/organization';
import other from './tr-TR/modules/other';
import park from './tr-TR/modules/park';
import project from './tr-TR/modules/project';
import role from './tr-TR/modules/role';
import task from './tr-TR/modules/task';
import user from './tr-TR/modules/user';
import webScraper from './tr-TR/modules/web-scraper';
import workflow from './tr-TR/modules/workflow';
import xiaoke from './tr-TR/modules/xiaoke';

export default {
    'navBar.lang': 'Diller',
    'layout.user.link.help': 'Yardım',
    'layout.user.link.privacy': 'Gizlilik',
    'layout.user.link.terms': 'Şartlar',
    'app.preview.down.block': 'Bu sayfayı yerel projenize indirin',
    'app.welcome.link.fetch-blocks': 'Tüm blokları al',
    'app.welcome.link.block-list':
        '`block` geliştirmesine dayalı olarak hızlıca standart sayfalar oluşturun',
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
