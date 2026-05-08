import component from './pt-BR/component';
import globalHeader from './pt-BR/globalHeader';
import menu from './pt-BR/menu';
import pages from './pt-BR/pages';
import pwa from './pt-BR/pwa';
import settingDrawer from './pt-BR/settingDrawer';
import settings from './pt-BR/settings';
import welcome from './pt-BR/welcome';

import auth from './pt-BR/modules/auth';
import cloudStorage from './pt-BR/modules/cloud-storage';
import company from './pt-BR/modules/company';
import dashboard from './pt-BR/modules/dashboard';
import document from './pt-BR/modules/document';
import help from './pt-BR/modules/help';
import iot from './pt-BR/modules/iot';
import missing from './pt-BR/modules/missing';
import organization from './pt-BR/modules/organization';
import other from './pt-BR/modules/other';
import park from './pt-BR/modules/park';
import project from './pt-BR/modules/project';
import role from './pt-BR/modules/role';
import task from './pt-BR/modules/task';
import user from './pt-BR/modules/user';
import webScraper from './pt-BR/modules/web-scraper';
import workflow from './pt-BR/modules/workflow';
import xiaoke from './pt-BR/modules/xiaoke';

export default {
  'navBar.lang': 'Idiomas',
  'layout.user.link.help': 'ajuda',
  'layout.user.link.privacy': 'política de privacidade',
  'layout.user.link.terms': 'termos de serviços',
  'app.preview.down.block': 'Download this page to your local project',
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
