import component from './ko-KR/component';
import globalHeader from './ko-KR/globalHeader';
import menu from './ko-KR/menu';
import pages from './ko-KR/pages';
import pwa from './ko-KR/pwa';
import settingDrawer from './ko-KR/settingDrawer';
import settings from './ko-KR/settings';
import request from './ko-KR/request';
import welcome from './ko-KR/welcome';

import auth from './ko-KR/modules/auth';
import cloudStorage from './ko-KR/modules/cloud-storage';
import company from './ko-KR/modules/company';
import dashboard from './ko-KR/modules/dashboard';
import document from './ko-KR/modules/document';
import help from './ko-KR/modules/help';
import iot from './ko-KR/modules/iot';
import missing from './ko-KR/modules/missing';
import organization from './ko-KR/modules/organization';
import other from './ko-KR/modules/other';
import park from './ko-KR/modules/park';
import project from './ko-KR/modules/project';
import role from './ko-KR/modules/role';
import task from './ko-KR/modules/task';
import user from './ko-KR/modules/user';
import webScraper from './ko-KR/modules/web-scraper';
import workflow from './ko-KR/modules/workflow';
import xiaoke from './ko-KR/modules/xiaoke';

export default {
    'navBar.lang': '언어',
    'layout.user.link.help': '도움말',
    'layout.user.link.privacy': '개인정보처리방침',
    'layout.user.link.terms': '이용약관',
    'app.preview.down.block': '이 페이지를 로컬 프로젝트로 다운로드',
    'app.welcome.link.fetch-blocks': '모든 블록 가져오기',
    'app.welcome.link.block-list':
        '`block` 개발을 기반으로 표준 페이지를 빠르게 구축',
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
