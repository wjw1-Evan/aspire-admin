import component from './en-US/component';
import globalHeader from './en-US/globalHeader';
import menu from './en-US/menu';
import auth from './en-US/modules/auth';
import cloudStorage from './en-US/modules/cloud-storage';
import company from './en-US/modules/company';
import dashboard from './en-US/modules/dashboard';
import document from './en-US/modules/document';
import help from './en-US/modules/help';
import iot from './en-US/modules/iot';
import missing from './en-US/modules/missing';
import organization from './en-US/modules/organization';
import other from './en-US/modules/other';
import park from './en-US/modules/park';
import project from './en-US/modules/project';
import role from './en-US/modules/role';
import task from './en-US/modules/task';
import user from './en-US/modules/user';
import webScraper from './en-US/modules/web-scraper';
import workflow from './en-US/modules/workflow';
import xiaoke from './en-US/modules/xiaoke';
import pages from './en-US/pages';
import pwa from './en-US/pwa';
import request from './en-US/request';
import settingDrawer from './en-US/settingDrawer';
import settings from './en-US/settings';
import welcome from './en-US/welcome';

export default {
  'navBar.lang': 'Languages',
  'layout.user.link.help': 'Help',
  'layout.user.link.privacy': 'Privacy',
  'layout.user.link.terms': 'Terms',
  'app.preview.down.block': 'Download this page to your local project',
  'app.welcome.link.fetch-blocks': 'Get all block',
  'app.welcome.link.block-list': 'Quickly build standard, pages based on `block` development',
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
