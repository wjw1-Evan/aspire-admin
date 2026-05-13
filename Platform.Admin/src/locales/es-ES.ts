import component from './es-ES/component';
import globalHeader from './es-ES/globalHeader';
import menu from './es-ES/menu';
import auth from './es-ES/modules/auth';
import cloudStorage from './es-ES/modules/cloud-storage';
import company from './es-ES/modules/company';
import dashboard from './es-ES/modules/dashboard';
import document from './es-ES/modules/document';
import help from './es-ES/modules/help';
import iot from './es-ES/modules/iot';
import missing from './es-ES/modules/missing';
import organization from './es-ES/modules/organization';
import other from './es-ES/modules/other';
import park from './es-ES/modules/park';
import project from './es-ES/modules/project';
import role from './es-ES/modules/role';
import task from './es-ES/modules/task';
import user from './es-ES/modules/user';
import webScraper from './es-ES/modules/web-scraper';
import workflow from './es-ES/modules/workflow';
import xiaoke from './es-ES/modules/xiaoke';
import pages from './es-ES/pages';
import pwa from './es-ES/pwa';
import request from './es-ES/request';
import settingDrawer from './es-ES/settingDrawer';
import settings from './es-ES/settings';
import welcome from './es-ES/welcome';

export default {
  'navBar.lang': 'Idiomas',
  'layout.user.link.help': 'Ayuda',
  'layout.user.link.privacy': 'Privacidad',
  'layout.user.link.terms': 'Términos',
  'app.preview.down.block': 'Descargar esta página a su proyecto local',
  'app.welcome.link.fetch-blocks': 'Obtener todos los bloques',
  'app.welcome.link.block-list': 'Construya rápidamente páginas estándar basadas en el desarrollo de `block`',
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
