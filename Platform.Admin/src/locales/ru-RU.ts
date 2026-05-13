import component from './ru-RU/component';
import globalHeader from './ru-RU/globalHeader';
import menu from './ru-RU/menu';
import auth from './ru-RU/modules/auth';
import cloudStorage from './ru-RU/modules/cloud-storage';
import company from './ru-RU/modules/company';
import dashboard from './ru-RU/modules/dashboard';
import document from './ru-RU/modules/document';
import help from './ru-RU/modules/help';
import iot from './ru-RU/modules/iot';
import missing from './ru-RU/modules/missing';
import organization from './ru-RU/modules/organization';
import other from './ru-RU/modules/other';
import park from './ru-RU/modules/park';
import project from './ru-RU/modules/project';
import role from './ru-RU/modules/role';
import task from './ru-RU/modules/task';
import user from './ru-RU/modules/user';
import webScraper from './ru-RU/modules/web-scraper';
import workflow from './ru-RU/modules/workflow';
import xiaoke from './ru-RU/modules/xiaoke';
import pages from './ru-RU/pages';
import pwa from './ru-RU/pwa';
import request from './ru-RU/request';
import settingDrawer from './ru-RU/settingDrawer';
import settings from './ru-RU/settings';
import welcome from './ru-RU/welcome';

export default {
  'navBar.lang': 'Языки',
  'layout.user.link.help': 'Помощь',
  'layout.user.link.privacy': 'Конфиденциальность',
  'layout.user.link.terms': 'Условия',
  'app.preview.down.block': 'Скачать эту страницу в локальный проект',
  'app.welcome.link.fetch-blocks': 'Получить все блоки',
  'app.welcome.link.block-list': 'Быстро создавайте стандартные страницы на основе разработки `block`',
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
