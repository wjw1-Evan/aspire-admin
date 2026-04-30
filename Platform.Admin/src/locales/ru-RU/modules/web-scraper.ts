/**
 * web-scraper translation module (ru-RU)
 * Русский - Russian
 */

export default {
  'pages.web-scraper.matchNotification': 'Уведомление о совпадении',
  'pages.web-scraper.enableFilter': 'Включить фильтр',
  'pages.web-scraper.filterPrompt': 'Приглашение фильтра',
  'pages.web-scraper.enableTask': 'Включить задачу',

  // web-scraper/TaskForm.tsx message calls
  'pages.web-scraper.message.updateFailed': 'Ошибка обновления',
  'pages.web-scraper.message.createFailed': 'Ошибка создания',

  // web-scraper/TaskForm.tsx UI
  'pages.web-scraper.editTask': 'Редактировать задачу',
  'pages.web-scraper.createTask': 'Создать задачу',
  'pages.web-scraper.taskName': 'Название задачи',
  'pages.web-scraper.taskNameRequired': 'Введите название задачи',
  'pages.web-scraper.taskNamePlaceholder': 'Введите название задачи',
  'pages.web-scraper.targetUrl': 'Целевой URL',
  'pages.web-scraper.targetUrlRequired': 'Введите целевой URL',
  'pages.web-scraper.targetUrlInvalid': 'Введите действительный URL',
  'pages.web-scraper.targetUrlPlaceholder': 'https://example.com',
  'pages.web-scraper.description': 'Описание',
  'pages.web-scraper.descriptionPlaceholder': 'Введите описание задачи (необязательно)',
  'pages.web-scraper.titleSelector': 'Селектор заголовка',
  'pages.web-scraper.titleSelectorPlaceholder': 'Селектор CSS, напр. h1.title',
  'pages.web-scraper.titleSelectorTooltip': 'Селектор CSS для извлечения заголовка страницы, оставьте пустым для использования тега <title>',
  'pages.web-scraper.contentSelector': 'Селектор содержимого',
  'pages.web-scraper.contentSelectorPlaceholder': 'Селектор CSS, напр. article.content',
  'pages.web-scraper.contentSelectorTooltip': 'Селектор CSS для извлечения содержимого страницы, оставьте пустым для использования тега <body>',
  'pages.web-scraper.crawlDepth': 'Глубина обхода',
  'pages.web-scraper.maxPagesPerLevel': 'Макс. страниц на уровень',
  'pages.web-scraper.crawlMode': 'Режим обхода',
  'pages.web-scraper.urlFilter': 'Фильтр regex URL',
  'pages.web-scraper.urlFilterPlaceholder': 'напр. ^https://example\\.com/.*',
  'pages.web-scraper.followExternalLinks': 'Переходить по внешним ссылкам',
  'pages.web-scraper.deduplicate': 'Удалять дубликаты URL',
  'pages.web-scraper.scheduleCron': 'Выражение расписания',
  'pages.web-scraper.scheduleCronPlaceholder': '0 */10 * * * *',
  'pages.web-scraper.scheduleCronTooltip': '<p>Общие примеры:</p><ul><li>Каждые 10 минут: <code>*/10 * * * *</code></li><li>Каждый час: <code>0 * * * *</code></li><li>Каждый день в полночь: <code>0 0 * * *</code></li><li>Каждый понедельник: <code>0 0 * * 1</code></li></ul>',
  'pages.web-scraper.mode.single': 'Только текущая страница',
  'pages.web-scraper.mode.depth': 'Глубина в приоритете',
  'pages.web-scraper.mode.breadth': 'Ширина в приоритете',
  'pages.web-scraper.submit': 'Создать',
  'pages.web-scraper.update': 'Обновить',
  'pages.web-scraper.cancel': 'Отмена',
  'pages.web-scraper.filterPromptPlaceholder': 'напр. Фильтровать страницы, содержащие "цена" или "цитата"',
  // Results page
  'pages.web-scraper.results.title.resultDetail': 'Детали результата обхода',
  // Component ResultPreview
  'pages.web-scraper.components.ResultPreview.title.pageDetail': 'Детали страницы',
  // Logs page
  'pages.web-scraper.scrape-logs.title.logDetail': 'Детали журнала',
};
