/**
 * web-scraper translation module (ar-EG)
 * العربية - Arabic (Egypt)
 * RTL Language
 */

export default {
  'pages.web-scraper.matchNotification': 'إشعار المطابقة',
  'pages.web-scraper.enableFilter': 'تفعيل المرشح',
  'pages.web-scraper.filterPrompt': 'موجه المرشح',
  'pages.web-scraper.enableTask': 'تفعيل المهمة',

  // web-scraper/TaskForm.tsx message calls
  'pages.web-scraper.message.updateFailed': 'فشل التحديث',
  'pages.web-scraper.message.createFailed': 'فشل الإنشاء',

  // web-scraper/TaskForm.tsx UI
  'pages.web-scraper.editTask': 'تعديل المهمة',
  'pages.web-scraper.createTask': 'إنشاء مهمة',
  'pages.web-scraper.taskName': 'اسم المهمة',
  'pages.web-scraper.taskNameRequired': 'أدخل اسم المهمة',
  'pages.web-scraper.taskNamePlaceholder': 'أدخل اسم المهمة',
  'pages.web-scraper.targetUrl': 'الرابط المستهدف',
  'pages.web-scraper.targetUrlRequired': 'أدخل الرابط المستهدف',
  'pages.web-scraper.targetUrlInvalid': 'أدخل رابطاً صحيحاً',
  'pages.web-scraper.targetUrlPlaceholder': 'https://example.com',
  'pages.web-scraper.description': 'الوصف',
  'pages.web-scraper.descriptionPlaceholder': 'أدخل وصف المهمة (اختياري)',
  'pages.web-scraper.titleSelector': 'محدد العنوان',
  'pages.web-scraper.titleSelectorPlaceholder': 'محدد CSS، مثال: h1.title',
  'pages.web-scraper.titleSelectorTooltip': 'محدد CSS لاستخراج عنوان الصفحة، اتركه فارغاً لاستخدام وسم <title>',
  'pages.web-scraper.contentSelector': 'محدد المحتوى',
  'pages.web-scraper.contentSelectorPlaceholder': 'محدد CSS، مثال: article.content',
  'pages.web-scraper.contentSelectorTooltip': 'محدد CSS لاستخراج محتوى الصفحة، اتركه فارغاً لاستخدام وسم <body>',
  'pages.web-scraper.crawlDepth': 'عمق الزحف',
  'pages.web-scraper.maxPagesPerLevel': 'أقصى صفحات لكل مستوى',
  'pages.web-scraper.crawlMode': 'وضع الزحف',
  'pages.web-scraper.urlFilter': 'فلتر regex الرابط',
  'pages.web-scraper.urlFilterPlaceholder': 'مثال: ^https://example\\.com/.*',
  'pages.web-scraper.followExternalLinks': 'متابعة الروابط الخارجية',
  'pages.web-scraper.deduplicate': 'إزالة الروابط المكررة',
  'pages.web-scraper.scheduleCron': 'تعبير الجدولة',
  'pages.web-scraper.scheduleCronPlaceholder': '0 */10 * * * *',
  'pages.web-scraper.scheduleCronTooltip': '<p>أمثلة شائعة:</p><ul><li>كل 10 دقائق: <code>*/10 * * * *</code></li><li>كل ساعة: <code>0 * * * *</code></li><li>يومياً عند منتصف الليل: <code>0 0 * * *</code></li><li>كل يوم إثنين: <code>0 0 * * 1</code></li></ul>',
  'pages.web-scraper.mode.single': 'الصفحة الحالية فقط',
  'pages.web-scraper.mode.depth': 'العمق أولاً',
  'pages.web-scraper.mode.breadth': 'الاتساع أولاً',
  'pages.web-scraper.submit': 'إنشاء',
  'pages.web-scraper.update': 'تحديث',
  'pages.web-scraper.cancel': 'إلغاء',
  'pages.web-scraper.filterPromptPlaceholder': 'مثال: تصفية الصفحات التي تحتوي على "سعر" أو "عرض"',
  // Results page
  'pages.web-scraper.results.title.resultDetail': 'تفاصيل نتيجة الزحف',
  // Component ResultPreview
  'pages.web-scraper.components.ResultPreview.title.pageDetail': 'تفاصيل الصفحة',
  // Logs page
  'pages.web-scraper.scrape-logs.title.logDetail': 'تفاصيل السجل',
};
