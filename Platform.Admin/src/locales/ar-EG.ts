import component from './ar-EG/component';
import globalHeader from './ar-EG/globalHeader';
import menu from './ar-EG/menu';
import pages from './ar-EG/pages';
import pwa from './ar-EG/pwa';
import settingDrawer from './ar-EG/settingDrawer';
import settings from './ar-EG/settings';
import request from './ar-EG/request';
import welcome from './ar-EG/welcome';

import auth from './ar-EG/modules/auth';
import cloudStorage from './ar-EG/modules/cloud-storage';
import company from './ar-EG/modules/company';
import dashboard from './ar-EG/modules/dashboard';
import document from './ar-EG/modules/document';
import help from './ar-EG/modules/help';
import iot from './ar-EG/modules/iot';
import missing from './ar-EG/modules/missing';
import organization from './ar-EG/modules/organization';
import other from './ar-EG/modules/other';
import park from './ar-EG/modules/park';
import project from './ar-EG/modules/project';
import role from './ar-EG/modules/role';
import task from './ar-EG/modules/task';
import user from './ar-EG/modules/user';
import webScraper from './ar-EG/modules/web-scraper';
import workflow from './ar-EG/modules/workflow';
import xiaoke from './ar-EG/modules/xiaoke';

export default {
    'navBar.lang': 'اللغات',
    'layout.user.link.help': 'مساعدة',
    'layout.user.link.privacy': 'الخصوصية',
    'layout.user.link.terms': 'الشروط',
    'app.preview.down.block': 'تحميل هذه الصفحة إلى مشروعك المحلي',
    'app.welcome.link.fetch-blocks': 'الحصول على جميع الكتل',
    'app.welcome.link.block-list':
        'بناء صفحات قياسية بسرعة بناءً على تطوير `block`',
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
