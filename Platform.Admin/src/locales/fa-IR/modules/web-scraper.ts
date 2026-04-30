/**
 * web-scraper translation module (fa-IR)
 * فارسی - Persian (Iran)
 * RTL Language
 */

export default {
  'pages.web-scraper.matchNotification': 'اعلان تطابق',
  'pages.web-scraper.enableFilter': 'فعال‌سازی فیلتر',
  'pages.web-scraper.filterPrompt': 'پرامپت فیلتر',
  'pages.web-scraper.enableTask': 'فعال‌سازی وظیفه',

  // web-scraper/TaskForm.tsx message calls
  'pages.web-scraper.message.updateFailed': 'به‌روزرسانی ناموفق بود',
  'pages.web-scraper.message.createFailed': 'ایجاد ناموفق بود',

  // web-scraper/TaskForm.tsx UI
  'pages.web-scraper.editTask': 'ویرایش وظیفه',
  'pages.web-scraper.createTask': 'ایجاد وظیفه',
  'pages.web-scraper.taskName': 'نام وظیفه',
  'pages.web-scraper.taskNameRequired': 'نام وظیفه را وارد کنید',
  'pages.web-scraper.taskNamePlaceholder': 'نام وظیفه را وارد کنید',
  'pages.web-scraper.targetUrl': 'URL هدف',
  'pages.web-scraper.targetUrlRequired': 'URL هدف را وارد کنید',
  'pages.web-scraper.targetUrlInvalid': 'یک URL معتبر وارد کنید',
  'pages.web-scraper.targetUrlPlaceholder': 'https://example.com',
  'pages.web-scraper.description': 'شرح',
  'pages.web-scraper.descriptionPlaceholder': 'شرح وظیفه را وارد کنید (اختیاری)',
  'pages.web-scraper.titleSelector': 'انتخاب‌گر عنوان',
  'pages.web-scraper.titleSelectorPlaceholder': 'انتخاب‌گر CSS، مثال: h1.title',
  'pages.web-scraper.titleSelectorTooltip': 'انتخاب‌گر CSS برای استخراج عنوان صفحه، برای استفاده از تگ <title> خالی بگذارید',
  'pages.web-scraper.contentSelector': 'انتخاب‌گر محتوا',
  'pages.web-scraper.contentSelectorPlaceholder': 'انتخاب‌گر CSS، مثال: article.content',
  'pages.web-scraper.contentSelectorTooltip': 'انتخاب‌گر CSS برای استخراج محتوای صفحه، برای استفاده از تگ <body> خالی بگذارید',
  'pages.web-scraper.crawlDepth': 'عمق خزش',
  'pages.web-scraper.maxPagesPerLevel': 'حداکثر صفحات در هر سطح',
  'pages.web-scraper.crawlMode': 'حالت خزش',
  'pages.web-scraper.urlFilter': 'فیلتر regex URL',
  'pages.web-scraper.urlFilterPlaceholder': 'مثال: ^https://example\\.com/.*',
  'pages.web-scraper.followExternalLinks': 'دنبال کردن پیوندهای خارجی',
  'pages.web-scraper.deduplicate': 'حذف تکراری URLها',
  'pages.web-scraper.scheduleCron': 'عبارت زمان‌بندی',
  'pages.web-scraper.scheduleCronPlaceholder': '0 */10 * * * *',
  'pages.web-scraper.scheduleCronTooltip': '<p>مثال‌های رایج:</p><ul><li>هر 10 دقیقه: <code>*/10 * * * *</code></li><li>هر ساعت: <code>0 * * * *</code></li><li>هر روز نیمه‌شب: <code>0 0 * * *</code></li><li>هر دوشنبه: <code>0 0 * * 1</code></li></ul>',
  'pages.web-scraper.mode.single': 'فقط صفحه فعلی',
  'pages.web-scraper.mode.depth': 'عمق‌اولویت',
  'pages.web-scraper.mode.breadth': 'پهنا‌اولویت',
  'pages.web-scraper.submit': 'ایجاد',
  'pages.web-scraper.update': 'به‌روزرسانی',
  'pages.web-scraper.cancel': 'انصراف',
  'pages.web-scraper.filterPromptPlaceholder': 'مثال: فیلتر صفحات حاوی "قیمت" یا "نقل‌قول"',
  // Results page
  'pages.web-scraper.results.title.resultDetail': 'جزئیات نتیجه خزش',
  // Component ResultPreview
  'pages.web-scraper.components.ResultPreview.title.pageDetail': 'جزئیات صفحه',
  // Logs page
  'pages.web-scraper.scrape-logs.title.logDetail': 'جزئیات لاگ',
};
