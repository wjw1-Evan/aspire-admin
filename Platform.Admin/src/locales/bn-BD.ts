import component from './bn-BD/component';
import globalHeader from './bn-BD/globalHeader';
import menu from './bn-BD/menu';
import pages from './bn-BD/pages';
import pwa from './bn-BD/pwa';
import settingDrawer from './bn-BD/settingDrawer';
import settings from './bn-BD/settings';
import welcome from './bn-BD/welcome';

import auth from './bn-BD/modules/auth';
import cloudStorage from './bn-BD/modules/cloud-storage';
import company from './bn-BD/modules/company';
import dashboard from './bn-BD/modules/dashboard';
import document from './bn-BD/modules/document';
import help from './bn-BD/modules/help';
import iot from './bn-BD/modules/iot';
import missing from './bn-BD/modules/missing';
import organization from './bn-BD/modules/organization';
import other from './bn-BD/modules/other';
import park from './bn-BD/modules/park';
import project from './bn-BD/modules/project';
import role from './bn-BD/modules/role';
import task from './bn-BD/modules/task';
import user from './bn-BD/modules/user';
import webScraper from './bn-BD/modules/web-scraper';
import workflow from './bn-BD/modules/workflow';
import xiaoke from './bn-BD/modules/xiaoke';

export default {
  'navBar.lang': 'ভাষা',
  'layout.user.link.help': 'সহায়তা',
  'layout.user.link.privacy': 'গোপনীয়তা',
  'layout.user.link.terms': 'শর্তাদি',
  'app.preview.down.block': 'আপনার স্থানীয় প্রকল্পে এই পৃষ্ঠাটি ডাউনলোড করুন',
  'app.welcome.link.fetch-blocks': 'সমস্ত ব্লক পান',
  'app.welcome.link.block-list':
    '`block` ডেভেলপমেন্ট এর উপর ভিত্তি করে দ্রুত স্ট্যান্ডার্ড, পৃষ্ঠাসমূহ তৈরি করুন।',
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
