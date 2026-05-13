import component from './ja-JP/component';
import globalHeader from './ja-JP/globalHeader';
import menu from './ja-JP/menu';
import auth from './ja-JP/modules/auth';
import cloudStorage from './ja-JP/modules/cloud-storage';
import company from './ja-JP/modules/company';
import dashboard from './ja-JP/modules/dashboard';
import document from './ja-JP/modules/document';
import help from './ja-JP/modules/help';
import iot from './ja-JP/modules/iot';
import missing from './ja-JP/modules/missing';
import organization from './ja-JP/modules/organization';
import other from './ja-JP/modules/other';
import park from './ja-JP/modules/park';
import project from './ja-JP/modules/project';
import role from './ja-JP/modules/role';
import task from './ja-JP/modules/task';
import user from './ja-JP/modules/user';
import webScraper from './ja-JP/modules/web-scraper';
import workflow from './ja-JP/modules/workflow';
import xiaoke from './ja-JP/modules/xiaoke';
import pages from './ja-JP/pages';
import pwa from './ja-JP/pwa';
import settingDrawer from './ja-JP/settingDrawer';
import settings from './ja-JP/settings';
import welcome from './ja-JP/welcome';

export default {
  'navBar.lang': '言語',
  'layout.user.link.help': 'ヘルプ',
  'layout.user.link.privacy': 'プライバシー',
  'layout.user.link.terms': '利用規約',
  'app.preview.down.block': 'このページをローカルプロジェクトにダウンロードしてください',
  'app.welcome.link.fetch-blocks': '',
  'app.welcome.link.block-list': '',
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
