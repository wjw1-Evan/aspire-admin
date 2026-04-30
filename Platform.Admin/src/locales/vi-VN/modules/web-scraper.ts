/**
 * web-scraper translation module
 * Web scraping related translations
 */

export default {
  'pages.web-scraper.matchNotification': 'Match notification',
  'pages.web-scraper.enableFilter': 'Enable filter',
  'pages.web-scraper.filterPrompt': 'Filter prompt',
  'pages.web-scraper.enableTask': 'Enable task',

  // web-scraper/TaskForm.tsx message calls
  'pages.web-scraper.message.updateFailed': 'Update failed',
  'pages.web-scraper.message.createFailed': 'Create failed',

  // web-scraper/TaskForm.tsx UI
  'pages.web-scraper.editTask': 'Edit task',
  'pages.web-scraper.createTask': 'Create task',
  'pages.web-scraper.taskName': 'Task name',
  'pages.web-scraper.taskNameRequired': 'Please enter task name',
  'pages.web-scraper.taskNamePlaceholder': 'Please enter task name',
  'pages.web-scraper.targetUrl': 'Target URL',
  'pages.web-scraper.targetUrlRequired': 'Please enter target URL',
  'pages.web-scraper.targetUrlInvalid': 'Please enter a valid URL',
  'pages.web-scraper.targetUrlPlaceholder': 'https://example.com',
  'pages.web-scraper.description': 'Description',
  'pages.web-scraper.descriptionPlaceholder': 'Enter task description (optional)',
  'pages.web-scraper.titleSelector': 'Title selector',
  'pages.web-scraper.titleSelectorPlaceholder': 'CSS selector, e.g. h1.title',
  'pages.web-scraper.titleSelectorTooltip': 'CSS selector for extracting page title, leave empty to use <title> tag',
  'pages.web-scraper.contentSelector': 'Content selector',
  'pages.web-scraper.contentSelectorPlaceholder': 'CSS selector, e.g. article.content',
  'pages.web-scraper.contentSelectorTooltip': 'CSS selector for extracting page content, leave empty to use <body> tag',
  'pages.web-scraper.crawlDepth': 'Crawl depth',
  'pages.web-scraper.maxPagesPerLevel': 'Max pages per level',
  'pages.web-scraper.crawlMode': 'Crawl mode',
  'pages.web-scraper.urlFilter': 'URL filter regex',
  'pages.web-scraper.urlFilterPlaceholder': 'e.g. ^https://example\\.com/.*',
  'pages.web-scraper.followExternalLinks': 'Follow external links',
  'pages.web-scraper.deduplicate': 'Deduplicate URLs',
  'pages.web-scraper.scheduleCron': 'Schedule expression',
  'pages.web-scraper.scheduleCronPlaceholder': '0 */10 * * * *',
  'pages.web-scraper.scheduleCronTooltip': '<p>Common examples:</p><ul><li>Every 10 minutes: <code>*/10 * * * *</code></li><li>Hourly: <code>0 * * * *</code></li><li>Daily at midnight: <code>0 0 * * *</code></li><li>Every Monday: <code>0 0 * * 1</code></li></ul>',
  'pages.web-scraper.mode.single': 'Current page only',
  'pages.web-scraper.mode.depth': 'Depth-first',
  'pages.web-scraper.mode.breadth': 'Breadth-first',
  'pages.web-scraper.submit': 'Create',
  'pages.web-scraper.update': 'Update',
  'pages.web-scraper.cancel': 'Cancel',
  'pages.web-scraper.filterPromptPlaceholder': 'e.g. Filter pages containing "price" or "quote"',
  // Results page
  'pages.web-scraper.results.title.resultDetail': 'Scrape result details',
  // Component ResultPreview
  'pages.web-scraper.components.ResultPreview.title.pageDetail': 'Page details',
  // Logs page
  'pages.web-scraper.scrape-logs.title.logDetail': 'Log details',
};
