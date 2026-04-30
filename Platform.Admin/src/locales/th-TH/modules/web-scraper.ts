/**
 * web-scraper translation module (th-TH)
 * ไทย - Thai
 */

export default {
  'pages.web-scraper.matchNotification': 'การแจ้งเตือนการจับคู่',
  'pages.web-scraper.enableFilter': 'เปิดใช้งานตัวกรอง',
  'pages.web-scraper.filterPrompt': 'พร้อมต์ตัวกรอง',
  'pages.web-scraper.enableTask': 'เปิดใช้งานงาน',

  // web-scraper/TaskForm.tsx message calls
  'pages.web-scraper.message.updateFailed': 'อัปเดตล้มเหลว',
  'pages.web-scraper.message.createFailed': 'สร้างล้มเหลว',

  // web-scraper/TaskForm.tsx UI
  'pages.web-scraper.editTask': 'แก้ไขงาน',
  'pages.web-scraper.createTask': 'สร้างงาน',
  'pages.web-scraper.taskName': 'ชื่องาน',
  'pages.web-scraper.taskNameRequired': 'กรุณากรอกชื่องาน',
  'pages.web-scraper.taskNamePlaceholder': 'กรุณากรอกชื่องาน',
  'pages.web-scraper.targetUrl': 'URL เป้าหมาย',
  'pages.web-scraper.targetUrlRequired': 'กรุณากรอก URL เป้าหมาย',
  'pages.web-scraper.targetUrlInvalid': 'กรุณากรอก URL ที่ถูกต้อง',
  'pages.web-scraper.targetUrlPlaceholder': 'https://example.com',
  'pages.web-scraper.description': 'คำอธิบาย',
  'pages.web-scraper.descriptionPlaceholder': 'กรุณากรอกคำอธิบายงาน (ไม่บังคับ)',
  'pages.web-scraper.titleSelector': 'ตัวเลือกชื่อเรื่อง',
  'pages.web-scraper.titleSelectorPlaceholder': 'ตัวเลือก CSS, ตัวอย่าง: h1.title',
  'pages.web-scraper.titleSelectorTooltip': 'ตัวเลือก CSS สำหรับดึงชื่อเรื่องหน้าเว็บ, ปล่อยว่างเพื่อใช้แท็ก <title>',
  'pages.web-scraper.contentSelector': 'ตัวเลือกเนื้อหา',
  'pages.web-scraper.contentSelectorPlaceholder': 'ตัวเลือก CSS, ตัวอย่าง: article.content',
  'pages.web-scraper.contentSelectorTooltip': 'ตัวเลือก CSS สำหรับดึงเนื้อหาหน้าเว็บ, ปล่อยว่างเพื่อใช้แท็ก <body>',
  'pages.web-scraper.crawlDepth': 'ความลึกในการเก็บข้อมูล',
  'pages.web-scraper.maxPagesPerLevel': 'จำนวนหน้าสูงสุดต่อระดับ',
  'pages.web-scraper.crawlMode': 'โหมดการเก็บข้อมูล',
  'pages.web-scraper.urlFilter': 'ตัวกรอง regex URL',
  'pages.web-scraper.urlFilterPlaceholder': 'ตัวอย่าง: ^https://example\\.com/.*',
  'pages.web-scraper.followExternalLinks': 'ติดตามลิงก์ภายนอก',
  'pages.web-scraper.deduplicate': 'ลบ URL ที่ซ้ำกัน',
  'pages.web-scraper.scheduleCron': 'นิพจน์กำหนดเวลา',
  'pages.web-scraper.scheduleCronPlaceholder': '0 */10 * * * *',
  'pages.web-scraper.scheduleCronTooltip': '<p>ตัวอย่างทั่วไป:</p><ul><li>ทุก 10 นาที: <code>*/10 * * * *</code></li><li>ทุกชั่วโมง: <code>0 * * * *</code></li><li>ทุกวันเที่ยงคืน: <code>0 0 * * *</code></li><li>ทุกวันจันทร์: <code>0 0 * * 1</code></li></ul>',
  'pages.web-scraper.mode.single': 'เฉพาะหน้าปัจจุบัน',
  'pages.web-scraper.mode.depth': 'ความลึกก่อน',
  'pages.web-scraper.mode.breadth': 'ความกว้างก่อน',
  'pages.web-scraper.submit': 'สร้าง',
  'pages.web-scraper.update': 'อัปเดต',
  'pages.web-scraper.cancel': 'ยกเลิก',
  'pages.web-scraper.filterPromptPlaceholder': 'ตัวอย่าง: กรองหน้าที่มี "ราคา" หรือ "คำพูด"',
  // Results page
  'pages.web-scraper.results.title.resultDetail': 'รายละเอียดผลการเก็บข้อมูล',
  // Component ResultPreview
  'pages.web-scraper.components.ResultPreview.title.pageDetail': 'รายละเอียดหน้าเว็บ',
  // Logs page
  'pages.web-scraper.scrape-logs.title.logDetail': 'รายละเอียดบันทึก',
};
