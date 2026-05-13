/**
 * 模块翻译统一导出入口 (tr-TR)
 *
 * 目录结构:
 * - modules/    - 功能模块翻译
 * - common/     - 通用翻译
 *
 * 包含模块: auth, user, task, project, workflow, document, iot, organization, role, company, help, xiaoke, other
 */

import common from './common/common';

import auth from './modules/auth';
import cloudStorage from './modules/cloud-storage';
import company from './modules/company';
import dashboard from './modules/dashboard';
import document from './modules/document';
import help from './modules/help';
import iot from './modules/iot';
import missing from './modules/missing';
import organization from './modules/organization';
import other from './modules/other';
import park from './modules/park';
import project from './modules/project';
import role from './modules/role';
import task from './modules/task';
import user from './modules/user';
import webScraper from './modules/web-scraper';
import workflow from './modules/workflow';
import xiaoke from './modules/xiaoke';

// 导出所有模块
export {
  auth,
  cloudStorage,
  common,
  company,
  dashboard,
  document,
  help,
  iot,
  missing,
  organization,
  other,
  park,
  project,
  role,
  task,
  user,
  webScraper,
  workflow,
  xiaoke,
};

// 默认导出：合并所有模块
export default {
  ...common,
  ...auth,
  ...user,
  ...task,
  ...project,
  ...workflow,
  ...document,
  ...iot,
  ...organization,
  ...role,
  ...company,
  ...help,
  ...xiaoke,
  ...dashboard,
  ...other,
  ...park,
  ...missing,
  ...cloudStorage,
  ...webScraper,
};
