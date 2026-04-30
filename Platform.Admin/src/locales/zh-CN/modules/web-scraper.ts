/**
 * web-scraper 翻译模块
 * 网页抓取相关翻译
 */

export default {
  'pages.web-scraper.matchNotification': '匹配通知',
  'pages.web-scraper.enableFilter': '启用筛选',
  'pages.web-scraper.filterPrompt': '筛选提示词',
  'pages.web-scraper.enableTask': '启用任务',

  // web-scraper/TaskForm.tsx message calls
  'pages.web-scraper.message.updateFailed': '更新失败',
  'pages.web-scraper.message.createFailed': '创建失败',

  // web-scraper/TaskForm.tsx UI
  'pages.web-scraper.editTask': '编辑任务',
  'pages.web-scraper.createTask': '新建任务',
  'pages.web-scraper.taskName': '任务名称',
  'pages.web-scraper.taskNameRequired': '请输入任务名称',
  'pages.web-scraper.taskNamePlaceholder': '请输入任务名称',
  'pages.web-scraper.targetUrl': '目标URL',
  'pages.web-scraper.targetUrlRequired': '请输入目标URL',
  'pages.web-scraper.targetUrlInvalid': '请输入有效的URL',
  'pages.web-scraper.targetUrlPlaceholder': 'https://example.com',
  'pages.web-scraper.description': '任务描述',
  'pages.web-scraper.descriptionPlaceholder': '请输入任务描述（可选）',
  'pages.web-scraper.titleSelector': '标题选择器',
  'pages.web-scraper.titleSelectorPlaceholder': 'CSS选择器，如 h1.title',
  'pages.web-scraper.titleSelectorTooltip': '用于提取页面标题的CSS选择器，留空则使用<title>标签',
  'pages.web-scraper.contentSelector': '内容选择器',
  'pages.web-scraper.contentSelectorPlaceholder': 'CSS选择器，如 article.content',
  'pages.web-scraper.contentSelectorTooltip': '用于提取页面主内容的CSS选择器，留空则使用<body>标签',
  'pages.web-scraper.crawlDepth': '抓取深度',
  'pages.web-scraper.maxPagesPerLevel': '每层最大页面数',
  'pages.web-scraper.crawlMode': '抓取模式',
  'pages.web-scraper.urlFilter': 'URL过滤正则',
  'pages.web-scraper.urlFilterPlaceholder': '如 ^https://example\\.com/.*',
  'pages.web-scraper.followExternalLinks': '跟随外链',
  'pages.web-scraper.deduplicate': 'URL去重',
  'pages.web-scraper.scheduleCron': '定时表达式',
  'pages.web-scraper.scheduleCronPlaceholder': '0 */10 * * * *',
  'pages.web-scraper.scheduleCronTooltip': '<p>常用示例：</p><ul><li>每10分钟：<code>*/10 * * * *</code></li><li>每小时：<code>0 * * * *</code></li><li>每天凌晨：<code>0 0 * * *</code></li><li>每周一：<code>0 0 * * 1</code></li></ul>',
  'pages.web-scraper.mode.single': '仅当前页',
  'pages.web-scraper.mode.depth': '深度优先',
  'pages.web-scraper.mode.breadth': '广度优先',
  'pages.web-scraper.submit': '创建',
  'pages.web-scraper.update': '更新',
  'pages.web-scraper.cancel': '取消',
  'pages.web-scraper.filterPromptPlaceholder': '如：筛选包含"价格"或"报价"的页面',
  // 结果页
  'pages.web-scraper.results.title.resultDetail': '抓取结果详情',
  // 组件 ResultPreview
  'pages.web-scraper.components.ResultPreview.title.pageDetail': '页面详情',
  // 日志页
  'pages.web-scraper.scrape-logs.title.logDetail': '日志详情',
};
